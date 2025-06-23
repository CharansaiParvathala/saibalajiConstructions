import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../db/config';
import { upload } from '../services/file-upload';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Get progress updates for a project
router.get('/project/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const [rows] = await pool.query(`
      SELECT p.*, 
             GROUP_CONCAT(pi.id) as image_ids,
             v.model as vehicle_model,
             v.type as vehicle_type,
             d.name as driver_name,
             d.mobile_number as driver_mobile,
             d.license_number as driver_license,
             d.license_type as driver_license_type
      FROM progress p
      LEFT JOIN progress_images pi ON p.id = pi.progress_id
      LEFT JOIN vehicles v ON p.vehicle_id = v.id
      LEFT JOIN drivers d ON p.driver_id = d.id
      WHERE p.project_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [projectId]);
    
    // Convert BLOB data to base64 for images
    const formattedRows = (rows as any[]).map(row => ({
      ...row,
      image_proof: row.image_proof ? row.image_proof.toString('base64') : null,
      image_ids: row.image_ids ? row.image_ids.split(',').map((id: string) => parseInt(id.trim())) : [],
      start_meter_image_id: row.start_meter_image_id,
      end_meter_image_id: row.end_meter_image_id,
      vehicle: row.vehicle_id ? {
        id: row.vehicle_id,
        model: row.vehicle_model,
        type: row.vehicle_type
      } : null,
      driver: row.is_external_driver ? null : (row.driver_id ? {
        id: row.driver_id,
        name: row.driver_name,
        mobile_number: row.driver_mobile,
        license_number: row.driver_license,
        license_type: row.driver_license_type
      } : null),
      driver_external: row.is_external_driver ? {
        name: row.external_driver_name,
        license_type: row.external_driver_license_type
      } : null
    }));
    console.log('API /progress/project/:projectId response:', JSON.stringify(formattedRows, null, 2));
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching progress updates:', error);
    res.status(500).json({ error: 'Failed to fetch progress updates' });
  }
});

// Add progress update with image
router.post('/', authenticateToken, upload.fields([
  { name: 'images' },
  { name: 'start_meter_image', maxCount: 1 },
  { name: 'end_meter_image', maxCount: 1 }
]), async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { projectId, completedWork, description, vehicle_id, driver_id, is_external_driver, external_driver_name, external_driver_license_type, external_driver_mobile_number } = req.body;
    const userId = (req as any).user.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log('Received progress request:', {
      projectId,
      completedWork,
      description,
      userId,
      files: files.images?.length || 0
    });

    // Get current project state
    const [projectRows] = await connection.query(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    ) as [any[], any];

    if (!projectRows || projectRows.length === 0) {
      throw new Error('Project not found');
    }

    const project = projectRows[0];
    const completedWorkNum = Number(completedWork);
    const totalWork = Number(project.total_work);
    const currentCompleted = Number(project.completed_work);
    const newCompletedWork = currentCompleted + completedWorkNum;

    // Calculate completion percentage
    const completionPercentage = totalWork > 0 ? (newCompletedWork / totalWork) * 100 : 0;

    console.log('Progress calculation:', {
      completedWorkNum,
      totalWork,
      currentCompleted,
      newCompletedWork,
      completionPercentage
    });

    // Validate total work
    if (newCompletedWork > totalWork) {
      throw new Error('Total completed work cannot exceed total work');
    }

    // Prepare image data for database storage
    let imageData = null;
    const fileDataArray: { data: Buffer; filename: string }[] = [];
    
    if (files.images && files.images.length > 0) {
      // Read all files into memory first
      for (const file of files.images) {
        const fileData = fs.readFileSync(file.path);
        fileDataArray.push({ data: fileData, filename: file.filename });
      
        // Clean up the temporary file immediately after reading
        fs.unlinkSync(file.path);
      }
      
      // Use first image for progress.image_proof
      if (fileDataArray.length > 0) {
        imageData = fileDataArray[0].data;
      }
    }

    // Handle meter images (for jcb) - read into memory first
    let startMeterImageId = null;
    let endMeterImageId = null;
    let startMeterImageData = null;
    let startMeterImageFilename = null;
    let endMeterImageData = null;
    let endMeterImageFilename = null;

    if (files.start_meter_image && files.start_meter_image.length > 0) {
      const file = files.start_meter_image[0];
      startMeterImageData = fs.readFileSync(file.path);
      startMeterImageFilename = file.filename;
      fs.unlinkSync(file.path);
    }
    if (files.end_meter_image && files.end_meter_image.length > 0) {
      const file = files.end_meter_image[0];
      endMeterImageData = fs.readFileSync(file.path);
      endMeterImageFilename = file.filename;
      fs.unlinkSync(file.path);
    }

    // Determine status based on completion percentage
    const progressStatus = completionPercentage >= 100 ? 'completed' : 'pending';
    const projectStatus = completionPercentage >= 100 ? 'completed' : 'active';

    // Insert progress update first (without meter image IDs)
    const [result] = await connection.query(
      'INSERT INTO progress (project_id, user_id, completed_work, description, completion_percentage, image_proof, status, vehicle_id, driver_id, is_external_driver, external_driver_name, external_driver_license_type, external_driver_mobile_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [projectId, userId, completedWorkNum, description || 'Progress update', completionPercentage, imageData, progressStatus, vehicle_id || null, driver_id || null, is_external_driver === 'true' ? 1 : 0, external_driver_name || null, external_driver_license_type || null, external_driver_mobile_number || null]
    );
    const progressId = (result as any).insertId;

    // Insert meter images with progressId
    if (startMeterImageData) {
      const [imgResult] = await connection.query(
        'INSERT INTO progress_images (progress_id, image_url, image_data) VALUES (?, ?, ?)',
        [progressId, `/progress-images/${progressId}/${startMeterImageFilename}`, startMeterImageData]
      );
      startMeterImageId = (imgResult as any).insertId;
    }
    if (endMeterImageData) {
      const [imgResult] = await connection.query(
        'INSERT INTO progress_images (progress_id, image_url, image_data) VALUES (?, ?, ?)',
        [progressId, `/progress-images/${progressId}/${endMeterImageFilename}`, endMeterImageData]
      );
      endMeterImageId = (imgResult as any).insertId;
    }

    // Update progress record with meter image IDs
    await connection.query(
      'UPDATE progress SET start_meter_image_id = ?, end_meter_image_id = ? WHERE id = ?',
      [startMeterImageId, endMeterImageId, progressId]
    );

    // Insert all images as BLOB data in progress_images table
    if (fileDataArray.length > 0) {
      for (const fileData of fileDataArray) {
        await connection.query(
          'INSERT INTO progress_images (progress_id, image_url, image_data) VALUES (?, ?, ?)',
          [progressId, `/progress-images/${progressId}/${fileData.filename}`, fileData.data]
        );
      }
    }

    // Update project's completed work and status
    await connection.query(
      'UPDATE projects SET completed_work = ?, status = ? WHERE id = ?',
      [newCompletedWork, projectStatus, projectId]
    );

    // Commit transaction
    await connection.commit();

    // Get the created progress update with images
    const [newProgress] = await connection.query(`
      SELECT p.*, 
             GROUP_CONCAT(pi.id) as image_ids
      FROM progress p
      LEFT JOIN progress_images pi ON p.id = pi.progress_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [progressId]) as [any[], any];

    // Convert BLOB data to base64 for response
    const formattedProgress = {
      ...newProgress[0],
      image_proof: newProgress[0].image_proof ? newProgress[0].image_proof.toString('base64') : null,
      image_ids: newProgress[0].image_ids ? newProgress[0].image_ids.split(',').map((id: string) => parseInt(id.trim())) : []
    };

    console.log('Created progress with images:', {
      ...formattedProgress,
      image_ids: formattedProgress.image_ids.length,
      image_proof: formattedProgress.image_proof ? 'Present' : 'None',
      description: description || 'Progress update',
      completion_percentage: completionPercentage,
      status: progressStatus,
      image_count: files.images?.length || 0
    });

    res.status(201).json(formattedProgress);
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    console.error('Error adding progress update:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add progress update' });
  } finally {
    connection.release();
  }
});

// Get progress image by ID
router.get('/image/:imageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    
    const [rows] = await pool.query(
      'SELECT image_data, image_url FROM progress_images WHERE id = ?',
      [imageId]
    ) as [any[], any];

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = rows[0];
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg'); // You might want to detect the actual type
    res.setHeader('Content-Disposition', `inline; filename="${image.image_url.split('/').pop()}"`);
    
    // Send the BLOB data
    res.send(image.image_data);
  } catch (error) {
    console.error('Error fetching progress image:', error);
    res.status(500).json({ error: 'Failed to fetch progress image' });
  }
});

// Get progress statistics for admin dashboard
router.get('/statistics', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin or owner
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Admin/Owner only.' });
    }

    // Get comprehensive monthly progress statistics
    const [monthlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(p.created_at, '%Y-%m') as month,
        DATE_FORMAT(p.created_at, '%M %Y') as month_name,
        SUM(p.completed_work) as total_completed_work,
        COUNT(p.id) as total_progress_updates,
        AVG(p.completion_percentage) as avg_completion_percentage,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_updates,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_updates,
        SUM(CASE WHEN p.status = 'completed' THEN p.completed_work ELSE 0 END) as completed_work_amount,
        SUM(CASE WHEN p.status = 'pending' THEN p.completed_work ELSE 0 END) as pending_work_amount,
        AVG(p.completed_work) as avg_work_per_update,
        COUNT(DISTINCT p.project_id) as active_projects_count,
        COUNT(DISTINCT p.user_id) as active_users_count
      FROM progress p
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(p.created_at, '%Y-%m'), DATE_FORMAT(p.created_at, '%M %Y')
      ORDER BY month ASC
    `) as [any[], any];

    // Get overall project statistics with progress correlation
    const [projectStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_projects,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_projects,
        SUM(total_work) as total_work_planned,
        SUM(completed_work) as total_work_completed,
        AVG(CASE WHEN total_work > 0 THEN (completed_work / total_work) * 100 ELSE 0 END) as overall_completion_percentage,
        AVG(total_work) as avg_project_size,
        SUM(CASE WHEN status = 'completed' THEN total_work ELSE 0 END) as completed_projects_work,
        SUM(CASE WHEN status = 'active' THEN total_work ELSE 0 END) as active_projects_work
      FROM projects
    `) as [any[], any];

    // Get progress status distribution
    const [statusDistribution] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(completed_work) as total_work,
        AVG(completed_work) as avg_work,
        AVG(completion_percentage) as avg_completion
      FROM progress
      GROUP BY status
    `) as [any[], any];

    // Get recent progress activity (last 30 days) with daily breakdown
    const [recentActivity] = await pool.query(`
      SELECT 
        DATE(p.created_at) as date,
        COUNT(*) as progress_count,
        SUM(p.completed_work) as daily_completed_work,
        AVG(p.completed_work) as avg_work_per_update,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
        AVG(p.completion_percentage) as avg_completion_percentage,
        COUNT(DISTINCT p.project_id) as projects_updated,
        COUNT(DISTINCT p.user_id) as users_active
      FROM progress p
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(p.created_at)
      ORDER BY date DESC
    `) as [any[], any];

    // Get progress efficiency metrics
    const [efficiencyMetrics] = await pool.query(`
      SELECT 
        COUNT(*) as total_progress_updates,
        SUM(completed_work) as total_work_completed,
        AVG(completed_work) as avg_work_per_update,
        AVG(completion_percentage) as avg_completion_percentage,
        COUNT(CASE WHEN completion_percentage >= 100 THEN 1 END) as fully_completed_updates,
        COUNT(CASE WHEN completion_percentage < 50 THEN 1 END) as low_completion_updates,
        COUNT(CASE WHEN completion_percentage BETWEEN 50 AND 99 THEN 1 END) as medium_completion_updates,
        SUM(CASE WHEN status = 'completed' THEN completed_work ELSE 0 END) as completed_work_total,
        SUM(CASE WHEN status = 'pending' THEN completed_work ELSE 0 END) as pending_work_total
      FROM progress
    `) as [any[], any];

    // Get project progress correlation
    const [projectProgressCorrelation] = await pool.query(`
      SELECT 
        pr.id as project_id,
        pr.title as project_title,
        pr.total_work as project_total_work,
        pr.completed_work as project_completed_work,
        pr.status as project_status,
        COUNT(p.id) as progress_updates_count,
        SUM(p.completed_work) as progress_total_work,
        AVG(p.completion_percentage) as avg_progress_completion,
        MAX(p.created_at) as last_progress_update,
        MIN(p.created_at) as first_progress_update
      FROM projects pr
      LEFT JOIN progress p ON pr.id = p.project_id
      GROUP BY pr.id, pr.title, pr.total_work, pr.completed_work, pr.status
      ORDER BY progress_updates_count DESC
      LIMIT 10
    `) as [any[], any];

    // Get user activity analysis
    const [userActivity] = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        COUNT(p.id) as progress_updates_count,
        SUM(p.completed_work) as total_work_completed,
        AVG(p.completed_work) as avg_work_per_update,
        AVG(p.completion_percentage) as avg_completion_percentage,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_updates,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_updates,
        MAX(p.created_at) as last_activity,
        COUNT(DISTINCT p.project_id) as projects_worked_on
      FROM users u
      LEFT JOIN progress p ON u.id = p.user_id
      WHERE u.role IN ('leader', 'member')
      GROUP BY u.id, u.name, u.role
      ORDER BY progress_updates_count DESC
      LIMIT 10
    `) as [any[], any];

    // Get comprehensive payment analytics
    const [paymentAnalytics] = await pool.query(`
      SELECT 
        COUNT(*) as total_payment_requests,
        SUM(total_amount) as total_amount_requested,
        AVG(total_amount) as avg_payment_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_requests,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_requests,
        SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'rejected' THEN total_amount ELSE 0 END) as rejected_amount,
        SUM(CASE WHEN status = 'scheduled' THEN total_amount ELSE 0 END) as scheduled_amount,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount
      FROM payment_requests
    `) as [any[], any];

    // Get monthly payment trends
    const [monthlyPaymentTrends] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        DATE_FORMAT(created_at, '%M %Y') as month_name,
        COUNT(*) as payment_requests_count,
        SUM(total_amount) as total_amount,
        AVG(total_amount) as avg_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'rejected' THEN total_amount ELSE 0 END) as rejected_amount,
        SUM(CASE WHEN status = 'scheduled' THEN total_amount ELSE 0 END) as scheduled_amount,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount
      FROM payment_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%M %Y')
      ORDER BY month ASC
    `) as [any[], any];

    // Get payment requests by project
    const [paymentByProject] = await pool.query(`
      SELECT 
        pr.id as project_id,
        pr.title as project_title,
        COUNT(prq.id) as payment_requests_count,
        SUM(prq.total_amount) as total_amount_requested,
        AVG(prq.total_amount) as avg_payment_amount,
        COUNT(CASE WHEN prq.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN prq.status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN prq.status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN prq.status = 'scheduled' THEN 1 END) as scheduled_requests,
        COUNT(CASE WHEN prq.status = 'paid' THEN 1 END) as paid_requests,
        SUM(CASE WHEN prq.status = 'paid' THEN prq.total_amount ELSE 0 END) as total_paid_amount
      FROM projects pr
      LEFT JOIN payment_requests prq ON pr.id = prq.project_id
      GROUP BY pr.id, pr.title
      HAVING payment_requests_count > 0
      ORDER BY total_amount_requested DESC
      LIMIT 10
    `) as [any[], any];

    // Get payment requests by user
    const [paymentByUser] = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        COUNT(prq.id) as payment_requests_count,
        SUM(prq.total_amount) as total_amount_requested,
        AVG(prq.total_amount) as avg_payment_amount,
        COUNT(CASE WHEN prq.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN prq.status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN prq.status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN prq.status = 'scheduled' THEN 1 END) as scheduled_requests,
        COUNT(CASE WHEN prq.status = 'paid' THEN 1 END) as paid_requests,
        SUM(CASE WHEN prq.status = 'paid' THEN prq.total_amount ELSE 0 END) as total_paid_amount,
        MAX(prq.created_at) as last_payment_request
      FROM users u
      LEFT JOIN payment_requests prq ON u.id = prq.user_id
      WHERE u.role IN ('leader', 'member')
      GROUP BY u.id, u.name, u.role
      HAVING payment_requests_count > 0
      ORDER BY total_amount_requested DESC
      LIMIT 10
    `) as [any[], any];

    // Get expense type analysis
    const [expenseTypeAnalysis] = await pool.query(`
      SELECT 
        expense_type,
        COUNT(*) as expense_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM payment_request_expenses
      GROUP BY expense_type
      ORDER BY total_amount DESC
    `) as [any[], any];

    // Get recent payment activity (last 30 days)
    const [recentPaymentActivity] = await pool.query(`
      SELECT 
        DATE(prq.created_at) as date,
        COUNT(prq.id) as payment_requests_count,
        SUM(prq.total_amount) as daily_total_amount,
        AVG(prq.total_amount) as avg_daily_amount,
        COUNT(CASE WHEN prq.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN prq.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN prq.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN prq.status = 'scheduled' THEN 1 END) as scheduled_count,
        COUNT(CASE WHEN prq.status = 'paid' THEN 1 END) as paid_count,
        COUNT(DISTINCT prq.project_id) as projects_with_payments,
        COUNT(DISTINCT prq.user_id) as users_with_payments
      FROM payment_requests prq
      WHERE prq.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(prq.created_at)
      ORDER BY date DESC
    `) as [any[], any];

    // Format the data for charts
    const formattedMonthlyStats = (monthlyStats as any[]).map(stat => ({
      name: stat.month_name,
      month: stat.month,
      total_completed_work: Math.round(stat.total_completed_work || 0),
      total_progress_updates: stat.total_progress_updates,
      avg_completion_percentage: Math.round(stat.avg_completion_percentage || 0),
      completed_updates: stat.completed_updates,
      pending_updates: stat.pending_updates,
      completed_work_amount: Math.round(stat.completed_work_amount || 0),
      pending_work_amount: Math.round(stat.pending_work_amount || 0),
      avg_work_per_update: Math.round(stat.avg_work_per_update || 0),
      active_projects_count: stat.active_projects_count,
      active_users_count: stat.active_users_count
    }));

    const formattedStatusDistribution = (statusDistribution as any[]).map(stat => ({
      name: stat.status.charAt(0).toUpperCase() + stat.status.slice(1),
      value: stat.count,
      total_work: Math.round(stat.total_work || 0),
      avg_work: Math.round(stat.avg_work || 0),
      avg_completion: Math.round(stat.avg_completion || 0)
    }));

    const formattedRecentActivity = (recentActivity as any[]).map(activity => ({
      date: activity.date,
      progress_count: activity.progress_count,
      daily_completed_work: Math.round(activity.daily_completed_work || 0),
      avg_work_per_update: Math.round(activity.avg_work_per_update || 0),
      completed_count: activity.completed_count,
      pending_count: activity.pending_count,
      avg_completion_percentage: Math.round(activity.avg_completion_percentage || 0),
      projects_updated: activity.projects_updated,
      users_active: activity.users_active
    }));

    const formattedProjectProgressCorrelation = (projectProgressCorrelation as any[]).map(project => ({
      project_id: project.project_id,
      project_title: project.project_title,
      project_total_work: Math.round(project.project_total_work || 0),
      project_completed_work: Math.round(project.project_completed_work || 0),
      project_status: project.project_status,
      progress_updates_count: project.progress_updates_count,
      progress_total_work: Math.round(project.progress_total_work || 0),
      avg_progress_completion: Math.round(project.avg_progress_completion || 0),
      last_progress_update: project.last_progress_update,
      first_progress_update: project.first_progress_update
    }));

    const formattedUserActivity = (userActivity as any[]).map(user => ({
      user_id: user.user_id,
      user_name: user.user_name,
      user_role: user.user_role,
      progress_updates_count: user.progress_updates_count,
      total_work_completed: Math.round(user.total_work_completed || 0),
      avg_work_per_update: Math.round(user.avg_work_per_update || 0),
      avg_completion_percentage: Math.round(user.avg_completion_percentage || 0),
      completed_updates: user.completed_updates,
      pending_updates: user.pending_updates,
      last_activity: user.last_activity,
      projects_worked_on: user.projects_worked_on
    }));

    // Format payment analytics data
    const formattedMonthlyPaymentTrends = (monthlyPaymentTrends as any[]).map(trend => ({
      name: trend.month_name,
      month: trend.month,
      payment_requests_count: trend.payment_requests_count,
      total_amount: Math.round(trend.total_amount || 0),
      avg_amount: Math.round(trend.avg_amount || 0),
      pending_count: trend.pending_count,
      approved_count: trend.approved_count,
      rejected_count: trend.rejected_count,
      scheduled_count: trend.scheduled_count,
      paid_count: trend.paid_count,
      pending_amount: Math.round(trend.pending_amount || 0),
      approved_amount: Math.round(trend.approved_amount || 0),
      rejected_amount: Math.round(trend.rejected_amount || 0),
      scheduled_amount: Math.round(trend.scheduled_amount || 0),
      paid_amount: Math.round(trend.paid_amount || 0)
    }));

    const formattedPaymentByProject = (paymentByProject as any[]).map(project => ({
      project_id: project.project_id,
      project_title: project.project_title,
      payment_requests_count: project.payment_requests_count,
      total_amount_requested: Math.round(project.total_amount_requested || 0),
      avg_payment_amount: Math.round(project.avg_payment_amount || 0),
      pending_requests: project.pending_requests,
      approved_requests: project.approved_requests,
      rejected_requests: project.rejected_requests,
      scheduled_requests: project.scheduled_requests,
      paid_requests: project.paid_requests,
      total_paid_amount: Math.round(project.total_paid_amount || 0)
    }));

    const formattedPaymentByUser = (paymentByUser as any[]).map(user => ({
      user_id: user.user_id,
      user_name: user.user_name,
      user_role: user.user_role,
      payment_requests_count: user.payment_requests_count,
      total_amount_requested: Math.round(user.total_amount_requested || 0),
      avg_payment_amount: Math.round(user.avg_payment_amount || 0),
      pending_requests: user.pending_requests,
      approved_requests: user.approved_requests,
      rejected_requests: user.rejected_requests,
      scheduled_requests: user.scheduled_requests,
      paid_requests: user.paid_requests,
      total_paid_amount: Math.round(user.total_paid_amount || 0),
      last_payment_request: user.last_payment_request
    }));

    const formattedExpenseTypeAnalysis = (expenseTypeAnalysis as any[]).map(expense => ({
      expense_type: expense.expense_type.charAt(0).toUpperCase() + expense.expense_type.slice(1),
      expense_count: expense.expense_count,
      total_amount: Math.round(expense.total_amount || 0),
      avg_amount: Math.round(expense.avg_amount || 0),
      min_amount: Math.round(expense.min_amount || 0),
      max_amount: Math.round(expense.max_amount || 0)
    }));

    const formattedRecentPaymentActivity = (recentPaymentActivity as any[]).map(activity => ({
      date: activity.date,
      payment_requests_count: activity.payment_requests_count,
      daily_total_amount: Math.round(activity.daily_total_amount || 0),
      avg_daily_amount: Math.round(activity.avg_daily_amount || 0),
      pending_count: activity.pending_count,
      approved_count: activity.approved_count,
      rejected_count: activity.rejected_count,
      scheduled_count: activity.scheduled_count,
      paid_count: activity.paid_count,
      projects_with_payments: activity.projects_with_payments,
      users_with_payments: activity.users_with_payments
    }));

    res.json({
      monthlyStats: formattedMonthlyStats,
      projectStats: projectStats[0],
      statusDistribution: formattedStatusDistribution,
      recentActivity: formattedRecentActivity,
      efficiencyMetrics: efficiencyMetrics[0],
      projectProgressCorrelation: formattedProjectProgressCorrelation,
      userActivity: formattedUserActivity,
      paymentAnalytics: paymentAnalytics[0],
      monthlyPaymentTrends: formattedMonthlyPaymentTrends,
      paymentByProject: formattedPaymentByProject,
      paymentByUser: formattedPaymentByUser,
      expenseTypeAnalysis: formattedExpenseTypeAnalysis,
      recentPaymentActivity: formattedRecentPaymentActivity
    });
  } catch (error) {
    console.error('Error fetching progress statistics:', error);
    res.status(500).json({ error: 'Failed to fetch progress statistics' });
  }
});

export default router; 
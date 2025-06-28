import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../db/config';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

const router = express.Router();

// Get all projects
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, notCompleted } = req.query;
    let query = `
      SELECT p.*, u.name as leader_name
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
    `;
    const conditions = [];
    const params = [];
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (notCompleted === 'true') {
      conditions.push('p.completed_work < p.total_work');
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(query, params) as [RowDataPacket[], any];
    console.log('Fetched projects:', rows);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get all project images with timestamps for export
router.get('/:id/images-for-export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Images export request for project ID:', id);
    
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      console.log('Access denied - user role:', req.user?.role);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const connection = await pool.getConnection();
    console.log('Database connection acquired');

    try {
      // Get all progress images for this project
      console.log('Fetching progress images for project:', id);
      const [progressImages] = await connection.execute(`
        SELECT 
          pi.id,
          pi.progress_id,
          pi.image_data,
          pi.created_at
        FROM progress_images pi
        INNER JOIN progress pr ON pi.progress_id = pr.id
        WHERE pr.project_id = ?
        ORDER BY pi.created_at ASC
      `, [id]) as [RowDataPacket[], any];
      console.log('Progress images found:', progressImages.length);

      // Convert LONGBLOB to base64 for progress images
      const processedProgressImages = (progressImages as RowDataPacket[]).map((img: any) => {
        const base64Data = img.image_data ? Buffer.from(img.image_data).toString('base64') : null;
        console.log(`Progress Image ID ${img.id}: Base64 data length: ${base64Data?.length ?? 0}`);
        return {
          id: img.id,
          progress_id: img.progress_id,
          image_data: base64Data,
          created_at: img.created_at
        };
      });

      // Get all payment images for this project
      console.log('Fetching payment images for project:', id);
      const [paymentImages] = await connection.execute(`
        SELECT 
          pri.id,
          pri.payment_request_id,
          pri.expense_id,
          pri.image_data,
          pri.created_at
        FROM payment_request_images pri
        INNER JOIN payment_requests pr ON pri.payment_request_id = pr.id
        WHERE pr.project_id = ?
        ORDER BY pri.created_at ASC
      `, [id]) as [RowDataPacket[], any];
      console.log('Payment images found:', paymentImages.length);

      // Convert LONGBLOB to base64 for payment images
      const processedPaymentImages = (paymentImages as RowDataPacket[]).map((img: any) => {
        const base64Data = img.image_data ? Buffer.from(img.image_data).toString('base64') : null;
        console.log(`Payment Image ID ${img.id}: Base64 data length: ${base64Data?.length ?? 0}`);
        return {
          id: img.id,
          payment_request_id: img.payment_request_id,
          expense_id: img.expense_id,
          image_data: base64Data,
          created_at: img.created_at
        };
      });

      connection.release();
      console.log('Database connection released');

      const response = {
        progressImages: processedProgressImages,
        paymentImages: processedPaymentImages
      };
      console.log('Sending response with total images:', processedProgressImages.length + processedPaymentImages.length);
      res.json(response);

  } catch (error: any) {
      connection.release();
      console.error('Database error in images export:', error);
      throw error;
    }

  } catch (error: any) {
    console.error('Error fetching project images for export:', error);
    res.status(500).json({ error: 'Failed to fetch project images for export' });
  }
});

// Get comprehensive project data for export
router.get('/export-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const connection = await pool.getConnection();

    try {
      // Get all users with their projects, progress, and payments
      const [users] = await connection.execute(`
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.mobile_number as user_mobile,
          u.role as user_role,
          u.created_at as user_created_at
        FROM users u
        WHERE u.role IN ('leader', 'checker')
        ORDER BY u.name, u.id
      `) as [RowDataPacket[], any];

      const exportData: any[] = [];

      for (const user of users) {
        // Get projects for this user
        const [projects] = await connection.execute(`
          SELECT 
            p.id as project_id,
            p.title as project_title,
            p.description as project_description,
            p.status as project_status,
            p.start_date as project_start_date,
            p.end_date as project_end_date,
            p.total_work as project_total_work,
            p.completed_work as project_completed_work,
            p.created_at as project_created_at,
            p.updated_at as project_updated_at
          FROM projects p
          WHERE p.leader_id = ?
          ORDER BY p.created_at DESC
        `, [user.user_id]) as [RowDataPacket[], any];

        const userData: any = {
          user: {
            id: user.user_id,
            name: user.user_name,
            email: user.user_email,
            mobile: user.user_mobile,
            role: user.user_role,
            created_at: user.user_created_at
          },
          projects: []
        };

        for (const project of projects) {
          // Get progress for this project
          const [progress] = await connection.execute(`
            SELECT 
              pr.id as progress_id,
              pr.status as progress_status,
              pr.completion_percentage as progress_completion_percentage,
              pr.completed_work as progress_completed_work,
              pr.created_at as progress_created_at,
              pr.updated_at as progress_updated_at
            FROM progress pr
            WHERE pr.project_id = ?
            ORDER BY pr.created_at DESC
          `, [project.project_id]) as [RowDataPacket[], any];

          // Get progress images for this project
          const [progressImages] = await connection.execute(`
            SELECT 
              pi.id as image_id,
              pi.image_url as image_url,
              pi.created_at as image_created_at
            FROM progress_images pi
            INNER JOIN progress pr ON pi.progress_id = pr.id
            WHERE pr.project_id = ?
            ORDER BY pi.created_at ASC
          `, [project.project_id]) as [RowDataPacket[], any];

          // Get payment requests for this project
          const [paymentRequests] = await connection.execute(`
            SELECT 
              pr.id as payment_request_id,
              pr.total_amount as payment_total_amount,
              pr.status as payment_status,
              pr.description as payment_description,
              pr.created_at as payment_created_at,
              pr.updated_at as payment_updated_at,
              pr.related_progress_id
            FROM payment_requests pr
            WHERE pr.project_id = ?
            ORDER BY pr.created_at DESC
          `, [project.project_id]) as [RowDataPacket[], any];

          const projectData: any = {
            project: {
              id: project.project_id,
              title: project.project_title,
              description: project.project_description,
              status: project.project_status,
              start_date: project.project_start_date,
              end_date: project.project_end_date,
              total_work: project.project_total_work,
              completed_work: project.project_completed_work,
              created_at: project.project_created_at,
              updated_at: project.project_updated_at
            },
            progress: [],
            payments: []
          };

          // Add progress with images
          for (const progressItem of progress) {
            projectData.progress.push({
              progress: {
                id: progressItem.progress_id,
                status: progressItem.progress_status,
                completion_percentage: progressItem.progress_completion_percentage,
                completed_work: progressItem.progress_completed_work,
                created_at: progressItem.progress_created_at,
                updated_at: progressItem.progress_updated_at
              },
              images: (progressImages as RowDataPacket[]).map((img: any) => ({
                id: img.image_id,
                url: img.image_url,
                created_at: img.image_created_at
              }))
            });
          }

          // Add payment requests with their expenses and images
          for (const payment of paymentRequests) {
            // Get expenses for this payment request
            const [expenses] = await connection.execute(`
              SELECT 
                pre.id as expense_id,
                pre.expense_type as expense_type,
                pre.amount as expense_amount,
                pre.remarks as expense_remarks,
                pre.created_at as expense_created_at
              FROM payment_request_expenses pre
              WHERE pre.payment_request_id = ?
              ORDER BY pre.created_at DESC
            `, [payment.payment_request_id]) as [RowDataPacket[], any];

            // Get payment images for this payment request
            const [paymentImages] = await connection.execute(`
              SELECT 
                pri.id as image_id,
                pri.image_url as image_url,
                pri.expense_id as expense_id,
                pri.created_at as image_created_at
              FROM payment_request_images pri
              WHERE pri.payment_request_id = ?
              ORDER BY pri.created_at DESC
            `, [payment.payment_request_id]) as [RowDataPacket[], any];

            projectData.payments.push({
              payment: {
                id: payment.payment_request_id,
                total_amount: payment.payment_total_amount,
                status: payment.payment_status,
                description: payment.payment_description,
                created_at: payment.payment_created_at,
                updated_at: payment.payment_updated_at,
                related_progress_id: payment.related_progress_id
              },
              expenses: (expenses as RowDataPacket[]).map((expense: any) => ({
                id: expense.expense_id,
                type: expense.expense_type,
                amount: expense.expense_amount,
                remarks: expense.expense_remarks,
                created_at: expense.expense_created_at
              })),
              images: (paymentImages as RowDataPacket[]).map((img: any) => ({
                id: img.image_id,
                url: img.image_url,
                expense_id: img.expense_id,
                created_at: img.image_created_at
              }))
            });
          }

          userData.projects.push(projectData);
        }

        exportData.push(userData);
      }

      connection.release();
      res.json({ data: exportData });

    } catch (error: any) {
      connection.release();
      throw error;
    }

  } catch (error: any) {
    console.error('Error fetching project export data:', error);
    res.status(500).json({ error: 'Failed to fetch project export data' });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT p.*, u.name as leader_name
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
      WHERE p.id = ?
    `, [id]) as [RowDataPacket[], any];
    
    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, description, leader_id, total_work, status, start_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO projects (title, description, leader_id, total_work, status, start_date) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, leader_id, total_work, status, start_date]
    ) as [ResultSetHeader, any];
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Project name already exists' });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, totalWork, status, completedWork } = req.body;
    
    await pool.query(
      'UPDATE projects SET title = ?, description = ?, total_work = ?, status = ?, completed_work = ? WHERE id = ?',
      [title, description, totalWork, status, completedWork, id]
    );

    const [updatedProject] = await pool.query(`
      SELECT p.*, u.name as leader_name
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
      WHERE p.id = ?
    `, [id]) as [RowDataPacket[], any];

    if (Array.isArray(updatedProject) && updatedProject.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(updatedProject[0]);
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]) as [ResultSetHeader, any];
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get all final submission images for a project
router.get('/:id/final-submission-images-for-export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    const connection = await pool.getConnection();
    try {
      const [images] = await connection.execute(`
        SELECT 
          fsi.id,
          fsi.final_submission_id,
          fsi.image_data
        FROM final_submission_images fsi
        INNER JOIN final_submissions fs ON fsi.final_submission_id = fs.id
        WHERE fs.project_id = ?
        ORDER BY fsi.id ASC
      `, [id]) as [RowDataPacket[], any];
      const processedImages = (images as RowDataPacket[]).map((img: any) => ({
        id: img.id,
        final_submission_id: img.final_submission_id,
        image_data: img.image_data ? Buffer.from(img.image_data).toString('base64') : null
      }));
      connection.release();
      res.json({ images: processedImages });
    } catch (error: any) {
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching final submission images for export:', error);
    res.status(500).json({ error: 'Failed to fetch final submission images for export' });
  }
});

export default router; 
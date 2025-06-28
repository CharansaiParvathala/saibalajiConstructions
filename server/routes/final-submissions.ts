import express from 'express';
import { pool } from '../db/config';
import { authenticateToken } from '../middleware/auth';
import { uploadMemory } from '../services/file-upload';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();

// Test endpoint to check database connectivity
router.get('/test', async (req, res) => {
  try {
    // Test database connection
    const [result] = await pool.execute('SELECT 1 as test');
    console.log('Database connection test result:', result);
    
    // Check if final_submissions table exists
    const [tables] = await pool.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'progress_tracker' AND table_name = 'final_submissions'"
    ) as [RowDataPacket[], any];
    
    const tableExists = (tables as RowDataPacket[])[0]?.count > 0;
    
    // If table doesn't exist, create it
    if (!tableExists) {
      console.log('Creating final_submissions tables...');
      
      // Create final_submissions table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS final_submissions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL,
          leader_id INT NOT NULL,
          submission_date TIMESTAMP NOT NULL,
          timer_duration INT NOT NULL DEFAULT 600,
          timer_started_at TIMESTAMP,
          timer_ended_at TIMESTAMP,
          status ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create final_submission_images table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS final_submission_images (
          id INT PRIMARY KEY AUTO_INCREMENT,
          final_submission_id INT NOT NULL,
          image_data LONGBLOB NOT NULL,
          image_url VARCHAR(255),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (final_submission_id) REFERENCES final_submissions(id) ON DELETE CASCADE
        )
      `);
      
      // Add indexes
      await pool.execute('CREATE INDEX IF NOT EXISTS idx_final_submissions_project ON final_submissions(project_id)');
      await pool.execute('CREATE INDEX IF NOT EXISTS idx_final_submissions_leader ON final_submissions(leader_id)');
      await pool.execute('CREATE INDEX IF NOT EXISTS idx_final_submission_images_submission ON final_submission_images(final_submission_id)');
      
      console.log('Final submissions tables created successfully');
    }
    
    res.json({
      databaseConnected: true,
      finalSubmissionsTableExists: true,
      testResult: result,
      tablesCreated: !tableExists
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    res.status(500).json({
      databaseConnected: false,
      error: error.message
    });
  }
});

// Debug endpoint to check submission status
router.get('/:submissionId/debug', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Get submission details
    const [submissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    
    // Get image count
    const [images] = await pool.execute(
      'SELECT COUNT(*) as count FROM final_submission_images WHERE final_submission_id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    const imageCount = (images as RowDataPacket[])[0]?.count || 0;
    
    // Calculate timer status
    const timerStartedAt = new Date(submission.timer_started_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - timerStartedAt.getTime()) / 1000);
    const timeRemaining = Math.max(0, submission.timer_duration - elapsedSeconds);
    
    res.json({
      submission: {
        id: submission.id,
        project_id: submission.project_id,
        leader_id: submission.leader_id,
        status: submission.status,
        timer_started_at: submission.timer_started_at,
        timer_duration: submission.timer_duration,
        elapsed_seconds: elapsedSeconds,
        time_remaining: timeRemaining,
        is_expired: elapsedSeconds > submission.timer_duration
      },
      images: {
        count: imageCount
      },
      debug: {
        current_time: now.toISOString(),
        timer_started_at: timerStartedAt.toISOString(),
        elapsed_seconds: elapsedSeconds,
        time_remaining: timeRemaining
      }
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Failed to get debug info', details: error.message });
  }
});

// Get final submissions for a project
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const [submissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    ) as [RowDataPacket[], any];
    
    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching final submissions:', error);
    res.status(500).json({ error: 'Failed to fetch final submissions' });
  }
});

// Start timer for final submission
router.post('/:projectId/start-timer', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { leaderId } = req.body;
    
    console.log('=== START TIMER DEBUG ===');
    console.log('Starting timer for project:', projectId, 'leader:', leaderId);
    
    // First, let's check the project details
    const [projectCheck] = await pool.execute(
      'SELECT id, title, completed_work, total_work, (completed_work / total_work * 100) as completion_percentage FROM projects WHERE id = ?',
      [projectId]
    ) as [RowDataPacket[], any];
    
    console.log('Project details:', projectCheck);
    
    if (!projectCheck || projectCheck.length === 0) {
      console.log('Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectCheck[0];
    const completionPercentage = Math.round(project.completion_percentage || 0);
    console.log('Project completion:', {
      completed_work: project.completed_work,
      total_work: project.total_work,
      completion_percentage: completionPercentage,
      is_100_percent: project.completed_work >= project.total_work,
      is_95_percent: (project.completed_work / project.total_work) >= 0.95
    });
    
    // Check if final_submissions table exists, create if it doesn't
    try {
      const [tables] = await pool.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'progress_tracker' AND table_name = 'final_submissions'"
      ) as [RowDataPacket[], any];
      
      const tableExists = (tables as RowDataPacket[])[0]?.count > 0;
      
      if (!tableExists) {
        console.log('Creating final_submissions tables...');
        
        // Create final_submissions table
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS final_submissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            leader_id INT NOT NULL,
            submission_date TIMESTAMP NOT NULL,
            timer_duration INT NOT NULL DEFAULT 600,
            timer_started_at TIMESTAMP,
            timer_ended_at TIMESTAMP,
            status ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        
        // Create final_submission_images table
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS final_submission_images (
            id INT PRIMARY KEY AUTO_INCREMENT,
            final_submission_id INT NOT NULL,
            image_data LONGBLOB NOT NULL,
            image_url VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (final_submission_id) REFERENCES final_submissions(id) ON DELETE CASCADE
          )
        `);
        
        // Add indexes
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_final_submissions_project ON final_submissions(project_id)');
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_final_submissions_leader ON final_submissions(leader_id)');
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_final_submission_images_submission ON final_submission_images(final_submission_id)');
        
        console.log('Final submissions tables created successfully');
      }
    } catch (tableError: any) {
      console.error('Error creating tables:', tableError);
      return res.status(500).json({ error: 'Failed to create required tables' });
    }
    
    // Check if project is 95% complete or more
    if (project.completed_work < project.total_work * 0.95) {
      console.log('Project not 95% complete yet');
      return res.status(400).json({ 
        error: 'Project must be at least 95% complete to start final submission timer',
        currentCompletion: completionPercentage,
        requiredCompletion: 95
      });
    }
    
    // Check if there's already an active submission for this project
    const [existingSubmissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE project_id = ? AND status = "in_progress"',
      [projectId]
    ) as [RowDataPacket[], any];
    
    if (existingSubmissions && existingSubmissions.length > 0) {
      console.log('Active submission already exists');
      return res.status(400).json({ 
        error: 'An active final submission timer already exists for this project',
        submissionId: existingSubmissions[0].id
      });
    }
    
    // Create new final submission
    const now = new Date();
    const timerDuration = 600; // 10 minutes in seconds
    
    const [insertResult] = await pool.execute(
      `INSERT INTO final_submissions 
       (project_id, leader_id, submission_date, timer_duration, timer_started_at, status) 
       VALUES (?, ?, ?, ?, ?, 'in_progress')`,
      [projectId, leaderId, now, timerDuration, now]
    ) as [ResultSetHeader, any];
    
    const submissionId = insertResult.insertId;
    
    console.log('Final submission timer started:', {
      submissionId,
      projectId,
      leaderId,
      timerStartedAt: now,
      timerDuration
    });
    
    res.json({
      message: 'Final submission timer started successfully',
      submissionId,
      timerStartedAt: now,
      timerDuration,
      timeRemaining: timerDuration
    });
  } catch (error: any) {
    console.error('Error starting final submission timer:', error);
    res.status(500).json({ error: 'Failed to start final submission timer' });
  }
});

// Upload images for final submission
router.post('/:submissionId/upload-images', authenticateToken, uploadMemory.array('images', 10), async (req, res) => {
  let connection;
  try {
    const { submissionId } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }
    
    console.log('=== UPLOAD IMAGES DEBUG ===');
    console.log('Uploading', files.length, 'images for submission:', submissionId);
    
    // Get connection for transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Check if submission exists and is active
    const [submissions] = await connection.execute(
      'SELECT * FROM final_submissions WHERE id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    if (!submissions || submissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    
    if (submission.status !== 'in_progress') {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Cannot upload images - submission is not in progress',
        status: submission.status
      });
    }
    
    // Check if timer has expired
    const timerStartedAt = new Date(submission.timer_started_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - timerStartedAt.getTime()) / 1000);
    
    if (elapsedSeconds > submission.timer_duration) {
      // Timer expired, mark submission as expired
      await connection.execute(
        'UPDATE final_submissions SET status = "expired", timer_ended_at = ? WHERE id = ?',
        [now, submissionId]
      );
      
      await connection.commit();
      return res.status(400).json({ 
        error: 'Timer has expired, cannot upload images',
        elapsedSeconds,
        timerDuration: submission.timer_duration
      });
    }
    
    // Upload images
    const uploadedImages = [];
    
    for (const file of files) {
      console.log('Processing image:', file.originalname, 'size:', file.size);
      
      // Insert image into database
      const [imageResult] = await connection.execute(
        'INSERT INTO final_submission_images (final_submission_id, image_data) VALUES (?, ?)',
        [submissionId, file.buffer]
      ) as [ResultSetHeader, any];
      
      uploadedImages.push({
        id: imageResult.insertId,
        originalName: file.originalname,
        size: file.size
      });
      
      console.log('Image uploaded with ID:', imageResult.insertId);
    }
    
    await connection.commit();
    
    console.log('Successfully uploaded', uploadedImages.length, 'images');
    
    res.json({
      message: 'Images uploaded successfully',
      submissionId,
      uploadedImages,
      totalImages: uploadedImages.length
    });
  } catch (error: any) {
    console.error('=== UPLOAD IMAGES ERROR ===');
    console.error('Error uploading images:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage
    });
    
    // Rollback transaction if connection exists
    if (connection) {
      try {
        console.log('Rolling back transaction...');
        await connection.rollback();
        console.log('Transaction rolled back');
      } catch (rollbackError: any) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload images', details: error.message });
  } finally {
    // Release connection
    if (connection) {
      try {
        console.log('Releasing database connection...');
        connection.release();
        console.log('Database connection released');
      } catch (releaseError: any) {
        console.error('Error releasing connection:', releaseError);
      }
    }
  }
});

// Complete final submission
router.post('/:submissionId/complete', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { notes } = req.body;
    
    // Check if submission exists
    const [submissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    if (!submissions || submissions.length === 0) {
      return res.status(400).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    const now = new Date();
    
    // Check if timer has expired
    if (submission.status === 'expired') {
      return res.status(400).json({ error: 'Timer has expired, cannot complete submission' });
    }
    
    // Get uploaded images
    const [images] = await pool.execute(
      'SELECT * FROM final_submission_images WHERE final_submission_id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images uploaded for final submission' });
    }
    
    // Complete the submission
    await pool.execute(
      `UPDATE final_submissions 
       SET status = "completed", timer_ended_at = ?, notes = ?, updated_at = ? 
       WHERE id = ?`,
      [now, notes, now, submissionId]
    );
    
    res.json({ 
      message: 'Final submission completed successfully',
      submissionId,
      imageCount: images.length
    });
  } catch (error: any) {
    console.error('Error completing final submission:', error);
    res.status(500).json({ error: 'Failed to complete final submission' });
  }
});

// Get final submission with images
router.get('/:submissionId/details', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Get submission details
    const [submissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    
    // Get images
    const [images] = await pool.execute(
      'SELECT id, image_data, timestamp FROM final_submission_images WHERE final_submission_id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    // Convert blob data to base64
    const imagesWithData = (images as RowDataPacket[]).map((img: any) => ({
      id: img.id,
      dataUrl: `data:image/jpeg;base64,${img.image_data.toString('base64')}`,
      timestamp: img.timestamp
    }));
    
    res.json({
      ...submission,
      images: imagesWithData
    });
  } catch (error: any) {
    console.error('Error fetching final submission details:', error);
    res.status(500).json({ error: 'Failed to fetch submission details' });
  }
});

// Get timer status
router.get('/:submissionId/timer-status', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const [submissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE id = ?',
      [submissionId]
    ) as [RowDataPacket[], any];
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    
    if (submission.status !== 'in_progress') {
      return res.json({
        status: submission.status,
        timeRemaining: 0,
        message: submission.status === 'expired' ? 'Timer expired' : 'Timer not active'
      });
    }
    
    const timerStartedAt = new Date(submission.timer_started_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - timerStartedAt.getTime()) / 1000);
    const timeRemaining = Math.max(0, submission.timer_duration - elapsedSeconds);
    
    // If timer expired, auto-complete the submission
    if (timeRemaining === 0) {
      console.log('Timer expired, auto-completing submission:', submissionId);
      
      // Get uploaded images
      const [images] = await pool.execute(
        'SELECT * FROM final_submission_images WHERE final_submission_id = ?',
        [submissionId]
      ) as [RowDataPacket[], any];
      
      if (images && images.length > 0) {
        // Auto-complete the submission with uploaded images
        await pool.execute(
          `UPDATE final_submissions 
           SET status = "completed", timer_ended_at = ?, notes = ?, updated_at = ? 
           WHERE id = ?`,
          [now, 'Auto-completed when timer expired', now, submissionId]
        );
        
        console.log('Submission auto-completed with', images.length, 'images');
        
        return res.json({
          status: 'completed',
          timeRemaining: 0,
          message: 'Timer expired and submission auto-completed',
          autoCompleted: true,
          imageCount: images.length
        });
      } else {
        // No images uploaded, mark as expired
        await pool.execute(
          'UPDATE final_submissions SET status = "expired", timer_ended_at = ? WHERE id = ?',
          [now, submissionId]
        );
        
        return res.json({
          status: 'expired',
          timeRemaining: 0,
          message: 'Timer expired - no images uploaded'
        });
      }
    }
    
    res.json({
      status: 'in_progress',
      timeRemaining,
      timerStartedAt: submission.timer_started_at,
      timerDuration: submission.timer_duration
    });
  } catch (error: any) {
    console.error('Error fetching timer status:', error);
    res.status(500).json({ error: 'Failed to fetch timer status' });
  }
});

export default router; 
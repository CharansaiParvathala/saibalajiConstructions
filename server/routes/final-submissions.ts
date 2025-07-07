import express from 'express';
import { pool } from '../db/config';
import { authenticateToken } from '../middleware/auth';
import { uploadMemory } from '../services/file-upload';

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
    );
    
    const tableExists = (tables as any)[0]?.count > 0;
    
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
  } catch (error) {
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
    );
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    
    // Get image count
    const [images] = await pool.execute(
      'SELECT COUNT(*) as count FROM final_submission_images WHERE final_submission_id = ?',
      [submissionId]
    );
    
    const imageCount = (images as any)[0]?.count || 0;
    
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
  } catch (error) {
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
    );
    
    res.json(submissions);
  } catch (error) {
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
    );
    
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
      );
      
      const tableExists = (tables as any)[0]?.count > 0;
      
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
    } catch (tableError) {
      console.error('Error checking/creating tables:', tableError);
      // Continue anyway, the table might already exist
    }
    
    // Check if project is completed (100% work done or at least 95% complete)
    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ? AND (completed_work >= total_work OR (completed_work / total_work) >= 0.95)',
      [projectId]
    );
    
    console.log('Found projects meeting completion criteria:', projects);
    
    if (!projects || projects.length === 0) {
      // Get project details for better error message
      const [projectDetails] = await pool.execute(
        'SELECT id, title, completed_work, total_work, (completed_work / total_work * 100) as completion_percentage FROM projects WHERE id = ?',
        [projectId]
      );
      
      if (projectDetails && projectDetails.length > 0) {
        const project = projectDetails[0];
        const completionPercentage = Math.round(project.completion_percentage || 0);
        console.log('Project does not meet completion criteria:', {
          completed_work: project.completed_work,
          total_work: project.total_work,
          completion_percentage: completionPercentage
        });
        return res.status(400).json({ 
          error: `Project is not completed yet. Current progress: ${project.completed_work}/${project.total_work} (${completionPercentage}%)` 
        });
      } else {
        console.log('Project not found in database');
        return res.status(400).json({ error: 'Project not found' });
      }
    }
    
    // Check if there's already an active timer for this project
    const [existingSubmissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE project_id = ? AND status = "in_progress"',
      [projectId]
    );
    
    console.log('Existing submissions:', existingSubmissions);
    
    if (existingSubmissions && existingSubmissions.length > 0) {
      console.log('Timer already active for this project');
      return res.status(400).json({ error: 'Timer already active for this project' });
    }
    
    const now = new Date();
    
    console.log('Creating final submission with data:', {
      projectId,
      leaderId,
      now,
      timerDuration: 600,
      status: 'in_progress'
    });
    
    // Create new final submission with timer started
    const [result] = await pool.execute(
      `INSERT INTO final_submissions 
       (project_id, leader_id, submission_date, timer_duration, timer_started_at, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, leaderId, now, 600, now, 'in_progress']
    );
    
    const submissionId = (result as any).insertId;
    
    console.log('Created submission with ID:', submissionId);
    console.log('=== START TIMER DEBUG END ===');
    
    res.json({ 
      submissionId, 
      timerStartedAt: now.toISOString(),
      timerDuration: 600,
      message: 'Timer started successfully'
    });
  } catch (error) {
    console.error('=== START TIMER ERROR ===');
    console.error('Error starting timer:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ error: 'Failed to start timer', details: error.message });
  }
});

// Upload images during timer period
router.post('/:submissionId/upload-images', authenticateToken, uploadMemory.array('images', 10), async (req, res) => {
  let connection;
  try {
    const { submissionId } = req.params;
    const files = req.files as Express.Multer.File[];
    
    console.log('=== UPLOAD IMAGES DEBUG START ===');
    console.log('Uploading images for submission:', submissionId);
    console.log('Number of files:', files ? files.length : 0);
    if (!files || files.length === 0) {
      console.log('No images provided');
      return res.status(400).json({ error: 'No images provided' });
    }
    
    // Get a connection for transaction
    console.log('Getting database connection...');
    connection = await pool.getConnection();
    console.log('Database connection acquired');
    
    await connection.beginTransaction();
    console.log('Transaction started');
    
    // Check if submission exists and timer is still active
    console.log('Checking submission status...');
    const [submissions] = await connection.execute(
      'SELECT * FROM final_submissions WHERE id = ? AND status = "in_progress"',
      [submissionId]
    );
    
    console.log('Found submissions:', submissions);
    console.log('Submission count:', submissions.length);
    
    if (!submissions || submissions.length === 0) {
      console.log('No active submission found, rolling back...');
      await connection.rollback();
      return res.status(400).json({ error: 'No active submission found' });
    }
    
    const submission = submissions[0];
    const timerStartedAt = new Date(submission.timer_started_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - timerStartedAt.getTime()) / 1000);
    
    console.log('Timer check:', {
      timerStartedAt: submission.timer_started_at,
      now: now.toISOString(),
      elapsedSeconds,
      timerDuration: submission.timer_duration,
      timeRemaining: submission.timer_duration - elapsedSeconds
    });
    
    if (elapsedSeconds > submission.timer_duration) {
      console.log('Timer expired, updating status and rolling back...');
      // Timer expired, update status
      await connection.execute(
        'UPDATE final_submissions SET status = "expired", timer_ended_at = ? WHERE id = ?',
        [now, submissionId]
      );
      await connection.rollback();
      return res.status(400).json({ error: 'Timer has expired' });
    }
    
    // Upload images
    console.log('Starting image upload process...');
    const uploadedImages = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}`);
        if (!file || !file.buffer) {
          console.log(`Skipping file ${i + 1} - no data`);
          continue;
        }
        console.log(`Inserting file ${i + 1} into database...`);
        const [imageResult] = await connection.execute(
          'INSERT INTO final_submission_images (final_submission_id, image_data) VALUES (?, ?)',
          [submissionId, file.buffer]
        );
        const imageId = (imageResult as any).insertId;
        uploadedImages.push(imageId);
        console.log(`Successfully uploaded file ${i + 1} with ID:`, imageId);
      } catch (imageError) {
        console.error(`Error uploading file ${i + 1}:`, imageError);
        await connection.rollback();
        throw imageError;
      }
    }
    
    console.log('Total images uploaded:', uploadedImages.length);
    console.log('Committing transaction...');
    
    // Commit transaction
    await connection.commit();
    console.log('Transaction committed successfully');
    
    console.log('=== UPLOAD IMAGES DEBUG END ===');
    
    res.json({ 
      message: 'Images uploaded successfully',
      uploadedCount: uploadedImages.length,
      timeRemaining: submission.timer_duration - elapsedSeconds
    });
  } catch (error) {
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
      } catch (rollbackError) {
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
      } catch (releaseError) {
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
    );
    
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
    );
    
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
  } catch (error) {
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
    );
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissions[0];
    
    // Get images
    const [images] = await pool.execute(
      'SELECT id, image_data, timestamp FROM final_submission_images WHERE final_submission_id = ?',
      [submissionId]
    );
    
    // Convert blob data to base64
    const imagesWithData = images.map((img: any) => ({
      id: img.id,
      dataUrl: `data:image/jpeg;base64,${img.image_data.toString('base64')}`,
      timestamp: img.timestamp
    }));
    
    res.json({
      ...submission,
      images: imagesWithData
    });
  } catch (error) {
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
    );
    
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
      );
      
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
  } catch (error) {
    console.error('Error fetching timer status:', error);
    res.status(500).json({ error: 'Failed to fetch timer status' });
  }
});

export default router; 
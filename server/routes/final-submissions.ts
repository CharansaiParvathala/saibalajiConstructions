import express from 'express';
import { pool } from '../db/config';
import { authenticateToken } from '../middleware/auth';

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
    
    // Test BLOB insertion with a small test
    const testConnection = await pool.getConnection();
    try {
      await testConnection.execute('SET SESSION max_allowed_packet = 16777216');
      console.log('Set max_allowed_packet for test connection');
      
      // Create a test submission if none exists
      const [existingSubmissions] = await testConnection.execute(
        'SELECT COUNT(*) as count FROM final_submissions LIMIT 1'
      );
      
      let testSubmissionId = null;
      if ((existingSubmissions as any)[0]?.count === 0) {
        // Create a test submission
        const [insertResult] = await testConnection.execute(
          'INSERT INTO final_submissions (project_id, leader_id, submission_date, timer_duration, status) VALUES (1, 1, NOW(), 600, "in_progress")'
        );
        testSubmissionId = (insertResult as any).insertId;
        console.log('Created test submission with ID:', testSubmissionId);
      }
      
      // Test BLOB insertion with a small image
      if (testSubmissionId) {
        const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        await testConnection.execute(
          'INSERT INTO final_submission_images (final_submission_id, image_data) VALUES (?, ?)',
          [testSubmissionId, testImageData]
        );
        console.log('Successfully inserted test BLOB data');
        
        // Clean up test data
        await testConnection.execute('DELETE FROM final_submission_images WHERE final_submission_id = ?', [testSubmissionId]);
        await testConnection.execute('DELETE FROM final_submissions WHERE id = ?', [testSubmissionId]);
        console.log('Cleaned up test data');
      }
    } finally {
      testConnection.release();
    }
    
    res.json({
      databaseConnected: true,
      finalSubmissionsTableExists: true,
      testResult: result,
      tablesCreated: !tableExists,
      blobTest: 'successful'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      databaseConnected: false,
      error: error.message,
      stack: error.stack
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
    
    console.log('Starting timer for project:', projectId, 'leader:', leaderId);
    
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
    
    // Check if project is completed (100% work done)
    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ? AND completed_work >= total_work',
      [projectId]
    );
    
    console.log('Found projects:', projects);
    
    if (!projects || projects.length === 0) {
      return res.status(400).json({ error: 'Project is not completed yet' });
    }
    
    // Check if there's already an active timer for this project
    const [existingSubmissions] = await pool.execute(
      'SELECT * FROM final_submissions WHERE project_id = ? AND status = "in_progress"',
      [projectId]
    );
    
    console.log('Existing submissions:', existingSubmissions);
    
    if (existingSubmissions && existingSubmissions.length > 0) {
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
    
    res.json({ 
      submissionId, 
      timerStartedAt: now.toISOString(),
      timerDuration: 600,
      message: 'Timer started successfully'
    });
  } catch (error) {
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
router.post('/:submissionId/upload-images', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { submissionId } = req.params;
    const { images } = req.body; // Array of base64 images
    
    console.log('=== UPLOAD IMAGES DEBUG START ===');
    console.log('Uploading images for submission:', submissionId);
    console.log('Number of images:', images ? images.length : 0);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body size:', JSON.stringify(req.body).length);
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.log('No images provided or invalid format');
      return res.status(400).json({ error: 'No images provided' });
    }
    
    // Get a connection for transaction
    console.log('Getting database connection...');
    try {
      connection = await pool.getConnection();
      console.log('Database connection acquired');
    } catch (connectionError) {
      console.error('Failed to get database connection:', connectionError);
      return res.status(500).json({ error: 'Database connection failed', details: connectionError.message });
    }
    
    try {
      await connection.beginTransaction();
      console.log('Transaction started');
    } catch (transactionError) {
      console.error('Failed to start transaction:', transactionError);
      connection.release();
      return res.status(500).json({ error: 'Failed to start transaction', details: transactionError.message });
    }
    
    // Check if submission exists and timer is still active
    console.log('Checking submission status...');
    let submissions;
    try {
      [submissions] = await connection.execute(
        'SELECT * FROM final_submissions WHERE id = ? AND status = "in_progress"',
        [submissionId]
      );
    } catch (queryError) {
      console.error('Failed to query submission:', queryError);
      await connection.rollback();
      connection.release();
      return res.status(500).json({ error: 'Failed to check submission status', details: queryError.message });
    }
    
    console.log('Found submissions:', submissions);
    console.log('Submission count:', submissions.length);
    
    if (!submissions || submissions.length === 0) {
      console.log('No active submission found, rolling back...');
      await connection.rollback();
      connection.release();
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
      try {
        await connection.execute(
          'UPDATE final_submissions SET status = "expired", timer_ended_at = ? WHERE id = ?',
          [now, submissionId]
        );
      } catch (updateError) {
        console.error('Failed to update expired status:', updateError);
      }
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Timer has expired' });
    }
    
    // Upload images
    console.log('Starting image upload process...');
    const uploadedImages = [];
    const errors = [];
    
    for (let i = 0; i < images.length; i++) {
      try {
        const imageData = images[i];
        console.log(`Processing image ${i + 1}/${images.length}`);
        console.log(`Image data type:`, typeof imageData);
        console.log(`Image data length:`, imageData ? imageData.length : 0);
        console.log(`Image data preview:`, imageData ? imageData.substring(0, 50) + '...' : 'null');
        
        if (!imageData || typeof imageData !== 'string') {
          console.log(`Skipping image ${i + 1} - no data or invalid type`);
          errors.push(`Image ${i + 1}: No data or invalid type`);
          continue;
        }
        
        // Remove any whitespace from the base64 string
        const cleanImageData = imageData.trim();
        
        // Validate base64 data - more permissive validation
        if (!cleanImageData || cleanImageData.length === 0) {
          console.log(`Skipping image ${i + 1} - empty data`);
          errors.push(`Image ${i + 1}: Empty data`);
          continue;
        }
        
        // Check if it's valid base64 by trying to decode it
        let testBuffer;
        try {
          // Test if the base64 can be decoded
          testBuffer = Buffer.from(cleanImageData, 'base64');
          if (testBuffer.length === 0) {
            console.log(`Skipping image ${i + 1} - invalid base64 (empty buffer)`);
            errors.push(`Image ${i + 1}: Invalid base64 data`);
            continue;
          }
          console.log(`Image ${i + 1} buffer size:`, testBuffer.length);
        } catch (decodeError) {
          console.log(`Skipping image ${i + 1} - invalid base64:`, decodeError.message);
          errors.push(`Image ${i + 1}: Invalid base64 data`);
          continue;
        }
        
        console.log(`Inserting image ${i + 1} into database...`);
        let imageResult;
        try {
          [imageResult] = await connection.execute(
            'INSERT INTO final_submission_images (final_submission_id, image_data) VALUES (?, ?)',
            [submissionId, testBuffer]
          );
        } catch (insertError) {
          console.error(`Database error inserting image ${i + 1}:`, insertError);
          console.error(`Error details:`, {
            message: insertError.message,
            code: insertError.code,
            sqlMessage: insertError.sqlMessage,
            sqlState: insertError.sqlState
          });
          throw insertError;
        }
        
        const imageId = (imageResult as any).insertId;
        uploadedImages.push(imageId);
        console.log(`Successfully uploaded image ${i + 1} with ID:`, imageId);
      } catch (imageError) {
        console.error(`Error uploading image ${i + 1}:`, imageError);
        console.error(`Error details:`, {
          message: imageError.message,
          stack: imageError.stack,
          sqlMessage: imageError.sqlMessage,
          code: imageError.code,
          sqlState: imageError.sqlState
        });
        errors.push(`Image ${i + 1}: ${imageError.message}`);
        
        // Don't rollback immediately, continue with other images
        // We'll rollback only if no images were uploaded successfully
      }
    }
    
    console.log('Total images uploaded:', uploadedImages.length);
    console.log('Errors encountered:', errors);
    
    // If no images were uploaded successfully, rollback
    if (uploadedImages.length === 0) {
      console.log('No images uploaded successfully, rolling back...');
      try {
        await connection.rollback();
        console.log('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      connection.release();
      return res.status(400).json({ 
        error: 'Failed to upload any images',
        details: errors.join(', ')
      });
    }
    
    console.log('Committing transaction...');
    
    // Commit transaction
    try {
      await connection.commit();
      console.log('Transaction committed successfully');
    } catch (commitError) {
      console.error('Failed to commit transaction:', commitError);
      try {
        await connection.rollback();
        console.log('Transaction rolled back after commit failure');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      connection.release();
      return res.status(500).json({ error: 'Failed to commit transaction', details: commitError.message });
    }
    
    console.log('=== UPLOAD IMAGES DEBUG END ===');
    
    res.json({ 
      message: 'Images uploaded successfully',
      uploadedCount: uploadedImages.length,
      timeRemaining: submission.timer_duration - elapsedSeconds,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('=== UPLOAD IMAGES ERROR ===');
    console.error('Error uploading images:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      code: error.code,
      sqlState: error.sqlState
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

// Debug endpoint to test image upload
router.post('/debug/upload-test', authenticateToken, async (req, res) => {
  try {
    const { images } = req.body;
    
    console.log('=== DEBUG UPLOAD TEST ===');
    console.log('Number of images received:', images ? images.length : 0);
    
    if (!images || !Array.isArray(images)) {
      return res.json({
        success: false,
        error: 'No images array provided'
      });
    }
    
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const result = {
        index: i,
        type: typeof imageData,
        length: imageData ? imageData.length : 0,
        preview: imageData ? imageData.substring(0, 50) + '...' : 'null',
        isValidBase64: false,
        bufferSize: 0,
        error: null
      };
      
      try {
        if (imageData && typeof imageData === 'string') {
          const cleanData = imageData.trim();
          if (cleanData.length > 0) {
            const buffer = Buffer.from(cleanData, 'base64');
            result.isValidBase64 = true;
            result.bufferSize = buffer.length;
          }
        }
      } catch (error) {
        result.error = error.message;
      }
      
      results.push(result);
    }
    
    console.log('Debug results:', results);
    
    res.json({
      success: true,
      totalImages: images.length,
      results: results
    });
  } catch (error) {
    console.error('Debug upload test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 
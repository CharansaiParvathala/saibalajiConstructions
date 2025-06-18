import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../db/config';
import { upload } from '../services/file-upload';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Maximum number of images allowed
const MAX_IMAGES = 5;

// Get progress updates for a project
router.get('/project/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const [rows] = await pool.query(`
      SELECT p.*, 
             GROUP_CONCAT(pi.id) as image_ids
      FROM progress p
      LEFT JOIN progress_images pi ON p.id = pi.progress_id
      WHERE p.project_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [projectId]);
    
    // Convert BLOB data to base64 for images
    const formattedRows = (rows as any[]).map(row => ({
      ...row,
      image_proof: row.image_proof ? row.image_proof.toString('base64') : null,
      image_ids: row.image_ids ? row.image_ids.split(',').map((id: string) => parseInt(id.trim())) : []
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching progress updates:', error);
    res.status(500).json({ error: 'Failed to fetch progress updates' });
  }
});

// Add progress update with image
router.post('/', authenticateToken, upload.array('images', MAX_IMAGES), async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { projectId, completedWork, description } = req.body;
    const userId = (req as any).user.id;
    const files = req.files as Express.Multer.File[];

    // Validate number of images
    if (files && files.length > MAX_IMAGES) {
      throw new Error(`Maximum ${MAX_IMAGES} images allowed`);
    }

    console.log('Received progress request:', {
      projectId,
      completedWork,
      description,
      userId,
      files: files?.length || 0
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
    
    if (files && files.length > 0) {
      // Read all files into memory first
      for (const file of files) {
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

    // Determine status based on completion percentage
    const progressStatus = completionPercentage >= 100 ? 'completed' : 'pending';
    const projectStatus = completionPercentage >= 100 ? 'completed' : 'active';

    // Insert progress update with user_id, completion percentage, and image_proof
    const [result] = await connection.query(
      'INSERT INTO progress (project_id, user_id, completed_work, description, completion_percentage, image_proof, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [projectId, userId, completedWorkNum, description || 'Progress update', completionPercentage, imageData, progressStatus]
    );

    const progressId = (result as any).insertId;

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
      image_count: files?.length || 0
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

export default router; 
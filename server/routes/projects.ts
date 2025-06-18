import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../db/config';

const router = express.Router();

// Get all projects
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.name as leader_name
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
      ORDER BY p.created_at DESC
    `);
    console.log('Fetched projects:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
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
    `, [id]);
    
    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, description, total_work, leader_id } = req.body;
    
    // Validate required fields
    if (!title || !description || !total_work || !leader_id) {
      console.log('Missing fields:', { title, description, total_work, leader_id });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          title: !title,
          description: !description,
          total_work: !total_work,
          leader_id: !leader_id
        }
      });
    }

    console.log('Creating project with data:', { title, description, total_work, leader_id });

    const [result] = await pool.query(
      'INSERT INTO projects (title, description, leader_id, total_work, completed_work, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, leader_id, total_work, 0, 'active']
    );

    console.log('Project created with ID:', (result as any).insertId);

    const [newProject] = await pool.query(`
      SELECT p.*, u.name as leader_name
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
      WHERE p.id = ?
    `, [(result as any).insertId]);

    console.log('New project data:', newProject[0]);
    res.status(201).json(newProject[0]);
  } catch (error) {
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
    `, [id]);

    if (Array.isArray(updatedProject) && updatedProject.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(updatedProject[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router; 
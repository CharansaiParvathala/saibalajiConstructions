import express, { Request, Response } from 'express';
import { pool } from '../db/config';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all backup links (admin only)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const [rows] = await pool.query(`
      SELECT 
        bl.id,
        bl.url,
        bl.description,
        bl.created_at as createdAt,
        bl.created_by as createdBy,
        u.name as createdByName
      FROM backup_links bl
      LEFT JOIN users u ON bl.created_by = u.id
      ORDER BY bl.created_at DESC
    `) as [any[], any];

    res.json(rows);
  } catch (error) {
    console.error('Error fetching backup links:', error);
    res.status(500).json({ error: 'Failed to fetch backup links' });
  }
});

// Create a new backup link (admin only)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { url, description } = req.body;

    // Validate required fields
    if (!url || !description) {
      return res.status(400).json({ error: 'URL and description are required' });
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const [result] = await pool.query(
      'INSERT INTO backup_links (url, description, created_by) VALUES (?, ?, ?)',
      [url, description, user.id]
    ) as [any, any];

    // Get the created backup link
    const [rows] = await pool.query(`
      SELECT 
        bl.id,
        bl.url,
        bl.description,
        bl.created_at as createdAt,
        bl.created_by as createdBy,
        u.name as createdByName
      FROM backup_links bl
      LEFT JOIN users u ON bl.created_by = u.id
      WHERE bl.id = ?
    `, [result.insertId]) as [any[], any];

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating backup link:', error);
    res.status(500).json({ error: 'Failed to create backup link' });
  }
});

// Update a backup link (admin only)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    const { url, description } = req.body;

    // Validate required fields
    if (!url || !description) {
      return res.status(400).json({ error: 'URL and description are required' });
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check if backup link exists
    const [existingRows] = await pool.query(
      'SELECT id FROM backup_links WHERE id = ?',
      [id]
    ) as [any[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Backup link not found' });
    }

    // Update the backup link
    await pool.query(
      'UPDATE backup_links SET url = ?, description = ? WHERE id = ?',
      [url, description, id]
    );

    // Get the updated backup link
    const [rows] = await pool.query(`
      SELECT 
        bl.id,
        bl.url,
        bl.description,
        bl.created_at as createdAt,
        bl.created_by as createdBy,
        u.name as createdByName
      FROM backup_links bl
      LEFT JOIN users u ON bl.created_by = u.id
      WHERE bl.id = ?
    `, [id]) as [any[], any];

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating backup link:', error);
    res.status(500).json({ error: 'Failed to update backup link' });
  }
});

// Get backup link by ID (admin only)
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT 
        bl.id,
        bl.url,
        bl.description,
        bl.created_at as createdAt,
        bl.created_by as createdBy,
        u.name as createdByName
      FROM backup_links bl
      LEFT JOIN users u ON bl.created_by = u.id
      WHERE bl.id = ?
    `, [id]) as [any[], any];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Backup link not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching backup link:', error);
    res.status(500).json({ error: 'Failed to fetch backup link' });
  }
});

export default router; 
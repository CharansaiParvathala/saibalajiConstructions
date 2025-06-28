import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../db/config';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();

// Get payment requests for a progress
router.get('/progress/:progressId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { progressId } = req.params;
    const [rows] = await pool.query(`
      SELECT pr.*, p.title as project_title, p.description as project_description
      FROM payment_requests pr
      JOIN progress pg ON pr.progress_id = pg.id
      JOIN projects p ON pg.project_id = p.id
      WHERE pr.progress_id = ?
      ORDER BY pr.created_at DESC
    `, [progressId]) as [RowDataPacket[], any];
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

// Create payment request for progress
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { progressId, amount, description } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!progressId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get progress details
      const [progressRows] = await connection.query(
        'SELECT * FROM progress WHERE id = ?',
        [progressId]
      ) as [RowDataPacket[], any];

      if (!progressRows || progressRows.length === 0) {
        throw new Error('Progress not found');
      }

      const progress = progressRows[0];

      // Create payment request
      const [result] = await connection.query(
        'INSERT INTO payment_requests (progress_id, amount, description, status) VALUES (?, ?, ?, ?)',
        [progressId, amount, description, 'pending']
      ) as [ResultSetHeader, any];

      const paymentRequestId = result.insertId;

      // Add to payment request history
      await connection.query(
        'INSERT INTO payment_request_history (payment_request_id, status, comment, created_by) VALUES (?, ?, ?, ?)',
        [paymentRequestId, 'pending', 'Payment request created', userId]
      );

      // Commit the transaction
      await connection.commit();

      // Get the created payment request with progress details
      const [paymentRequest] = await connection.query(`
        SELECT pr.*, p.title as project_title, p.description as project_description
        FROM payment_requests pr
        JOIN progress pg ON pr.progress_id = pg.id
        JOIN projects p ON pg.project_id = p.id
        WHERE pr.id = ?
      `, [paymentRequestId]) as [RowDataPacket[], any];

      res.status(201).json(paymentRequest[0]);
    } catch (error: any) {
      // Rollback in case of error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment request' });
  }
});

export default router; 
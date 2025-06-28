import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/config';
import { RowDataPacket } from 'mysql2';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database to ensure they still exist
    const [users] = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [decoded.id]
    ) as [RowDataPacket[], any];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user info to request
    (req as any).user = users[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Alias for authenticateToken
export const authenticate = authenticateToken; 
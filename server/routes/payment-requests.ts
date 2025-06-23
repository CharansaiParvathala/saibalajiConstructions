import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../db/config';
import { upload } from '../services/file-upload';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Maximum number of images allowed
const MAX_IMAGES = 5;

// Get all payment requests
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        pr.*,
        p.title as project_title,
        u.name as requester_name,
        GROUP_CONCAT(pri.id) as image_ids
      FROM payment_requests pr
      JOIN projects p ON pr.project_id = p.id
      JOIN users u ON p.leader_id = u.id
      LEFT JOIN payment_request_images pri ON pr.id = pri.payment_request_id
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `) as [any[], any];
    
    // Get expenses with their specific images for each payment request
    const formattedRows = await Promise.all(rows.map(async (row) => {
      // Get expenses for this payment request
      const [expensesData] = await pool.query(`
        SELECT 
          pre.id,
          pre.expense_type,
          pre.amount,
          pre.remarks,
          GROUP_CONCAT(pri.id) as image_ids
        FROM payment_request_expenses pre
        LEFT JOIN payment_request_images pri ON pre.id = pri.expense_id
        WHERE pre.payment_request_id = ?
        GROUP BY pre.id
        ORDER BY pre.id
      `, [row.id]) as [any[], any];

      // Format expenses with their image IDs
      const formattedExpenses = expensesData.map((expense: any) => ({
        ...expense,
        image_ids: expense.image_ids ? expense.image_ids.split(',').map((id: string) => parseInt(id.trim())) : []
      }));

      return {
        ...row,
        proof_of_payment: row.proof_of_payment ? row.proof_of_payment.toString('base64') : null,
        image_ids: row.image_ids ? row.image_ids.split(',').map((id: string) => parseInt(id.trim())) : [],
        expenses: formattedExpenses
      };
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

// Get all payment requests for admin dashboard with total amounts
router.get('/admin-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Admin/Owner only.' });
    }

    // Get all payment requests with their total amounts
    const [rows] = await pool.query(`
      SELECT 
        pr.id,
        pr.project_id,
        pr.user_id,
        pr.total_amount,
        pr.status,
        pr.description,
        pr.created_at,
        pr.updated_at,
        p.title as project_title,
        u.name as requester_name
      FROM payment_requests pr
      JOIN projects p ON pr.project_id = p.id
      JOIN users u ON p.leader_id = u.id
      ORDER BY pr.created_at DESC
    `) as [any[], any];

    // Calculate totals
    const totalAmount = rows.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);
    const paidAmount = rows
      .filter(row => row.status === 'paid')
      .reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);
    const pendingCount = rows.filter(row => row.status === 'pending').length;
    const approvedCount = rows.filter(row => row.status === 'approved').length;
    const rejectedCount = rows.filter(row => row.status === 'rejected').length;
    const scheduledCount = rows.filter(row => row.status === 'scheduled').length;
    const paidCount = rows.filter(row => row.status === 'paid').length;

    // Format the response
    const formattedRows = rows.map(row => ({
      ...row,
      total_amount: parseFloat(row.total_amount) || 0
    }));

    res.json({
      paymentRequests: formattedRows,
      summary: {
        totalAmount: Math.round(totalAmount),
        paidAmount: Math.round(paidAmount),
        pendingCount,
        approvedCount,
        rejectedCount,
        scheduledCount,
        paidCount,
        totalCount: rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching admin payment summary:', error);
    res.status(500).json({ error: 'Failed to fetch admin payment summary' });
  }
});

// Get payment requests for a specific project
router.get('/project/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        pr.*,
        p.title as project_title,
        u.name as requester_name,
        GROUP_CONCAT(pri.id) as image_ids
      FROM payment_requests pr
      JOIN projects p ON pr.project_id = p.id
      JOIN users u ON p.leader_id = u.id
      LEFT JOIN payment_request_images pri ON pr.id = pri.payment_request_id
      WHERE pr.project_id = ?
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `, [projectId]) as [any[], any];
    
    // Get expenses with their specific images for each payment request
    const formattedRows = await Promise.all(rows.map(async (row) => {
      // Get expenses for this payment request
      const [expensesData] = await pool.query(`
        SELECT 
          pre.id,
          pre.expense_type,
          pre.amount,
          pre.remarks,
          GROUP_CONCAT(pri.id) as image_ids
        FROM payment_request_expenses pre
        LEFT JOIN payment_request_images pri ON pre.id = pri.expense_id
        WHERE pre.payment_request_id = ?
        GROUP BY pre.id
        ORDER BY pre.id
      `, [row.id]) as [any[], any];

      // Format expenses with their image IDs
      const formattedExpenses = expensesData.map((expense: any) => ({
        ...expense,
        image_ids: expense.image_ids ? expense.image_ids.split(',').map((id: string) => parseInt(id.trim())) : []
      }));

      return {
        ...row,
        proof_of_payment: row.proof_of_payment ? row.proof_of_payment.toString('base64') : null,
        image_ids: row.image_ids ? row.image_ids.split(',').map((id: string) => parseInt(id.trim())) : [],
        expenses: formattedExpenses
      };
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching project payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch project payment requests' });
  }
});

// Create new payment request with expenses
router.post('/', authenticateToken, upload.array('images', MAX_IMAGES), async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { projectId, description, progressId, expenses } = req.body;
    const userId = (req as any).user.id;
    const files = req.files as Express.Multer.File[];
    
    if (!projectId || !expenses) {
      return res.status(400).json({ error: 'Project ID and expenses are required' });
    }

    // Parse expenses from JSON string if it's a string
    const expensesArray = typeof expenses === 'string' ? JSON.parse(expenses) : expenses;
    
    if (!Array.isArray(expensesArray) || expensesArray.length === 0) {
      return res.status(400).json({ error: 'At least one expense is required' });
    }

    // Validate number of images
    if (files && files.length > MAX_IMAGES) {
      throw new Error(`Maximum ${MAX_IMAGES} images allowed`);
    }

    // Calculate total amount from expenses
    const totalAmount = expensesArray.reduce((sum, expense) => sum + Number(expense.amount), 0);

    console.log('Creating payment request:', {
      projectId,
      userId,
      totalAmount,
      expensesCount: expensesArray.length,
      filesCount: files?.length || 0
    });

    // Insert payment request
    const [result] = await connection.query(
      'INSERT INTO payment_requests (project_id, user_id, total_amount, description, progress_id) VALUES (?, ?, ?, ?, ?)',
      [projectId, userId, totalAmount, description, progressId || null]
    );

    const paymentRequestId = (result as any).insertId;

    // Store files in memory for later use
    const fileDataArray: { data: Buffer; filename: string; originalName: string }[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileData = fs.readFileSync(file.path);
        fileDataArray.push({ 
          data: fileData, 
          filename: file.filename,
          originalName: file.originalname 
        });
        fs.unlinkSync(file.path);
      }
    }

    // Insert expenses and their associated images
    let fileIndex = 0;
    for (const expense of expensesArray) {
      // Insert expense
      const [expenseResult] = await connection.query(
        'INSERT INTO payment_request_expenses (payment_request_id, expense_type, amount, remarks) VALUES (?, ?, ?, ?)',
        [paymentRequestId, expense.type, expense.amount, expense.remarks || null]
      ) as any[];

      const expenseId = expenseResult.insertId;

      // Insert images for this expense
      if (expense.images && Array.isArray(expense.images)) {
        for (const imageIndex of expense.images) {
          if (fileIndex < fileDataArray.length) {
            const fileData = fileDataArray[fileIndex];
            await connection.query(
              'INSERT INTO payment_request_images (payment_request_id, expense_id, image_url, image_data) VALUES (?, ?, ?, ?)',
              [paymentRequestId, expenseId, `/payment-request-images/${paymentRequestId}/${expenseId}/${fileData.filename}`, fileData.data]
            );
            fileIndex++;
          }
        }
      }
    }

    // Commit transaction
    await connection.commit();

    // Get the created payment request with expenses and images
    const [newRequest] = await connection.query(`
      SELECT 
        pr.*,
        p.title as project_title,
        u.name as requester_name,
        GROUP_CONCAT(DISTINCT pri.id) as image_ids,
        GROUP_CONCAT(DISTINCT pre.id) as expense_ids
      FROM payment_requests pr
      JOIN projects p ON pr.project_id = p.id
      JOIN users u ON pr.user_id = u.id
      LEFT JOIN payment_request_images pri ON pr.id = pri.payment_request_id
      LEFT JOIN payment_request_expenses pre ON pr.id = pre.payment_request_id
      WHERE pr.id = ?
      GROUP BY pr.id
    `, [paymentRequestId]) as [any[], any];

    // Get expenses details
    const [expensesData] = await connection.query(`
      SELECT id, expense_type, amount, remarks
      FROM payment_request_expenses
      WHERE payment_request_id = ?
      ORDER BY id
    `, [paymentRequestId]) as [any[], any];

    // Format response
    const formattedRequest = {
      ...newRequest[0],
      image_ids: newRequest[0].image_ids ? newRequest[0].image_ids.split(',').map((id: string) => parseInt(id.trim())) : [],
      expense_ids: newRequest[0].expense_ids ? newRequest[0].expense_ids.split(',').map((id: string) => parseInt(id.trim())) : [],
      expenses: expensesData
    };

    console.log('Created payment request:', {
      id: paymentRequestId,
      totalAmount,
      expensesCount: expensesData.length,
      imageCount: formattedRequest.image_ids.length
    });

    res.status(201).json(formattedRequest);
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create payment request' });
  } finally {
    connection.release();
  }
});

// Update payment request status
router.put('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const userId = (req as any).user.id;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Update payment request status
    await pool.query(
      'UPDATE payment_requests SET status = ? WHERE id = ?',
      [status, id]
    );

    // Add to history
    await pool.query(
      'INSERT INTO payment_request_history (payment_request_id, status, comment, created_by) VALUES (?, ?, ?, ?)',
      [id, status, comment, userId]
    );

    const [updatedRequest] = await pool.query(`
      SELECT pr.*, p.title as project_title, u.name as requester_name
      FROM payment_requests pr
      JOIN projects p ON pr.project_id = p.id
      JOIN users u ON p.leader_id = u.id
      WHERE pr.id = ?
    `, [id]) as [any[], any];

    res.json(updatedRequest[0]);
  } catch (error) {
    console.error('Error updating payment request:', error);
    res.status(500).json({ error: 'Failed to update payment request' });
  }
});

// Get payment request history
router.get('/:id/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT h.*, u.name as updated_by_name
      FROM payment_request_history h
      JOIN users u ON h.created_by = u.id
      WHERE h.payment_request_id = ?
      ORDER BY h.created_at DESC
    `, [id]) as [any[], any];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payment request history:', error);
    res.status(500).json({ error: 'Failed to fetch payment request history' });
  }
});

// Get payment request image by ID
router.get('/image/:imageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    
    const [rows] = await pool.query(
      'SELECT image_data, image_url FROM payment_request_images WHERE id = ?',
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
    console.error('Error fetching payment request image:', error);
    res.status(500).json({ error: 'Failed to fetch payment request image' });
  }
});

export default router; 
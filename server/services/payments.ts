import { pool } from '../db/config';

export interface PaymentRequest {
  id: number;
  project_id: number;
  user_id: number;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_of_payment?: Buffer;
  created_at: Date;
  updated_at: Date;
}

export const createPaymentRequest = async (
  project_id: number,
  user_id: number,
  amount: number,
  description: string,
  proof_of_payment?: Buffer
): Promise<PaymentRequest> => {
  const [result] = await pool.execute(
    'INSERT INTO payment_requests (project_id, user_id, amount, description, proof_of_payment) VALUES (?, ?, ?, ?, ?)',
    [project_id, user_id, amount, description, proof_of_payment]
  );

  const [payment] = await pool.execute(
    'SELECT * FROM payment_requests WHERE id = ?',
    [(result as any).insertId]
  );

  return (payment as any)[0];
};

export const getPaymentRequestById = async (id: number): Promise<PaymentRequest | null> => {
  const [payment] = await pool.execute(
    'SELECT * FROM payment_requests WHERE id = ?',
    [id]
  );

  return (payment as any)[0] || null;
};

export const getPaymentRequestsByProject = async (project_id: number): Promise<PaymentRequest[]> => {
  const [payments] = await pool.execute(
    'SELECT * FROM payment_requests WHERE project_id = ? ORDER BY created_at DESC',
    [project_id]
  );

  return payments as PaymentRequest[];
};

export const getPaymentRequestsByUser = async (user_id: number): Promise<PaymentRequest[]> => {
  const [payments] = await pool.execute(
    'SELECT * FROM payment_requests WHERE user_id = ? ORDER BY created_at DESC',
    [user_id]
  );

  return payments as PaymentRequest[];
};

export const updatePaymentRequestStatus = async (
  id: number,
  status: 'pending' | 'approved' | 'rejected'
): Promise<PaymentRequest | null> => {
  await pool.execute(
    'UPDATE payment_requests SET status = ? WHERE id = ?',
    [status, id]
  );

  return getPaymentRequestById(id);
};

export const deletePaymentRequest = async (id: number): Promise<boolean> => {
  const [result] = await pool.execute(
    'DELETE FROM payment_requests WHERE id = ?',
    [id]
  );

  return (result as any).affectedRows > 0;
}; 
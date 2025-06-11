import { pool } from '../db/config';

export interface Progress {
  id: number;
  project_id: number;
  user_id: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  completion_percentage: number;
  image_proof?: Buffer;
  created_at: Date;
  updated_at: Date;
}

export const createProgress = async (
  project_id: number,
  user_id: number,
  description: string,
  status: 'pending' | 'in_progress' | 'completed',
  completion_percentage: number,
  image_proof?: Buffer
): Promise<Progress> => {
  const [result] = await pool.execute(
    'INSERT INTO progress (project_id, user_id, description, status, completion_percentage, image_proof) VALUES (?, ?, ?, ?, ?, ?)',
    [project_id, user_id, description, status, completion_percentage, image_proof]
  );

  const [progress] = await pool.execute(
    'SELECT * FROM progress WHERE id = ?',
    [(result as any).insertId]
  );

  return (progress as any)[0];
};

export const getProgressById = async (id: number): Promise<Progress | null> => {
  const [progress] = await pool.execute(
    'SELECT * FROM progress WHERE id = ?',
    [id]
  );

  return (progress as any)[0] || null;
};

export const getProgressByProject = async (project_id: number): Promise<Progress[]> => {
  const [progress] = await pool.execute(
    'SELECT * FROM progress WHERE project_id = ? ORDER BY created_at DESC',
    [project_id]
  );

  return progress as Progress[];
};

export const getProgressByUser = async (user_id: number): Promise<Progress[]> => {
  const [progress] = await pool.execute(
    'SELECT * FROM progress WHERE user_id = ? ORDER BY created_at DESC',
    [user_id]
  );

  return progress as Progress[];
};

export const updateProgress = async (
  id: number,
  updates: Partial<Progress>
): Promise<Progress | null> => {
  const allowedUpdates = ['description', 'status', 'completion_percentage', 'image_proof'];
  const updateFields = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .map(key => `${key} = ?`);
  
  if (updateFields.length === 0) return null;

  const values = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .map(key => (updates as any)[key]);

  await pool.execute(
    `UPDATE progress SET ${updateFields.join(', ')} WHERE id = ?`,
    [...values, id]
  );

  return getProgressById(id);
};

export const deleteProgress = async (id: number): Promise<boolean> => {
  const [result] = await pool.execute(
    'DELETE FROM progress WHERE id = ?',
    [id]
  );

  return (result as any).affectedRows > 0;
}; 
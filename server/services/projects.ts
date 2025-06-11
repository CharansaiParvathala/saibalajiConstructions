import { pool } from '../db/config';

export interface Project {
  id: number;
  title: string;
  description: string;
  leader_id: number;
  status: 'active' | 'completed' | 'on_hold';
  start_date: Date;
  end_date: Date;
  created_at: Date;
  updated_at: Date;
}

export const createProject = async (
  title: string,
  description: string,
  leader_id: number,
  start_date: Date,
  end_date: Date
): Promise<Project> => {
  const [result] = await pool.execute(
    'INSERT INTO projects (title, description, leader_id, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
    [title, description, leader_id, start_date, end_date]
  );

  const [projects] = await pool.execute(
    'SELECT * FROM projects WHERE id = ?',
    [(result as any).insertId]
  );

  return (projects as any)[0];
};

export const getProjectById = async (id: number): Promise<Project | null> => {
  const [projects] = await pool.execute(
    'SELECT * FROM projects WHERE id = ?',
    [id]
  );

  return (projects as any)[0] || null;
};

export const getProjectsByLeader = async (leader_id: number): Promise<Project[]> => {
  const [projects] = await pool.execute(
    'SELECT * FROM projects WHERE leader_id = ?',
    [leader_id]
  );

  return projects as Project[];
};

export const updateProject = async (
  id: number,
  updates: Partial<Project>
): Promise<Project | null> => {
  const allowedUpdates = ['title', 'description', 'status', 'start_date', 'end_date'];
  const updateFields = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .map(key => `${key} = ?`);
  
  if (updateFields.length === 0) return null;

  const values = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .map(key => (updates as any)[key]);

  await pool.execute(
    `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`,
    [...values, id]
  );

  return getProjectById(id);
};

export const deleteProject = async (id: number): Promise<boolean> => {
  const [result] = await pool.execute(
    'DELETE FROM projects WHERE id = ?',
    [id]
  );

  return (result as any).affectedRows > 0;
}; 
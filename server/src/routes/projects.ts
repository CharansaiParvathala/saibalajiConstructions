import express from 'express';
import { Database } from '../database/types';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';

export function createProjectsRouter(db: Database) {
  const router = express.Router();

  // Get all projects
  router.get('/', authenticate, async (req, res) => {
    try {
      console.log('GET /api/projects - Fetching all projects');
      const projects = await db.getProjects();
      console.log('Found projects:', projects);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Get project by ID
  router.get('/:id', authenticate, async (req, res) => {
    try {
      console.log('GET /api/projects/:id - Fetching project:', req.params.id);
      const project = await db.getProjectById(req.params.id);
      if (!project) {
        console.log('Project not found:', req.params.id);
        return res.status(404).json({ error: 'Project not found' });
      }
      console.log('Found project:', project);
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  // Create new project
  router.post('/', authenticate, async (req, res) => {
    try {
      console.log('POST /api/projects - Creating new project:', req.body);
      const project = await db.saveProject(req.body);
      console.log('Created project:', project);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Update project
  router.put('/:id', authenticate, async (req, res) => {
    try {
      console.log('PUT /api/projects/:id - Updating project:', req.params.id, req.body);
      await db.updateProject(req.body);
      console.log('Project updated successfully');
      res.status(200).json({ message: 'Project updated successfully' });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Add progress update
  router.post('/:projectId/progress', authenticate, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { description, completedWork } = req.body;
      const userId = req.user.userId;

      // Validate required fields
      if (!description || !completedWork) {
        return res.status(400).json({ message: 'Description and completed work are required' });
      }

      // Check if project exists and user has access
      const [projects] = await pool.query(
        'SELECT * FROM projects WHERE id = ? AND leader_id = ?',
        [projectId, userId]
      );

      if (Array.isArray(projects) && projects.length === 0) {
        return res.status(404).json({ message: 'Project not found or access denied' });
      }

      // Create progress update
      const progressId = uuidv4();
      await pool.query(
        'INSERT INTO progress_updates (id, project_id, description, completed_work, created_at) VALUES (?, ?, ?, ?, ?)',
        [progressId, projectId, description, completedWork, new Date().toISOString()]
      );

      // Update project's completed work
      await pool.query(
        'UPDATE projects SET completed_work = completed_work + ? WHERE id = ?',
        [completedWork, projectId]
      );

      res.status(201).json({
        message: 'Progress updated successfully',
        progressId
      });
    } catch (error) {
      console.error('Error adding progress:', error);
      res.status(500).json({ message: 'Error adding progress update' });
    }
  });

  // Get progress updates for a project
  router.get('/:projectId/progress', authenticate, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      // Check if project exists and user has access
      const [projects] = await pool.query(
        'SELECT * FROM projects WHERE id = ? AND leader_id = ?',
        [projectId, userId]
      );

      if (Array.isArray(projects) && projects.length === 0) {
        return res.status(404).json({ message: 'Project not found or access denied' });
      }

      // Get progress updates
      const [progressUpdates] = await pool.query(
        'SELECT * FROM progress_updates WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );

      res.json(progressUpdates);
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({ message: 'Error getting progress updates' });
    }
  });

  return router;
} 
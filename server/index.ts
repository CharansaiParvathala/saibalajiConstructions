import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import paymentRequestRoutes from './routes/payment-requests';
import progressRoutes from './routes/progress';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment variables
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Auth middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    // Add your token verification logic here
    // For now, we'll just pass the token through
    (req as any).token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Mount routes
console.log('Mounting auth routes...');
app.use('/api/auth', authRoutes);

// Add current-user endpoint
app.get('/api/auth/current-user', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const token = (req as any).token;
    // Add your user lookup logic here
    // For now, return a mock user
    res.json({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'leader'
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
});

app.use('/api/projects', projectRoutes);
app.use('/api/payment-requests', paymentRequestRoutes);
app.use('/api/progress', progressRoutes);

// Projects routes
app.post('/api/projects', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    console.log('POST /api/projects - Creating new project:', req.body);
    
    // Validate required fields
    const { title, description, leader_id, total_work } = req.body;
    
    if (!title || !description || !leader_id || !total_work) {
      console.log('Missing fields:', { title, description, leader_id, total_work });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          title: !title,
          description: !description,
          leader_id: !leader_id,
          total_work: !total_work
        }
      });
    }

    // Create project object
    const project = {
      title,
      description,
      leader_id: Number(leader_id),
      total_work: Number(total_work),
      completed_work: 0,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0]
    };

    console.log('Creating project with data:', project);

    // Add your database insertion logic here
    // For now, return the project object
    res.status(201).json({
      ...project,
      id: Math.floor(Math.random() * 1000), // Temporary ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack
  });
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api`);
  console.log('Available routes:');
  console.log('- POST /api/auth/register');
  console.log('- POST /api/auth/login');
  console.log('- GET /api/auth/current-user');
  console.log('- POST /api/auth/logout');
  console.log('- GET /api/auth/test-db');
  console.log('- GET /api/projects');
  console.log('- GET /api/projects/:id');
  console.log('- POST /api/projects');
  console.log('- PUT /api/projects/:id');
  console.log('- DELETE /api/projects/:id');
  console.log('- GET /api/payment-requests');
  console.log('- GET /api/payment-requests/project/:projectId');
  console.log('- POST /api/payment-requests');
  console.log('- PUT /api/payment-requests/:id/status');
  console.log('- GET /api/payment-requests/:id/history');
  console.log('- GET /api/progress/project/:projectId');
  console.log('- POST /api/progress');
}); 
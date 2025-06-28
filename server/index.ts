import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import paymentRequestRoutes from './routes/payment-requests';
import progressRoutes from './routes/progress';
import finalSubmissionRoutes from './routes/final-submissions';
import driversRoutes from './routes/drivers';
import backupLinksRoutes from './routes/backup-links';
import { pool } from './db/config';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment variables
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

// Database initialization function
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Create drivers table if it doesn't exist
    const createDriversTable = `
      CREATE TABLE IF NOT EXISTS drivers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(15) NOT NULL,
        license_number VARCHAR(50) NOT NULL,
        license_type VARCHAR(50) NOT NULL,
        license_image LONGBLOB,
        license_image_name VARCHAR(255),
        license_image_mime VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createDriversTable);
    console.log('Drivers table initialized successfully');
    
    // Migrate existing table to remove project_id if it exists
    try {
      console.log('Checking for project_id column in drivers table...');
      const [columns] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'progress_tracker' 
        AND TABLE_NAME = 'drivers' 
        AND COLUMN_NAME = 'project_id'
      `);
      
      if ((columns as any[])[0].count > 0) {
        console.log('Removing project_id column from drivers table...');
        // First try to remove foreign key constraint if it exists
        try {
          await pool.query('ALTER TABLE drivers DROP FOREIGN KEY drivers_ibfk_1');
        } catch (fkError) {
          console.log('No foreign key constraint found or already removed');
        }
        
        // Remove the project_id column
        await pool.query('ALTER TABLE drivers DROP COLUMN project_id');
        console.log('Successfully removed project_id column from drivers table');
      } else {
        console.log('project_id column does not exist in drivers table');
      }
    } catch (migrationError) {
      console.error('Migration error:', migrationError);
    }
    
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.vercel.app', 'https://your-domain.vercel.app'] 
    : true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api/final-submissions', finalSubmissionRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/backup-links', backupLinksRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Health check route for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Initialize database and start server only if not in Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    console.log(`API available at http://localhost:${port}/api`);
    
    // Initialize database tables
    await initializeDatabase();
    
    console.log('Available routes:');
    console.log('- POST /api/auth/register');
    console.log('- POST /api/auth/login');
    console.log('- GET /api/auth/current-user');
    console.log('- POST /api/auth/logout');
    console.log('- GET /api/auth/test-db');
    console.log('- GET /api/projects');
    console.log('- GET /api/projects/:id');
    console.log('- GET /api/payment-requests');
    console.log('- GET /api/payment-requests/project/:projectId');
    console.log('- POST /api/payment-requests');
    console.log('- PUT /api/payment-requests/:id/status');
    console.log('- GET /api/payment-requests/:id/history');
    console.log('- GET /api/progress/project/:projectId');
    console.log('- POST /api/progress');
    console.log('- GET /api/drivers');
    console.log('- POST /api/drivers');
    console.log('- PUT /api/drivers/:id');
    console.log('- DELETE /api/drivers/:id');
    console.log('- GET /api/backup-links');
    console.log('- POST /api/backup-links');
    console.log('- PUT /api/backup-links/:id');
    console.log('- GET /api/backup-links/:id');
  });
} else {
  // Initialize database for Vercel
  initializeDatabase().then(() => {
    console.log('Database initialized for Vercel deployment');
  }).catch((error) => {
    console.error('Failed to initialize database for Vercel:', error);
  });
}

// Export for Vercel
export default app; 
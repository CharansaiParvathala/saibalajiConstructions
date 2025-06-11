import express, { Request, Response } from 'express';
import cors from 'cors';
import { MemoryDatabase } from './database/memory-database';
import { Database } from './database/types';
import { createAuthRouter } from './routes/auth';
import { StorageService } from './services/storage-service';

const app = express();
const port = process.env.PORT || 3000;

// Initialize database and storage
const db: Database = new MemoryDatabase();
const storage = StorageService.getInstance();

// Middleware
app.use(cors({
  exposedHeaders: ['x-user-id']
}));
app.use(express.json());

// Auth routes
app.use('/api/auth', createAuthRouter(db));

// Authentication middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await db.getUserById(userId as string);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Add user to request for use in routes
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Protected routes
app.use('/api/projects', authenticate);
app.use('/api/payment-requests', authenticate);
app.use('/api/progress-updates', authenticate);
app.use('/api/vehicles', authenticate);
app.use('/api/drivers', authenticate);
app.use('/api/users', authenticate);

// Projects routes
app.get('/api/projects', async (req: Request, res: Response) => {
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

app.get('/api/projects/:id', async (req: Request, res: Response) => {
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

app.post('/api/projects', async (req: Request, res: Response) => {
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

app.put('/api/projects/:id', async (req: Request, res: Response) => {
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

// Payment Requests routes
app.get('/api/payment-requests', async (req: Request, res: Response) => {
  try {
    const paymentRequests = await db.getPaymentRequests();
    res.json(paymentRequests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

app.post('/api/payment-requests', async (req: Request, res: Response) => {
  try {
    const paymentRequest = await db.savePaymentRequest(req.body);
    res.status(201).json(paymentRequest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

// Progress Updates routes
app.get('/api/progress-updates', async (req: Request, res: Response) => {
  try {
    const updates = await db.getProgressUpdates();
    res.json(updates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress updates' });
  }
});

app.post('/api/progress-updates', async (req: Request, res: Response) => {
  try {
    await db.addProgressUpdate(req.body);
    res.status(201).json({ message: 'Progress update added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add progress update' });
  }
});

// Vehicles routes
app.get('/api/vehicles', async (req: Request, res: Response) => {
  try {
    const vehicles = await db.getAllVehicles();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.post('/api/vehicles', async (req: Request, res: Response) => {
  try {
    const vehicle = await db.createVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// Drivers routes
app.get('/api/drivers', async (req: Request, res: Response) => {
  try {
    const drivers = await db.getAllDrivers();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

app.post('/api/drivers', async (req: Request, res: Response) => {
  try {
    const driver = await db.createDriver(req.body);
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Users routes
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const user = await db.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 
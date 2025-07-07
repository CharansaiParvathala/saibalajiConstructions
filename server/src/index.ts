import express, { Request, Response } from 'express';
import cors from 'cors';
import { MemoryDatabase } from './database/memory-database';
import { Database } from './database/types';
import { createAuthRouter } from './routes/auth';
import { StorageService } from './services/storage-service';
import { uploadMemory } from './services/file-upload';

const app = express();
const port = process.env.PORT || 3001;

// Initialize database and storage
const db: Database = new MemoryDatabase();
const storage = StorageService.getInstance();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-user-id']
}));

// Parse JSON bodies
app.use(express.json());

// Auth routes
app.use('/api/auth', createAuthRouter(db));

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
    
    // Validate required fields
    const { name, leaderId, workers, totalWork, completedWork, description } = req.body;
    if (!name || !leaderId || !workers || !totalWork || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create project object
    const project = {
      name,
      leaderId,
      workers: parseInt(workers),
      totalWork: parseFloat(totalWork),
      completedWork: completedWork || 0,
      status: 'pending' as const,
      description
    };

    const savedProject = await db.saveProject(project);
    console.log('Created project:', savedProject);
    res.status(201).json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Authentication middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
      console.error('Token decoding error:', error);
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Add user to request for use in routes
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Protected routes middleware
app.use('/api/projects', authenticate);

// Projects routes
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

// Add a new driver (admin, with license image upload)
app.post('/api/drivers', uploadMemory.single('license_image'), async (req: Request, res: Response) => {
  try {
    const { name, mobile_number, license_number, license_type, project_id } = req.body;
    const license_file = req.file;
    // Helper to get extension from originalname
    function getExtension(filename) {
      return filename ? filename.split('.').pop() : '';
    }
    const license_image_name = license_file ? `${name}_license.${getExtension(license_file.originalname)}` : null;
    const license_image_mime = license_file ? license_file.mimetype : null;
    const license_image = license_file ? license_file.buffer : null;
    if (!name || !mobile_number || !license_number || !license_type || !project_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const driverData = {
      name,
      mobile_number,
      license_number,
      license_type,
      license_image,
      license_image_name,
      license_image_mime,
      project_id
    };
    const driver = await db.createDriver(driverData);
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Serve license image for a driver
app.get('/api/drivers/:id/license_image', async (req: Request, res: Response) => {
  try {
    const driver = await db.getDriverById(req.params.id);
    if (!driver || !driver.license_image) {
      return res.status(404).send('Not found');
    }
    res.set('Content-Type', driver.license_image_mime || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${driver.license_image_name || 'license_image'}"`);
    res.send(driver.license_image);
  } catch (error) {
    res.status(500).send('Error retrieving image');
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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 
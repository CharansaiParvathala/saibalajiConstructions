import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/config';
import multer from 'multer';

const router = express.Router();

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT 1');
    res.json({ message: 'Database connection successful', result });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: (result as any).insertId, role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: {
        id: (result as any).insertId,
        name,
        email,
        role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0] as any;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/current-user', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: number;
      role: string;
    };

    const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout user
router.post('/logout', (req: Request, res: Response) => {
  // Since we're using JWT, we don't need to do anything on the server
  // The client should remove the token
  res.status(200).json({ message: 'Logged out successfully' });
});

// Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role, mobile_number, created_at, updated_at FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', (error as Error).message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Create new user (does not affect login/signup logic)
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, mobileNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, mobile_number) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, mobileNumber || null]
    );

    res.status(201).json({
      id: (result as any).insertId,
      name,
      email,
      role,
      mobileNumber
    });
  } catch (error) {
    console.error('Admin create user error:', (error as Error).message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Reset user password to 'pass' (admin action)
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const newPassword = 'pass';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password reset to default.' });
  } catch (error) {
    console.error('Reset password error:', (error as Error).message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Update user (admin action)
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { name, email, role, mobileNumber } = req.body;

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ?, mobile_number = ? WHERE id = ?',
      [name, email, role, mobileNumber || null, userId]
    );

    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error('Update user error:', (error as Error).message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all vehicles
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const [vehicles] = await pool.query('SELECT id, type, model, rc_image, rc_image_mime, rc_image_name, rc_expiry, pollution_cert_image, pollution_cert_expiry, fitness_cert_image, fitness_cert_expiry, created_at, updated_at FROM vehicles');
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', (error as Error).message);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Add a new vehicle (admin)
router.post('/vehicles', upload.fields([
  { name: 'rc_image', maxCount: 1 },
  { name: 'pollution_cert_image', maxCount: 1 },
  { name: 'fitness_cert_image', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const { type, model, rc_expiry, pollution_cert_expiry, fitness_cert_expiry } = req.body;
    const rc_file = req.files && (req.files as any)['rc_image'] ? (req.files as any)['rc_image'][0] : null;
    const pollution_file = req.files && (req.files as any)['pollution_cert_image'] ? (req.files as any)['pollution_cert_image'][0] : null;
    const fitness_file = req.files && (req.files as any)['fitness_cert_image'] ? (req.files as any)['fitness_cert_image'][0] : null;

    // Helper to get extension from originalname
    function getExtension(filename) {
      return filename ? filename.split('.').pop() : '';
    }

    // Compose file names as type_model_certtype.extension
    const rc_ext = rc_file ? getExtension(rc_file.originalname) : '';
    const rc_image_name = rc_file ? `${type}_${model}_rc${rc_ext ? '.' + rc_ext : ''}` : null;
    const rc_image_mime = rc_file ? rc_file.mimetype : null;
    const rc_image = rc_file ? rc_file.buffer : null;

    const pollution_ext = pollution_file ? getExtension(pollution_file.originalname) : '';
    const pollution_cert_image_name = pollution_file ? `${type}_${model}_pollution${pollution_ext ? '.' + pollution_ext : ''}` : null;
    const pollution_cert_image_mime = pollution_file ? pollution_file.mimetype : null;
    const pollution_cert_image = pollution_file ? pollution_file.buffer : null;

    const fitness_ext = fitness_file ? getExtension(fitness_file.originalname) : '';
    const fitness_cert_image_name = fitness_file ? `${type}_${model}_fitness${fitness_ext ? '.' + fitness_ext : ''}` : null;
    const fitness_cert_image_mime = fitness_file ? fitness_file.mimetype : null;
    const fitness_cert_image = fitness_file ? fitness_file.buffer : null;

    // Debug log
    console.log('Received vehicle fields:', req.body);
    console.log('Received files:', Object.keys(req.files || {}));

    if (!type || !model) {
      return res.status(400).json({ 
        error: 'Type and model are required',
        receivedFields: req.body,
        receivedFiles: Object.keys(req.files || {})
      });
    }

    const [result] = await pool.query(
      `INSERT INTO vehicles (
        type, model,
        rc_image, rc_image_mime, rc_image_name, rc_expiry,
        pollution_cert_image, pollution_cert_image_mime, pollution_cert_image_name, pollution_cert_expiry,
        fitness_cert_image, fitness_cert_image_mime, fitness_cert_image_name, fitness_cert_expiry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type, model,
        rc_image, rc_image_mime, rc_image_name, rc_expiry || null,
        pollution_cert_image, pollution_cert_image_mime, pollution_cert_image_name, pollution_cert_expiry || null,
        fitness_cert_image, fitness_cert_image_mime, fitness_cert_image_name, fitness_cert_expiry || null
      ]
    );

    res.status(201).json({
      id: (result as any).insertId,
      type,
      model,
      rc_expiry,
      pollution_cert_expiry,
      fitness_cert_expiry
    });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).json({ 
      error: 'Failed to add vehicle',
      errorMessage: (error as Error).message,
      receivedFields: req.body,
      receivedFiles: Object.keys(req.files || {})
    });
  }
});

// Serve RC image for a vehicle
router.get('/vehicles/:id/rc_image', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT rc_image, rc_image_mime, rc_image_name FROM vehicles WHERE id = ?',
      [req.params.id]
    );
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].rc_image) {
      return res.status(404).send('Not found');
    }
    res.set('Content-Type', rows[0].rc_image_mime || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${rows[0].rc_image_name || 'rc_image'}"`);
    res.send(rows[0].rc_image);
  } catch (error) {
    res.status(500).send('Error retrieving image');
  }
});

// Serve Pollution Certificate image for a vehicle
router.get('/vehicles/:id/pollution_cert_image', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT pollution_cert_image, pollution_cert_image_mime, pollution_cert_image_name FROM vehicles WHERE id = ?',
      [req.params.id]
    );
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].pollution_cert_image) {
      return res.status(404).send('Not found');
    }
    res.set('Content-Type', rows[0].pollution_cert_image_mime || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${rows[0].pollution_cert_image_name || 'pollution_cert_image'}"`);
    res.send(rows[0].pollution_cert_image);
  } catch (error) {
    res.status(500).send('Error retrieving image');
  }
});

// Serve Fitness Certificate image for a vehicle
router.get('/vehicles/:id/fitness_cert_image', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT fitness_cert_image, fitness_cert_image_mime, fitness_cert_image_name FROM vehicles WHERE id = ?',
      [req.params.id]
    );
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].fitness_cert_image) {
      return res.status(404).send('Not found');
    }
    res.set('Content-Type', rows[0].fitness_cert_image_mime || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${rows[0].fitness_cert_image_name || 'fitness_cert_image'}"`);
    res.send(rows[0].fitness_cert_image);
  } catch (error) {
    res.status(500).send('Error retrieving image');
  }
});

// Delete a vehicle by ID
router.delete('/vehicles/:id', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const [result] = await pool.query('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router; 
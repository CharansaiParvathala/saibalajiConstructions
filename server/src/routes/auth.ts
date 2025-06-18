import { Router } from 'express';
import { Database } from '../database/types';
import { User } from '../../src/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function createAuthRouter(db: Database) {
  const router = Router();

  // Get current user
  router.get('/current-user', async (req, res) => {
    try {
      // In a real app, you would get the user from the session/token
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await db.getUserById(userId as string);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't send password back to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get current user' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      console.log('Login request received:', req.body);
      const { email, password } = req.body;

      if (!email || !password) {
        console.error('Missing email or password');
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // In a real app, you would validate credentials properly
      // For this demo, determine role from the email
      let role: User['role'] = 'leader';
      
      if (email.includes('admin')) {
        role = 'admin';
      } else if (email.includes('checker')) {
        role = 'checker';
      } else if (email.includes('owner')) {
        role = 'owner';
      }

      // Create or get user
      const users = await db.getUsers();
      let user = users.find(u => u.email === email);

      if (!user) {
        console.log('Creating new user for:', email);
        user = await db.createUser({
          name: email.split('@')[0],
          email,
          password: password || '',
          role,
        });
      }

      // Generate a simple token (in a real app, use proper JWT)
      const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString('base64');

      // Don't send password back to client
      const { password: _, ...userWithoutPassword } = user;
      
      console.log('Login successful for user:', userWithoutPassword);
      res.json({
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    // In a real app, you would invalidate the session/token here
    res.status(200).json({ message: 'Logged out successfully' });
  });

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { name, email, password, phone, role } = req.body;

      // Check if user already exists
      const users = await db.getUsers();
      if (users.some(u => u.email === email)) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user
      const user = await db.createUser({
        name,
        email,
        password,
        role: role || 'leader',
        mobileNumber: phone
      });

      // Generate token
      const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString('base64');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mobileNumber: user.mobileNumber
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  });

  return router;
} 
const express = require('express');
const { pool } = require('../db/config');
const { registerUser, loginUser, getUserById, verifyToken } = require('../services/auth');

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
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      console.log('Missing required fields:', { email: !!email, password: !!password, name: !!name, role: !!role });
      return res.status(400).json({ error: 'All fields are required' });
    }

    console.log('Attempting to register user:', { email, name, role });
    const result = await registerUser(email, password, name, role);
    console.log('Registration successful:', { userId: result.user.id });
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message,
      code: error.code
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Attempting to login user:', { email });
    const result = await loginUser(email, password);
    if (!result) {
      console.log('Invalid credentials for:', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Login successful:', { userId: result.user.id });
    res.json(result);
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message,
      code: error.code
    });
  }
});

// Get current user
router.get('/current-user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Invalid token provided');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Fetching user:', { userId: decoded.id });
    const user = await getUserById(decoded.id);
    if (!user) {
      console.log('User not found:', { userId: decoded.id });
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User fetched successfully:', { userId: user.id });
    res.json(user);
  } catch (error) {
    console.error('Get current user error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to get current user',
      message: error.message,
      code: error.code
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 
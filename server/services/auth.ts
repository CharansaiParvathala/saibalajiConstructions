const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/config');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'leader' | 'member';
  profile_image?: Buffer;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Register a new user
async function registerUser(email: string, password: string, name: string, role: string, mobile_number?: string) {
  try {
    console.log('Registering user:', { email, name, role, mobile_number });

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (email, password, name, role, mobile_number) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, name, role, mobile_number || null]
    );

    const userId = result.insertId;
    console.log('User created successfully:', { userId });

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      user: {
        id: userId,
        email,
        name,
        role,
        mobile_number
      },
      token
    };
  } catch (error) {
    console.error('Registration error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Login user
async function loginUser(email: string, password: string) {
  try {
    console.log('Login attempt for:', email);

    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];
    console.log('User found:', { userId: user.id });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    };
  } catch (error) {
    console.error('Login error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Get user by ID
async function getUserById(id: string) {
  try {
    console.log('Fetching user by ID:', { id });

    const [users] = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [id]
    );

    if (!Array.isArray(users) || users.length === 0) {
      console.log('User not found:', { id });
      return null;
    }

    const user = users[0];
    console.log('User found:', { userId: user.id });
    return user;
  } catch (error) {
    console.error('Get user error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Verify JWT token
function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    console.error('Token verification error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code,
      stack: error instanceof Error ? error.stack : undefined
    });
    return { valid: false, error };
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  verifyToken
}; 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/config');
import dotenv from 'dotenv';
import path from 'path';

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

async function registerUser(email, password, name, role) {
  try {
    console.log('Starting user registration:', { email, name, role });
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      console.log('User already exists:', { email });
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');

    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role]
    );

    const userId = result.insertId;
    console.log('User created successfully:', { userId });

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('JWT token generated');

    // Get the created user
    const [users] = await pool.execute(
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];
    console.log('User fetched after creation:', { userId: user.id });

    return {
      user,
      token
    };
  } catch (error) {
    console.error('Registration error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

async function loginUser(email, password) {
  try {
    console.log('Starting user login:', { email });
    
    // Get user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.log('User not found:', { email });
      return null;
    }

    const user = users[0];
    console.log('User found:', { userId: user.id });

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for user:', { email });
      return null;
    }
    console.log('Password verified successfully');

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('JWT token generated');

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

async function getUserById(id) {
  try {
    console.log('Fetching user by ID:', { id });
    const [users] = await pool.execute(
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      console.log('User not found:', { id });
      return null;
    }

    console.log('User found:', { userId: users[0].id });
    return users[0];
  } catch (error) {
    console.error('Get user error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

function verifyToken(token) {
  try {
    console.log('Verifying token');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully:', { userId: decoded.id });
    return decoded;
  } catch (error) {
    console.error('Token verification error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return null;
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  verifyToken
}; 
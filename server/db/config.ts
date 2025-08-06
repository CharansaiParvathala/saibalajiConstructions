import mysql from 'mysql2/promise';
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('Missing environment variables:', missingEnvVars.join(', '));
  console.warn('Using default values - this may cause connection issues in production');
}

// Database configuration with improved error handling
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1', // Changed from 192.168.165.1 to localhost
  port: parseInt(process.env.DB_PORT || '3306'), // Changed from 55000 to standard MySQL port
  user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'progress_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000, // 60 seconds
  timeout: 60000, // 60 seconds
  reconnect: true,
  ssl: process.env.DB_SSL_CA ? {
    ca: fs.readFileSync(process.env.DB_SSL_CA)
  } : false // Explicitly set to false if no SSL
};

console.log('Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  ssl: !!dbConfig.ssl
});

// Create connection pool with error handling
export const pool = mysql.createPool(dbConfig);

// Enhanced connection test with retry logic
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('Database connected successfully');
      connection.release();
      return true;
    } catch (err: any) {
      console.error(`Database connection attempt ${i + 1} failed:`, err.message);
      
      if (i === retries - 1) {
        console.error('All database connection attempts failed');
        console.error('Please ensure that:');
        console.error('1. MySQL server is running');
        console.error('2. The database credentials are correct');
        console.error('3. The database exists');
        console.error('4. The host and port are accessible');
        console.error('5. Check your .env file for correct DB_* variables');
        
        // Don't exit the process, let the application handle the error gracefully
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

// Test connection on startup
testConnection().catch(err => {
  console.error('Failed to establish database connection:', err);
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to database...');
  }
});
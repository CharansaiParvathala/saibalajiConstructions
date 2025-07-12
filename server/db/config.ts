import mysql from 'mysql2/promise';
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Database configuration for CodeSandbox
const dbConfig = {
  host: process.env.DB_HOST || '192.168.165.1',
  port: parseInt(process.env.DB_PORT || '55000'),
  user: process.env.DB_USER || 'remoteuser',
  password: process.env.DB_PASSWORD || 'password@553034',
  database: process.env.DB_NAME || 'progress_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Attempting to connect to database with config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
  .then((connection: any) => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch((err: Error) => {
    console.error('Error connecting to the database:*****', err,'*****');
    console.error('Please ensure that:');
    console.error('1. MySQL server is running');
    console.error('2. The database credentials are correct');
    console.error('3. The database exists');
    console.error('4. The port is accessible');
    process.exit(1);
  });
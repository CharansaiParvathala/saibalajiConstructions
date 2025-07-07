const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function runMigration() {
  let connection;
  
  try {
    // Use the same database config as the main application
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'progress_tracker',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    
    console.log('Database config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to database');
    
    // Create tender_images table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tender_images (
        id INT PRIMARY KEY AUTO_INCREMENT,
        section VARCHAR(50) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        image LONGBLOB NOT NULL,
        serial_number INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_section_serial (section, serial_number)
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ tender_images table created successfully');
    
    // Add indexes
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_tender_images_section ON tender_images(section)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_tender_images_serial ON tender_images(serial_number)');
    console.log('✅ Indexes created successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration(); 
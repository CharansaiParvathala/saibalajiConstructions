-- Migration to create tender_images table
USE progress_tracker;

-- Create tender_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS tender_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    section VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    image LONGBLOB NOT NULL,
    serial_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_section_serial (section, serial_number)
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_tender_images_section ON tender_images(section);
CREATE INDEX IF NOT EXISTS idx_tender_images_serial ON tender_images(serial_number); 
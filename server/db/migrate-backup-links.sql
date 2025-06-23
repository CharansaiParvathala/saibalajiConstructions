-- Migration script to create backup_links table
-- Run this script to add the backup_links table to your database

USE progress_tracker;

-- Create backup_links table
CREATE TABLE IF NOT EXISTS backup_links (
    id INT PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_backup_links_created_by ON backup_links(created_by);
CREATE INDEX IF NOT EXISTS idx_backup_links_created_at ON backup_links(created_at);

-- Insert some sample backup links for testing
INSERT INTO backup_links (url, description, created_by) VALUES
('https://drive.google.com/drive/folders/backup1', 'Google Drive Backup - Project Documents', 1),
('https://dropbox.com/sh/backup2', 'Dropbox Backup - Progress Images', 1),
('https://onedrive.live.com/backup3', 'OneDrive Backup - Payment Records', 1),
('https://mega.nz/backup4', 'Mega Backup - Vehicle Certificates', 1);

SELECT 'Backup links table created successfully!' as message; 
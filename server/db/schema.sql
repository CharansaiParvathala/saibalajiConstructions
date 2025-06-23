CREATE DATABASE IF NOT EXISTS progress_tracker;
USE progress_tracker;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15),
    role ENUM('admin', 'leader', 'checker', 'owner') NOT NULL DEFAULT 'leader',
    profile_image LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id INT NOT NULL,
    status ENUM('active', 'pending', 'completed', 'cancelled') DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    total_work DECIMAL(10,2) DEFAULT 0,
    completed_work DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id INT,
    user_id INT,
    role ENUM('leader', 'member', 'checker') NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    completed_work DECIMAL(10,2) DEFAULT 0,
    image_proof TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    vehicle_id INT NULL,
    driver_id INT NULL,
    is_external_driver BOOLEAN DEFAULT FALSE,
    external_driver_name VARCHAR(255),
    external_driver_license_type VARCHAR(100),
    external_driver_mobile_number VARCHAR(20),
    start_meter_image_id INT NULL,
    end_meter_image_id INT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id),
    FOREIGN KEY (start_meter_image_id) REFERENCES progress_images(id),
    FOREIGN KEY (end_meter_image_id) REFERENCES progress_images(id)
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'scheduled', 'paid') DEFAULT 'pending',
    description TEXT,
    progress_id INT,
    proof_of_payment LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (progress_id) REFERENCES progress(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_request_expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_request_id INT NOT NULL,
    expense_type ENUM('food', 'fuel', 'labour', 'vehicle', 'water', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_request_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_request_id INT NOT NULL,
    expense_id INT,
    image_url VARCHAR(255) NOT NULL,
    image_data LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_id) REFERENCES payment_request_expenses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_request_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_request_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'scheduled', 'paid') NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS progress_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    progress_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    image_data LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (progress_id) REFERENCES progress(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('truck', 'tractor', 'jcb', 'other') NOT NULL,
    model VARCHAR(255) NOT NULL,
    rc_image LONGBLOB,
    rc_expiry DATE,
    pollution_cert_image LONGBLOB,
    pollution_cert_expiry DATE,
    fitness_cert_image LONGBLOB,
    fitness_cert_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    rc_image_mime VARCHAR(64),
    rc_image_name VARCHAR(255),
    pollution_cert_image_mime VARCHAR(64),
    pollution_cert_image_name VARCHAR(255),
    fitness_cert_image_mime VARCHAR(64),
    fitness_cert_image_name VARCHAR(255)
);

-- Add image_url column to progress table if it doesn't exist
ALTER TABLE progress
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

-- Add image_proof column to progress table if it doesn't exist
ALTER TABLE progress
ADD COLUMN IF NOT EXISTS image_proof TEXT;

-- Add completion_percentage column to progress table if it doesn't exist
ALTER TABLE progress
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0;

-- Update status column in projects table to use ENUM
ALTER TABLE projects
MODIFY COLUMN status ENUM('active', 'pending', 'completed', 'cancelled') DEFAULT 'active';

-- Update status column in progress table to use ENUM
ALTER TABLE progress
MODIFY COLUMN status ENUM('pending', 'completed') DEFAULT 'pending';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_progress_project ON progress(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_images_progress ON progress_images(progress_id);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    license_image LONGBLOB,
    license_image_name VARCHAR(255),
    license_image_mime VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
                                                  -- Migration script to update payment_requests for expense tracking
-- Run this script to update your existing database

USE progress_tracker;

-- Add user_id column to payment_requests if it doesn't exist
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS user_id INT NOT NULL AFTER project_id;

-- Add foreign key for user_id if it doesn't exist
ALTER TABLE payment_requests 
ADD CONSTRAINT fk_payment_requests_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Rename amount column to total_amount if it exists
ALTER TABLE payment_requests 
CHANGE COLUMN amount total_amount DECIMAL(10,2) NOT NULL;

-- Add image_data column to payment_request_images if it doesn't exist
ALTER TABLE payment_request_images 
ADD COLUMN IF NOT EXISTS image_data LONGBLOB NOT NULL AFTER image_url;

-- Add expense_id column to payment_request_images if it doesn't exist
ALTER TABLE payment_request_images 
ADD COLUMN IF NOT EXISTS expense_id INT AFTER payment_request_id;

-- Add foreign key for expense_id if it doesn't exist
ALTER TABLE payment_request_images 
ADD CONSTRAINT fk_payment_request_images_expense 
FOREIGN KEY (expense_id) REFERENCES payment_request_expenses(id) ON DELETE SET NULL;

-- Create payment_request_expenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_request_expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_request_id INT NOT NULL,
    expense_type ENUM('food', 'fuel', 'labour', 'vehicle', 'water', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_project ON payment_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_expenses_request ON payment_request_expenses(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_images_request ON payment_request_images(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_images_expense ON payment_request_images(expense_id);

-- Update existing payment_requests to have user_id (if any exist)
-- This assumes the leader_id from projects table
UPDATE payment_requests pr 
JOIN projects p ON pr.project_id = p.id 
SET pr.user_id = p.leader_id 
WHERE pr.user_id IS NULL OR pr.user_id = 0; 
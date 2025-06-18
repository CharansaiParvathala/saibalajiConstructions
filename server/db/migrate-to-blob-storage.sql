-- Migration script to move from local file storage to database BLOB storage
-- Run this script after updating your application code

USE progress_tracker;

-- Add image_data column to progress_images table if it doesn't exist
ALTER TABLE progress_images 
ADD COLUMN IF NOT EXISTS image_data LONGBLOB NOT NULL AFTER image_url;

-- Add image_data column to payment_request_images table if it doesn't exist
ALTER TABLE payment_request_images 
ADD COLUMN IF NOT EXISTS image_data LONGBLOB NOT NULL AFTER image_url;

-- Update the schema to make image_data required
ALTER TABLE progress_images 
MODIFY COLUMN image_data LONGBLOB NOT NULL;

ALTER TABLE payment_request_images 
MODIFY COLUMN image_data LONGBLOB NOT NULL;

-- Note: Existing records will need to be handled manually or through a data migration script
-- since we can't automatically convert local file paths to BLOB data

-- Create indexes for better performance with BLOB data
CREATE INDEX IF NOT EXISTS idx_progress_images_progress_id ON progress_images(progress_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_images_request_id ON payment_request_images(payment_request_id);

-- Optional: Clean up old local files (run this after confirming data migration is complete)
-- This is commented out for safety - uncomment only after testing
/*
-- Remove old local file references (keep the actual files for backup)
UPDATE progress_images SET image_url = CONCAT('/progress-images/', progress_id, '/', SUBSTRING_INDEX(image_url, '/', -1)) 
WHERE image_url LIKE '/uploads/%';

UPDATE payment_request_images SET image_url = CONCAT('/payment-request-images/', payment_request_id, '/', SUBSTRING_INDEX(image_url, '/', -1)) 
WHERE image_url LIKE '/uploads/%';
*/ 
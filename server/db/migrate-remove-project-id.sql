-- Migration to remove project_id from drivers table
USE progress_tracker;

-- Check if project_id column exists before trying to remove it
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'progress_tracker' 
     AND TABLE_NAME = 'drivers' 
     AND COLUMN_NAME = 'project_id') > 0,
    'ALTER TABLE drivers DROP COLUMN project_id',
    'SELECT "project_id column does not exist" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 
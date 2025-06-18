-- Check and create final_submissions tables if they don't exist
USE progress_tracker;

-- Check if final_submissions table exists
SELECT COUNT(*) as table_exists FROM information_schema.tables 
WHERE table_schema = 'progress_tracker' AND table_name = 'final_submissions';

-- Create final_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS final_submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  leader_id INT NOT NULL,
  submission_date TIMESTAMP NOT NULL,
  timer_duration INT NOT NULL DEFAULT 600,
  timer_started_at TIMESTAMP,
  timer_ended_at TIMESTAMP,
  status ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create final_submission_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS final_submission_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  final_submission_id INT NOT NULL,
  image_data LONGBLOB NOT NULL,
  image_url VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (final_submission_id) REFERENCES final_submissions(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_final_submissions_project ON final_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_final_submissions_leader ON final_submissions(leader_id);
CREATE INDEX IF NOT EXISTS idx_final_submission_images_submission ON final_submission_images(final_submission_id);

-- Show table structure
DESCRIBE final_submissions;
DESCRIBE final_submission_images; 
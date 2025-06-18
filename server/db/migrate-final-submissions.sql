-- Use the correct database
USE progress_tracker;

-- Drop the existing final_submissions table if it exists
DROP TABLE IF EXISTS final_submission_images;
DROP TABLE IF EXISTS final_submissions;

-- Create the updated final_submissions table with all required fields
CREATE TABLE final_submissions (
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


-- Create table for final submission images
CREATE TABLE final_submission_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  final_submission_id INT NOT NULL,
  image_data LONGBLOB NOT NULL,
  image_url VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (final_submission_id) REFERENCES final_submissions(id) ON DELETE CASCADE
);


-- Add indexes for better performance
CREATE INDEX idx_final_submissions_project ON final_submissions(project_id);
CREATE INDEX idx_final_submissions_leader ON final_submissions(leader_id);
CREATE INDEX idx_final_submission_images_submission ON final_submission_images(final_submission_id);

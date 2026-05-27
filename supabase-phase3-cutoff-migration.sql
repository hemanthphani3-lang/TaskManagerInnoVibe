-- Add cutoff_time to departments table
ALTER TABLE departments ADD COLUMN IF NOT EXISTS check_in_cutoff_time TIME DEFAULT '09:30:00';

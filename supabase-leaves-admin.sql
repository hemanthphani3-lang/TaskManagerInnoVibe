-- SQL migration: Leave Requests Table Constraints & Columns Fix
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- 1. Add missing rejection_reason column to leave_requests if not exists
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Drop the foreign key referencing employees(id) so Department Heads can apply
ALTER TABLE leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;

-- 3. Reference auth.users(id) instead, so any registered user can submit a leave request
ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Drop the foreign key referencing departments(id) on approved_by
ALTER TABLE leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_approved_by_fkey;

-- 5. Reference auth.users(id) instead, allowing Admins (or other roles) to approve
ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Make department_id nullable for Department Head leaves
ALTER TABLE leave_requests 
ALTER COLUMN department_id DROP NOT NULL;

COMMIT;

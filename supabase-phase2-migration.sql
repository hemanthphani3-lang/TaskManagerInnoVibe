-- Phase 2 Database Schema Updates
-- Run this in your Supabase SQL Editor

-- 1. Update Admins Table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- 2. Update Departments Table
ALTER TABLE departments RENAME COLUMN email TO department_email;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS department_head_name TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS department_code TEXT UNIQUE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES admins(id) ON DELETE SET NULL;

-- 3. Update Employees Table
ALTER TABLE employees RENAME COLUMN full_name TO employee_name;
ALTER TABLE employees RENAME COLUMN email TO employee_email;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by_department UUID REFERENCES departments(id) ON DELETE SET NULL;

-- 4. Create Storage Buckets for Profiles
-- Ensure pg_crypto is enabled for uuid generation if not already
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('department-profiles', 'department-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('employee-profiles', 'employee-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies
-- Allow public read access to profiles
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('department-profiles', 'employee-profiles'));

-- Allow authenticated users to upload to department-profiles
CREATE POLICY "Auth Upload Dept" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'department-profiles' AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload to employee-profiles
CREATE POLICY "Auth Upload Emp" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'employee-profiles' AND auth.role() = 'authenticated'
);

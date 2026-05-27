-- Supabase Initial Schema for InnoVibe TMS + HRMS
-- Run this in the Supabase SQL Editor

-- 1. Create custom enum type for Roles
CREATE TYPE user_role AS ENUM ('ADMIN', 'DEPARTMENT', 'EMPLOYEE');

-- 2. Create departments table
CREATE TABLE departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_name TEXT NOT NULL,
    department_email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create users table
-- We link this to the Supabase auth.users table for authentication
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    profile_photo TEXT,
    designation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Set up Row Level Security (RLS)
-- Enable RLS on tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Departments Policies
-- Admins can do everything
CREATE POLICY "Admins can manage departments" ON departments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );

-- Everyone can view departments
CREATE POLICY "Everyone can view departments" ON departments
    FOR SELECT
    USING (true);

-- Users Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users AS admin_users WHERE admin_users.id = auth.uid() AND admin_users.role = 'ADMIN'
        )
    );

-- Departments can view employees in their department
CREATE POLICY "Departments can view their employees" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users AS dept_users 
            WHERE dept_users.id = auth.uid() 
            AND dept_users.role = 'DEPARTMENT' 
            AND dept_users.department_id = users.department_id
        )
    );

-- Note: In a real environment you would also create insert/update policies for admins/departments.

-- 6. Trigger to automatically create a user profile after signup
-- This assumes departments or admins create users via Supabase auth admin API
-- or you can manually insert them.

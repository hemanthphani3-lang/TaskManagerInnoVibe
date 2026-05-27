-- Supabase Migration: 3-Table Architecture
-- Run this in your Supabase SQL Editor

-- 1. Drop old architecture
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 2. Create new tables
-- Admins Table
CREATE TABLE admins (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Departments Table
-- Note: 'id' references auth.users because Departments log in using an email/password
CREATE TABLE departments (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    department_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Employees Table
CREATE TABLE employees (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    profile_photo TEXT,
    designation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security (RLS)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Admins RLS
CREATE POLICY "Admins can view their own profile" ON admins
    FOR SELECT USING (auth.uid() = id);

-- Departments RLS
CREATE POLICY "Departments can view their own profile" ON departments
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all departments" ON departments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    );

-- Employees RLS
CREATE POLICY "Employees can view their own profile" ON employees
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Departments can view their own employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM departments 
            WHERE departments.id = auth.uid() 
            AND employees.department_id = departments.id
        )
    );

CREATE POLICY "Admins can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    );

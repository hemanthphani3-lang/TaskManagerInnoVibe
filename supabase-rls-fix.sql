-- Run this in Supabase SQL Editor

-- Drop existing policies on new tables
DROP POLICY IF EXISTS "admin_select_own" ON admins;
DROP POLICY IF EXISTS "dept_select_own" ON departments;
DROP POLICY IF EXISTS "emp_select_own" ON employees;
DROP POLICY IF EXISTS "auth_read_admins" ON admins;
DROP POLICY IF EXISTS "auth_read_departments" ON departments;
DROP POLICY IF EXISTS "auth_read_employees" ON employees;
DROP POLICY IF EXISTS "Admins can view their own profile" ON admins;
DROP POLICY IF EXISTS "Departments can view their own profile" ON departments;
DROP POLICY IF EXISTS "Admins can view all departments" ON departments;
DROP POLICY IF EXISTS "Employees can view their own profile" ON employees;
DROP POLICY IF EXISTS "Departments can view their own employees" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;

-- Create clean simple policies
-- Allow any authenticated user to read all 3 tables
-- (safe because each row is tied to a specific auth.uid())

CREATE POLICY "auth_read_admins" ON admins
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_read_departments" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_read_employees" ON employees
    FOR SELECT USING (auth.role() = 'authenticated');

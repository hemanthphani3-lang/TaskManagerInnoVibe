-- Fix: Add missing UPDATE RLS policies for employees, departments, and admins tables
-- Without these, Supabase silently blocks all UPDATE operations from user-context clients
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- =========================================================================
-- ADMINS: Allow admins to update their own profile
-- =========================================================================
DROP POLICY IF EXISTS "Admins can update their own profile" ON admins;
CREATE POLICY "Admins can update their own profile" ON admins
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================================
-- DEPARTMENTS: Allow department heads to update their own profile
-- =========================================================================
DROP POLICY IF EXISTS "Departments can update their own profile" ON departments;
CREATE POLICY "Departments can update their own profile" ON departments
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================================
-- EMPLOYEES: Allow employees to update their own profile
-- =========================================================================
DROP POLICY IF EXISTS "Employees can update their own profile" ON employees;
CREATE POLICY "Employees can update their own profile" ON employees
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Also allow admins to update all employees (for admin actions)
DROP POLICY IF EXISTS "Admins can update all employees" ON employees;
CREATE POLICY "Admins can update all employees" ON employees
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- Also allow admins to update all departments
DROP POLICY IF EXISTS "Admins can update all departments" ON departments;
CREATE POLICY "Admins can update all departments" ON departments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

COMMIT;

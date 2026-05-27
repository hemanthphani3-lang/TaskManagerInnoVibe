-- Phase 3 Database Schema Updates
-- Run this in your Supabase SQL Editor

-- 1. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ,
    check_in_time TIMESTAMPTZ,
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('PRESENT', 'LATE', 'HALF_DAY', 'LEAVE', 'ABSENT')),
    work_status TEXT NOT NULL CHECK (work_status IN ('ACTIVE', 'CHECKED_IN', 'LOGGED_OUT')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_name TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type TEXT NOT NULL,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Attendance
-- Admins can view all attendance
CREATE POLICY "Admin full access attendance" ON attendance FOR ALL USING (
    auth.uid() IN (SELECT id FROM admins)
);
-- Departments can view/manage attendance for their employees
CREATE POLICY "Department access own employees attendance" ON attendance FOR ALL USING (
    auth.uid() = department_id
);
-- Employees can view/manage their own attendance
CREATE POLICY "Employee access own attendance" ON attendance FOR ALL USING (
    auth.uid() = employee_id
);

-- 6. RLS Policies for Leave Requests
-- Admins can view all leave requests
CREATE POLICY "Admin full access leave_requests" ON leave_requests FOR ALL USING (
    auth.uid() IN (SELECT id FROM admins)
);
-- Departments can view/manage leave requests for their employees
CREATE POLICY "Department access own employees leave_requests" ON leave_requests FOR ALL USING (
    auth.uid() = department_id
);
-- Employees can view/manage their own leave requests
CREATE POLICY "Employee access own leave_requests" ON leave_requests FOR ALL USING (
    auth.uid() = employee_id
);

-- 7. RLS Policies for Holidays
-- Everyone can view holidays
CREATE POLICY "Public read access holidays" ON holidays FOR SELECT USING (auth.role() = 'authenticated');
-- Only admins can create/update/delete holidays
CREATE POLICY "Admin manage holidays" ON holidays FOR ALL USING (
    auth.uid() IN (SELECT id FROM admins)
);

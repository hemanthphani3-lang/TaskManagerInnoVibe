-- =============================================================
-- TMS Performance Indexes
-- Run this in the Supabase SQL Editor.
-- All indexes use IF NOT EXISTS — safe to run multiple times.
-- =============================================================

-- notifications(user_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- tasks(assigned_employee_id)
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee
  ON tasks(assigned_employee_id);

-- tasks(department_id)
CREATE INDEX IF NOT EXISTS idx_tasks_department
  ON tasks(department_id);

-- tasks(created_by)
CREATE INDEX IF NOT EXISTS idx_tasks_created_by
  ON tasks(created_by);

-- attendance(employee_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_created
  ON attendance(employee_id, created_at DESC);

-- attendance(department_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_attendance_department_created
  ON attendance(department_id, created_at DESC);

-- logout_requests(employee_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_logout_requests_employee
  ON logout_requests(employee_id, created_at DESC);

-- logout_requests(department_id, attendance_date DESC)
CREATE INDEX IF NOT EXISTS idx_logout_requests_department_date
  ON logout_requests(department_id, attendance_date DESC);

-- activity_feed(department_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_activity_feed_department_created
  ON activity_feed(department_id, created_at DESC);

-- announcements(created_at DESC)
CREATE INDEX IF NOT EXISTS idx_announcements_created
  ON announcements(created_at DESC);

-- leave_requests(department_id, approval_status)
CREATE INDEX IF NOT EXISTS idx_leave_requests_department_status
  ON leave_requests(department_id, approval_status);

-- work_sessions(department_id, login_time DESC)
CREATE INDEX IF NOT EXISTS idx_work_sessions_department_login
  ON work_sessions(department_id, login_time DESC);

-- productivity_scores(employee_id)
CREATE INDEX IF NOT EXISTS idx_productivity_scores_employee
  ON productivity_scores(employee_id);

-- productivity_scores(department_id, productivity_score DESC)
CREATE INDEX IF NOT EXISTS idx_productivity_scores_department
  ON productivity_scores(department_id, productivity_score DESC);

-- reminders(employee_id, reminder_status, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_reminders_employee_status
  ON reminders(employee_id, reminder_status, created_at DESC);

-- employees(department_id)
CREATE INDEX IF NOT EXISTS idx_employees_department
  ON employees(department_id);

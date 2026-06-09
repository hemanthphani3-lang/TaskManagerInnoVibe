-- RLS fix to allow multiple collaborators to read tasks
BEGIN;

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Employee can read their assigned tasks" ON tasks;

-- Create a new policy allowing employees to select tasks if:
-- 1. They are the primary assignee (assigned_employee_id = auth.uid())
-- 2. They are the creator (created_by = auth.uid())
-- 3. They are listed as a collaborator in task_assignees
CREATE POLICY "Employee can read their assigned tasks" ON tasks
    FOR SELECT TO authenticated
    USING (
        assigned_employee_id = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM task_assignees
            WHERE task_assignees.task_id = tasks.id
              AND task_assignees.user_id = auth.uid()
        )
    );

COMMIT;

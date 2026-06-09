-- RLS Fixes for Tasks, Comments, Attachments, Logs and Assignees
BEGIN;

-- 1. Tasks table select policy
DROP POLICY IF EXISTS "Employee can read their assigned tasks" ON tasks;
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

-- 2. Task Assignees table select policy
DROP POLICY IF EXISTS "Users can view assignees of their tasks" ON task_assignees;
CREATE POLICY "Users can view assignees of their tasks" ON task_assignees
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
        OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = task_assignees.task_id AND ta.user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM tasks t
            JOIN employees e ON e.id = auth.uid()
            WHERE t.id = task_id AND t.department_id = e.department_id
        )
    );

-- 3. Task Comments table select and insert policies
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON task_comments;
CREATE POLICY "Users can view comments on their tasks" ON task_comments
    FOR SELECT TO authenticated
    USING (
        exists (
            select 1 from tasks 
            where tasks.id = task_comments.task_id 
              and (
                tasks.department_id = auth.uid() 
                or tasks.assigned_employee_id = auth.uid() 
                or tasks.created_by = auth.uid()
                or exists (select 1 from admins where id = auth.uid())
                or exists (select 1 from task_assignees where task_assignees.task_id = tasks.id and task_assignees.user_id = auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "Users can insert comments on their tasks" ON task_comments;
CREATE POLICY "Users can insert comments on their tasks" ON task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        exists (
            select 1 from tasks 
            where tasks.id = task_id 
              and (
                tasks.department_id = auth.uid() 
                or tasks.assigned_employee_id = auth.uid() 
                or tasks.created_by = auth.uid()
                or exists (select 1 from admins where id = auth.uid())
                or exists (select 1 from task_assignees where task_assignees.task_id = tasks.id and task_assignees.user_id = auth.uid())
              )
        )
    );

-- 4. Task Attachments table select and insert policies
DROP POLICY IF EXISTS "Users can view attachments on their tasks" ON task_attachments;
CREATE POLICY "Users can view attachments on their tasks" ON task_attachments
    FOR SELECT TO authenticated
    USING (
        exists (
            select 1 from tasks 
            where tasks.id = task_attachments.task_id 
              and (
                tasks.department_id = auth.uid() 
                or tasks.assigned_employee_id = auth.uid() 
                or tasks.created_by = auth.uid()
                or exists (select 1 from admins where id = auth.uid())
                or exists (select 1 from task_assignees where task_assignees.task_id = tasks.id and task_assignees.user_id = auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "Users can insert attachments on their tasks" ON task_attachments;
CREATE POLICY "Users can insert attachments on their tasks" ON task_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        exists (
            select 1 from tasks 
            where tasks.id = task_id 
              and (
                tasks.department_id = auth.uid() 
                or tasks.assigned_employee_id = auth.uid() 
                or tasks.created_by = auth.uid()
                or exists (select 1 from admins where id = auth.uid())
                or exists (select 1 from task_assignees where task_assignees.task_id = tasks.id and task_assignees.user_id = auth.uid())
              )
        )
    );

-- 5. Task Activity Logs table select and insert policies
DROP POLICY IF EXISTS "Users can view logs on their tasks" ON task_activity_logs;
CREATE POLICY "Users can view logs on their tasks" ON task_activity_logs
    FOR SELECT TO authenticated
    USING (
        exists (
            select 1 from tasks 
            where tasks.id = task_activity_logs.task_id 
              and (
                tasks.department_id = auth.uid() 
                or tasks.assigned_employee_id = auth.uid() 
                or tasks.created_by = auth.uid()
                or exists (select 1 from admins where id = auth.uid())
                or exists (select 1 from task_assignees where task_assignees.task_id = tasks.id and task_assignees.user_id = auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "Users can insert logs on their tasks" ON task_activity_logs;
CREATE POLICY "Users can insert logs on their tasks" ON task_activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        exists (
            select 1 from tasks 
            where tasks.id = task_id 
              and (
                tasks.department_id = auth.uid() 
                or tasks.assigned_employee_id = auth.uid() 
                or tasks.created_by = auth.uid()
                or exists (select 1 from admins where id = auth.uid())
                or exists (select 1 from task_assignees where task_assignees.task_id = tasks.id and task_assignees.user_id = auth.uid())
              )
        )
    );

COMMIT;

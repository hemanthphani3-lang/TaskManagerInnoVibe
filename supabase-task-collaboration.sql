-- Migration: Task Assignment System Upgrade to Multi-Assignee Collaboration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- 1. Create task_assignees table
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL, -- Assignee ID (can be employee, department, admin)
    status TEXT DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uniq_task_assignee UNIQUE (task_id, user_id)
);

-- 2. Create task_subtasks table
CREATE TABLE IF NOT EXISTS task_subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    assigned_to UUID, -- Optional subtask assignee
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;

-- 4. Set up Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE task_subtasks;

-- 5. RLS Policies for task_assignees
DROP POLICY IF EXISTS "Users can view assignees of their tasks" ON task_assignees;
CREATE POLICY "Users can view assignees of their tasks" ON task_assignees
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
        -- Or employee within the same department as the task
        OR EXISTS (
            SELECT 1 FROM tasks t
            JOIN employees e ON e.id = auth.uid()
            WHERE t.id = task_id AND t.department_id = e.department_id
        )
    );

DROP POLICY IF EXISTS "Creators can insert assignees" ON task_assignees;
CREATE POLICY "Creators can insert assignees" ON task_assignees
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
        OR EXISTS (SELECT 1 FROM departments WHERE departments.id = auth.uid())
    );

DROP POLICY IF EXISTS "Assignees can update their own status" ON task_assignees;
CREATE POLICY "Assignees can update their own status" ON task_assignees
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Creators and admins can delete assignees" ON task_assignees;
CREATE POLICY "Creators and admins can delete assignees" ON task_assignees
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    );

-- 6. RLS Policies for task_subtasks
DROP POLICY IF EXISTS "Users can view subtasks of their tasks" ON task_subtasks;
CREATE POLICY "Users can view subtasks of their tasks" ON task_subtasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM task_assignees WHERE task_assignees.task_id = task_id AND task_assignees.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    );

DROP POLICY IF EXISTS "Creators and assignees can manage subtasks" ON task_subtasks;
CREATE POLICY "Creators and assignees can manage subtasks" ON task_subtasks
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM task_assignees WHERE task_assignees.task_id = task_id AND task_assignees.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    );

-- 7. Migrate existing single-assignee tasks to the new schema
INSERT INTO task_assignees (task_id, user_id, status, accepted_at, completed_at)
SELECT 
    id, 
    assigned_employee_id, 
    CASE 
        WHEN task_status = 'COMPLETED' THEN 'COMPLETED'
        WHEN task_status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        ELSE 'PENDING'
    END,
    accepted_at, 
    completed_at
FROM tasks
WHERE assigned_employee_id IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

COMMIT;

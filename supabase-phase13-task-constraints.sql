-- Phase 13: Task Table Constraints Relaxation for Cross-Role Collaboration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- ==========================================================
-- 1. DROP NOT NULL CONSTRAINTS ON LEGACY TASK COLUMNS
-- ==========================================================
ALTER TABLE public.tasks ALTER COLUMN assigned_employee_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN assigned_by_department DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN department_id DROP NOT NULL;

-- ==========================================================
-- 2. UPDATE SYNC TRIGGER FUNCTION FOR TASK COLUMNS
-- ==========================================================
CREATE OR REPLACE FUNCTION sync_task_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync Title
    IF NEW.title IS NOT NULL THEN
        NEW.task_title := NEW.title;
    ELSIF NEW.task_title IS NOT NULL THEN
        NEW.title := NEW.task_title;
    END IF;

    -- Sync Description
    IF NEW.description IS NOT NULL THEN
        NEW.task_description := NEW.description;
    ELSIF NEW.task_description IS NOT NULL THEN
        NEW.description := NEW.task_description;
    END IF;

    -- Sync Priority
    IF NEW.priority IS NOT NULL THEN
        IF UPPER(NEW.priority) = 'CRITICAL' THEN
            NEW.priority_level := 'CRITICAL'::priority_level;
        ELSIF UPPER(NEW.priority) = 'HIGH' THEN
            NEW.priority_level := 'HIGH'::priority_level;
        ELSIF UPPER(NEW.priority) = 'LOW' THEN
            NEW.priority_level := 'LOW'::priority_level;
        ELSE
            NEW.priority_level := 'MEDIUM'::priority_level;
        END IF;
    ELSIF NEW.priority_level IS NOT NULL THEN
        NEW.priority := NEW.priority_level::text;
    END IF;

    -- Sync Status
    IF NEW.status IS NOT NULL THEN
        IF UPPER(NEW.status) = 'COMPLETED' THEN
            NEW.task_status := 'COMPLETED'::task_status;
        ELSIF UPPER(NEW.status) = 'REJECTED' THEN
            NEW.task_status := 'DELAYED'::task_status; -- map rejected to delayed in existing enum
        ELSIF UPPER(NEW.status) = 'ACCEPTED' OR UPPER(NEW.status) = 'IN_PROGRESS' THEN
            NEW.task_status := 'IN_PROGRESS'::task_status;
        ELSIF UPPER(NEW.status) = 'PENDING' THEN
            NEW.task_status := 'PENDING'::task_status;
        ELSE
            NEW.task_status := 'PENDING'::task_status;
        END IF;
    ELSIF NEW.task_status IS NOT NULL THEN
        NEW.status := NEW.task_status::text;
    END IF;

    -- Sync Assignee (Only set employee ID if assigned to an Employee)
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to_role = 'EMPLOYEE' THEN
        NEW.assigned_employee_id := NEW.assigned_to;
    ELSE
        NEW.assigned_employee_id := NULL;
    END IF;

    -- Sync Department Id (Only set department ID if assigned to a Department Head)
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to_role = 'DEPARTMENT' THEN
        NEW.department_id := NEW.assigned_to;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

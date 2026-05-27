-- Phase 11: Cross-Role Collaborative Task Ecosystem Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- ==========================================================
-- 1. ALTER TASKS TABLE
-- ==========================================================

-- Standard columns for Cross-Role Ecosystem
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by_role TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to_role TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT;

-- Attachment arrays and comments backup structures
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

-- Detailed tracking and response timestamps
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS clarification_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS clarification_text TEXT;

-- ==========================================================
-- 2. ALTER TASK COMMENTS TABLE
-- ==========================================================
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS comment_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS attachment TEXT;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================================
-- 3. POSTGRESQL TRIGGERS FOR BACKWARD COMPATIBILITY SYNC
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

    -- Sync Assignee
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to_role = 'EMPLOYEE' THEN
        NEW.assigned_employee_id := NEW.assigned_to;
    END IF;

    -- Sync Department Id
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to_role = 'DEPARTMENT' THEN
        NEW.department_id := NEW.assigned_to;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_task_columns
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_columns();


-- Comments Trigger Sync
CREATE OR REPLACE FUNCTION sync_comment_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.message IS NOT NULL THEN
        NEW.comment_text := NEW.message;
    ELSIF NEW.comment_text IS NOT NULL THEN
        NEW.message := NEW.comment_text;
    END IF;

    IF NEW.timestamp IS NOT NULL THEN
        NEW.created_at := NEW.timestamp;
    ELSIF NEW.created_at IS NOT NULL THEN
        NEW.timestamp := NEW.created_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_comment_columns
BEFORE INSERT OR UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION sync_comment_columns();

COMMIT;

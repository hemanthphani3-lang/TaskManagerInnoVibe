-- Migration: Add edit and delete support for task discussion
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

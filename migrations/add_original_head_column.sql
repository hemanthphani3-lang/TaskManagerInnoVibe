-- Migration: Add original_head_id to departments table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- 1. Add column if it doesn't exist
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS original_head_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Backfill existing records to point to themselves as the original head
UPDATE public.departments 
SET original_head_id = id 
WHERE original_head_id IS NULL;

COMMIT;

-- 3. Reload PostgREST schema cache to make the new column immediately accessible
NOTIFY pgrst, 'reload schema';

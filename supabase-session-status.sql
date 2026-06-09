-- Migration: Add status column to work_sessions table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- 1. Add status column to work_sessions table with default 'ACTIVE'
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE';

-- 2. Update existing completed sessions to status = 'COMPLETED'
UPDATE work_sessions SET status = 'COMPLETED' WHERE logout_time IS NOT NULL;

COMMIT;

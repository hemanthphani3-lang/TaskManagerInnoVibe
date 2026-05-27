-- Phase 10: Add Mother and Father Names to Profile Tables
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS mother_name TEXT;

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS mother_name TEXT;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS mother_name TEXT;

COMMIT;

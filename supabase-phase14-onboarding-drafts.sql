-- Phase 14: Onboarding Draft Saving System
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- Extend employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS onboarding_draft JSONB DEFAULT NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS completed_fields JSONB DEFAULT '[]'::jsonb;

-- Extend departments table
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS onboarding_draft JSONB DEFAULT NULL;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS completed_fields JSONB DEFAULT '[]'::jsonb;

-- Extend admins table (for schema consistency)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS onboarding_draft JSONB DEFAULT NULL;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS completed_fields JSONB DEFAULT '[]'::jsonb;

COMMIT;

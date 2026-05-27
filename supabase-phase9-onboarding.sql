-- Phase 9: Complete Role-Based Onboarding & Profile Completion System
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

BEGIN;

-- =========================================================================
-- 1. EXTEND ADMINS TABLE
-- =========================================================================
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS mandatory_fields_completed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS organization_role TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS access_authority_level TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS office_location TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS administrative_responsibility TEXT;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS languages_known TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS resume TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS biography TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;


-- =========================================================================
-- 2. EXTEND DEPARTMENTS TABLE (Department Head Profile)
-- =========================================================================
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS mandatory_fields_completed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS department_managed TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS leadership_role TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS managerial_level TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS reporting_structure TEXT;

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS languages_known TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS resume TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS biography TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;


-- =========================================================================
-- 3. EXTEND EMPLOYEES TABLE
-- =========================================================================
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS mandatory_fields_completed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reporting_manager TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS skills TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_mode TEXT;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS languages_known TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS resume TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS biography TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;

-- Backfill pre-existing rows to mark onboarding completed = true to prevent blocking them
UPDATE public.admins SET onboarding_completed = TRUE, profile_completion_percentage = 100 WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;
UPDATE public.departments SET onboarding_completed = TRUE, profile_completion_percentage = 100 WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;
UPDATE public.employees SET onboarding_completed = TRUE, profile_completion_percentage = 100 WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;


-- =========================================================================
-- 4. CREATE STORAGE BUCKET FOR DOCUMENTS
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('onboarding-documents', 'onboarding-documents', true, 20971520) -- 20MB
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Onboarding Documents
CREATE POLICY "Onboarding Docs Public Read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'onboarding-documents');

CREATE POLICY "Onboarding Docs Auth Insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'onboarding-documents');

CREATE POLICY "Onboarding Docs Auth Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'onboarding-documents');

COMMIT;

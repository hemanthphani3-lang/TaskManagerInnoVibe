-- Phase 8: Rich Announcements Migration (File Attachments & Voice Notes)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xcvultxpxwhpvtmztyaj/sql/new

-- 1. Add new columns to the announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS voice_note_url TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by_role TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- 2. Backfill existing announcements data so that created_by_role and created_by_name are populated
UPDATE public.announcements 
SET 
    created_by_role = COALESCE(sender_role, 'ADMIN'),
    created_by_name = CASE 
        WHEN sender_role = 'ADMIN' THEN 'System Administrator'
        ELSE 'Department Head'
    END
WHERE created_by_role IS NULL;

-- 3. Create storage bucket for announcements if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('announcements', 'announcements', true, 20971520) -- 20MB limit
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for Announcements
-- Enable public read access to announcements folder
CREATE POLICY "Announcements Public Read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'announcements');

-- Enable authenticated users (Admin / Department Heads) to upload attachments and voice notes
CREATE POLICY "Announcements Auth Insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'announcements');

-- Enable authenticated users to delete their own uploaded files
CREATE POLICY "Announcements Auth Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'announcements');

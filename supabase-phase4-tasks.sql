-- PHASE 4: TASK MANAGEMENT SYSTEM

begin;

-- Create Enums
create type priority_level as enum ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
create type task_status as enum ('PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'REOPENED', 'DELAYED');

-- 1. Tasks Table
create table tasks (
    id uuid default gen_random_uuid() primary key,
    task_title text not null,
    task_description text not null,
    assigned_by_department uuid references departments(id) not null,
    assigned_employee_id uuid references employees(id) not null,
    department_id uuid references departments(id) not null,
    priority_level priority_level default 'MEDIUM',
    task_status task_status default 'PENDING',
    due_date date not null,
    estimated_completion_time text,
    reopen_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Task Comments Table
create table task_comments (
    id uuid default gen_random_uuid() primary key,
    task_id uuid references tasks(id) on delete cascade not null,
    user_id uuid not null, -- Can be employee or department head
    comment_text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Task Attachments Table
create table task_attachments (
    id uuid default gen_random_uuid() primary key,
    task_id uuid references tasks(id) on delete cascade not null,
    uploaded_by uuid not null,
    file_url text not null,
    file_type text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Task Activity Logs Table
create table task_activity_logs (
    id uuid default gen_random_uuid() primary key,
    task_id uuid references tasks(id) on delete cascade not null,
    action_type text not null,
    action_by uuid not null,
    action_description text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add to Realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_comments;
alter publication supabase_realtime add table task_attachments;
alter publication supabase_realtime add table task_activity_logs;

-- Storage Bucket Creation for Attachments
insert into storage.buckets (id, name, public) 
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

-- Set up RLS for Storage (Authenticated users can upload/view)
create policy "Authenticated users can upload task attachments"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'task-attachments' );

create policy "Authenticated users can view task attachments"
on storage.objects for select
to authenticated
using ( bucket_id = 'task-attachments' );

create policy "Authenticated users can delete own attachments"
on storage.objects for delete
to authenticated
using ( bucket_id = 'task-attachments' and owner = auth.uid() );

commit;

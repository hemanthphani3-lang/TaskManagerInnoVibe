-- Phase 12 Migration: Work Session Reporting System
begin;

-- Create work_sessions table
create table if not exists work_sessions (
    session_id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    user_name text not null,
    user_role text not null,
    department_id uuid references departments(id) on delete set null,
    department text, -- Store department name for historical records
    login_time timestamp with time zone default timezone('utc'::text, now()) not null,
    logout_time timestamp with time zone,
    duration text,
    report_submitted boolean default false not null,
    report_id uuid
);

-- Create logout_reports table
create table if not exists logout_reports (
    report_id uuid default gen_random_uuid() primary key,
    session_id uuid references work_sessions(session_id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    summary text not null,
    completed_tasks text,
    pending_tasks text,
    blockers text,
    notes text,
    attachments jsonb default '[]'::jsonb, -- Store list of attachment objects: {name, url, type, size}
    time_spent_notes text,
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Establish foreign key from work_sessions to logout_reports
alter table work_sessions 
add constraint fk_work_sessions_report 
foreign key (report_id) references logout_reports(report_id) on delete set null;

-- Enable Row Level Security (RLS)
alter table work_sessions enable row level security;
alter table logout_reports enable row level security;

-- DROP policies if they exist (to ensure safe re-run)
drop policy if exists "Employees can view own sessions" on work_sessions;
drop policy if exists "Employees can insert own sessions" on work_sessions;
drop policy if exists "Employees can update own sessions" on work_sessions;
drop policy if exists "Departments can view team sessions" on work_sessions;
drop policy if exists "Admins can view/manage all sessions" on work_sessions;

drop policy if exists "Employees can view own reports" on logout_reports;
drop policy if exists "Employees can insert own reports" on logout_reports;
drop policy if exists "Departments can view team reports" on logout_reports;
drop policy if exists "Admins can view/manage all reports" on logout_reports;

-- RLS policies for work_sessions
create policy "Employees can view own sessions" on work_sessions
    for select to authenticated using (user_id = auth.uid());

create policy "Employees can insert own sessions" on work_sessions
    for insert to authenticated with check (user_id = auth.uid());

create policy "Employees can update own sessions" on work_sessions
    for update to authenticated using (user_id = auth.uid());

create policy "Departments can view team sessions" on work_sessions
    for select to authenticated using (
        department_id = auth.uid() or 
        exists (select 1 from employees where employees.id = auth.uid() and employees.department_id = work_sessions.department_id)
    );

create policy "Admins can view/manage all sessions" on work_sessions
    for all to authenticated using (exists (select 1 from admins where id = auth.uid()));

-- RLS policies for logout_reports
create policy "Employees can view own reports" on logout_reports
    for select to authenticated using (user_id = auth.uid());

create policy "Employees can insert own reports" on logout_reports
    for insert to authenticated with check (user_id = auth.uid());

create policy "Departments can view team reports" on logout_reports
    for select to authenticated using (
        exists (
            select 1 from work_sessions 
            where work_sessions.session_id = logout_reports.session_id 
            and (work_sessions.department_id = auth.uid() or exists (select 1 from employees where employees.id = auth.uid() and employees.department_id = work_sessions.department_id))
        )
    );

create policy "Admins can view/manage all reports" on logout_reports
    for all to authenticated using (exists (select 1 from admins where id = auth.uid()));

-- Enable Realtime Publications
do $$ 
begin
    alter publication supabase_realtime add table work_sessions;
    alter publication supabase_realtime add table logout_reports;
exception when duplicate_object then null;
end $$;

commit;

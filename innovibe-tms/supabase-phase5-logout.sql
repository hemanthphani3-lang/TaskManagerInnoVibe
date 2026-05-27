begin;

-- ENUMS
create type approval_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type work_status as enum ('ACTIVE', 'LOGOUT_REQUESTED', 'LOGGED_OUT');

-- ALTER ATTENDANCE
alter table attendance
add column logout_time time,
add column working_hours text,
add column work_status work_status default 'ACTIVE';

-- LOGOUT REQUESTS
create table logout_requests (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references employees(id) not null,
    department_id uuid references departments(id) not null,
    attendance_date date not null,
    logout_request_time timestamp with time zone default timezone('utc'::text, now()) not null,
    approval_status approval_status default 'PENDING',
    approved_by_department uuid references departments(id),
    approval_time timestamp with time zone,
    logout_time timestamp with time zone,
    rejection_reason text,
    total_working_hours text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(employee_id, attendance_date)
);

-- WORK SUBMISSIONS
create table work_submissions (
    id uuid default gen_random_uuid() primary key,
    logout_request_id uuid not null references logout_requests(id) on delete cascade,
    employee_id uuid not null references employees(id),
    department_id uuid not null references departments(id),
    work_comment text,
    attachment_url text,
    attachment_type text,
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table logout_requests enable row level security;
alter table work_submissions enable row level security;

-- Employees
create policy "Employees can read their logout requests" on logout_requests for select to authenticated using (employee_id = auth.uid());
create policy "Employees can insert their logout requests" on logout_requests for insert to authenticated with check (employee_id = auth.uid());
create policy "Employees can read their work submissions" on work_submissions for select to authenticated using (employee_id = auth.uid());
create policy "Employees can insert their work submissions" on work_submissions for insert to authenticated with check (employee_id = auth.uid());

-- Departments
create policy "Departments can manage logout requests" on logout_requests for all to authenticated using (department_id = auth.uid()) with check (department_id = auth.uid());
create policy "Departments can manage work submissions" on work_submissions for all to authenticated using (department_id = auth.uid()) with check (department_id = auth.uid());

-- Admins
create policy "Admins can manage all logout requests" on logout_requests for all to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
create policy "Admins can manage all work submissions" on work_submissions for all to authenticated using ( exists (select 1 from admins where id = auth.uid()) );

-- REALTIME PUBLICATION
alter publication supabase_realtime add table logout_requests;
alter publication supabase_realtime add table work_submissions;
alter publication supabase_realtime add table attendance; -- just in case it's not already added

-- STORAGE BUCKET
insert into storage.buckets (id, name, public) 
values ('daily-work-submissions', 'daily-work-submissions', true)
on conflict (id) do nothing;

create policy "Employees can upload work submissions" on storage.objects for insert to authenticated
with check ( bucket_id = 'daily-work-submissions' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "Anyone can read work submissions" on storage.objects for select to authenticated
using ( bucket_id = 'daily-work-submissions' );

commit;

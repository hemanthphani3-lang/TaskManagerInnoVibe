begin;

-- LEAVE REQUESTS TABLE (If missing)
create table if not exists leave_requests (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid not null references employees(id) on delete cascade,
    department_id uuid not null references departments(id) on delete cascade,
    leave_type text not null,
    start_date date not null,
    end_date date not null,
    reason text not null,
    status text default 'PENDING',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ACTIVITY FEED TABLE
create table if not exists activity_feed (
    id uuid default gen_random_uuid() primary key,
    activity_type text not null,
    activity_user uuid not null,
    activity_user_name text not null,
    activity_description text not null,
    department_id uuid not null references departments(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES FOR LEAVE REQUESTS
alter table leave_requests enable row level security;

do $$ begin
    create policy "Employees can view own leave requests" on leave_requests for select to authenticated using ( employee_id = auth.uid() );
    create policy "Employees can insert own leave requests" on leave_requests for insert to authenticated with check ( employee_id = auth.uid() );
    create policy "Departments can view their leave requests" on leave_requests for select to authenticated using ( department_id = auth.uid() );
    create policy "Departments can update their leave requests" on leave_requests for update to authenticated using ( department_id = auth.uid() );
    create policy "Admins can view all leave requests" on leave_requests for select to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
exception when duplicate_object then null; end $$;

-- RLS POLICIES FOR ACTIVITY FEED
alter table activity_feed enable row level security;

do $$ begin
    create policy "Anyone authenticated can insert activity feed" on activity_feed for insert to authenticated with check ( true );
    create policy "Employees can view their department activity" on activity_feed for select to authenticated using ( 
        department_id = (select department_id from employees where id = auth.uid())
    );
    create policy "Departments can view their own activity" on activity_feed for select to authenticated using ( department_id = auth.uid() );
    create policy "Admins can view all activity" on activity_feed for select to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
exception when duplicate_object then null; end $$;

-- REALTIME
-- Add activity_feed to realtime (leave_requests was added in previous phase if I recall correctly, but let's add it anyway safely)
do $$ 
begin
    alter publication supabase_realtime add table activity_feed;
exception when duplicate_object then null; 
end $$;

commit;

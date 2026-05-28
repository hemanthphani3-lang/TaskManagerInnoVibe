begin;

-- ENUMS for Reminders
do $$ begin
    create type reminder_type as enum ('TASK_PENDING', 'DEADLINE_WARNING', 'NO_UPDATE', 'ATTENDANCE_REMINDER');
exception when duplicate_object then null; end $$;

do $$ begin
    create type reminder_status as enum ('UNREAD', 'READ', 'DISMISSED');
exception when duplicate_object then null; end $$;


-- 1. PRODUCTIVITY SCORES TABLE
create table if not exists productivity_scores (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid not null references employees(id) on delete cascade unique,
    department_id uuid not null references departments(id) on delete cascade,
    productivity_score numeric default 0,
    completed_tasks integer default 0,
    delayed_tasks integer default 0,
    reopened_tasks integer default 0,
    attendance_percentage numeric default 0,
    daily_update_score integer default 0,
    calculated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RANKINGS TABLE
create table if not exists rankings (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid not null references employees(id) on delete cascade unique,
    department_id uuid not null references departments(id) on delete cascade,
    employee_rank integer,
    department_rank integer,
    score numeric default 0,
    calculated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. KPI METRICS TABLE
create table if not exists kpi_metrics (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid not null references employees(id) on delete cascade unique,
    department_id uuid not null references departments(id) on delete cascade,
    completion_rate numeric default 0,
    attendance_rate numeric default 0,
    delay_percentage numeric default 0,
    average_work_hours numeric default 0,
    productivity_percentage numeric default 0,
    calculated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REMINDERS TABLE
create table if not exists reminders (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid not null references employees(id) on delete cascade,
    department_id uuid not null references departments(id) on delete cascade,
    reminder_type text not null,
    reminder_message text not null,
    reminder_status text default 'UNREAD',
    scheduled_time timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES FOR ALL TABLES

alter table productivity_scores enable row level security;
alter table rankings enable row level security;
alter table kpi_metrics enable row level security;
alter table reminders enable row level security;

do $$ begin
    -- Employees can read their own
    create policy "Employees can view own productivity" on productivity_scores for select to authenticated using (employee_id = auth.uid());
    create policy "Employees can view own ranking" on rankings for select to authenticated using (employee_id = auth.uid());
    create policy "Employees can view own kpis" on kpi_metrics for select to authenticated using (employee_id = auth.uid());
    create policy "Employees can view own reminders" on reminders for select to authenticated using (employee_id = auth.uid());
    create policy "Employees can update own reminders" on reminders for update to authenticated using (employee_id = auth.uid());

    -- Departments can view their employees
    create policy "Departments can view team productivity" on productivity_scores for select to authenticated using (department_id = auth.uid());
    create policy "Departments can view team ranking" on rankings for select to authenticated using (department_id = auth.uid());
    create policy "Departments can view team kpis" on kpi_metrics for select to authenticated using (department_id = auth.uid());
    create policy "Departments can view team reminders" on reminders for select to authenticated using (department_id = auth.uid());

    -- Admins can view all
    create policy "Admins can view all productivity" on productivity_scores for all to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
    create policy "Admins can view all ranking" on rankings for all to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
    create policy "Admins can view all kpis" on kpi_metrics for all to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
    create policy "Admins can view all reminders" on reminders for all to authenticated using ( exists (select 1 from admins where id = auth.uid()) );
exception when duplicate_object then null; end $$;

-- Add these tables to the realtime publication
do $$ 
begin
    alter publication supabase_realtime add table productivity_scores;
    alter publication supabase_realtime add table rankings;
    alter publication supabase_realtime add table kpi_metrics;
    alter publication supabase_realtime add table reminders;
exception when duplicate_object then null; 
end $$;

commit;

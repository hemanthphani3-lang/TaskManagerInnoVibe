begin;

-- Enable RLS
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table task_attachments enable row level security;
alter table task_activity_logs enable row level security;

-- TASKS POLICIES
-- Department can manage tasks assigned to their department
create policy "Department can manage their tasks" on tasks
for all to authenticated
using ( department_id = auth.uid() )
with check ( department_id = auth.uid() );

-- Employees can read/update tasks assigned to them
create policy "Employee can read their assigned tasks" on tasks
for select to authenticated
using ( assigned_employee_id = auth.uid() );

create policy "Employee can update their assigned tasks" on tasks
for update to authenticated
using ( assigned_employee_id = auth.uid() )
with check ( assigned_employee_id = auth.uid() );

-- Admins can do everything
create policy "Admins can manage all tasks" on tasks
for all to authenticated
using ( exists (select 1 from admins where id = auth.uid()) );


-- TASK COMMENTS POLICIES
create policy "Users can view comments on their tasks" on task_comments
for select to authenticated
using ( 
  exists (select 1 from tasks where id = task_comments.task_id and (department_id = auth.uid() or assigned_employee_id = auth.uid() or exists (select 1 from admins where id = auth.uid())))
);

create policy "Users can insert comments on their tasks" on task_comments
for insert to authenticated
with check ( 
  exists (select 1 from tasks where id = task_id and (department_id = auth.uid() or assigned_employee_id = auth.uid() or exists (select 1 from admins where id = auth.uid())))
);


-- TASK ATTACHMENTS POLICIES
create policy "Users can view attachments on their tasks" on task_attachments
for select to authenticated
using ( 
  exists (select 1 from tasks where id = task_attachments.task_id and (department_id = auth.uid() or assigned_employee_id = auth.uid() or exists (select 1 from admins where id = auth.uid())))
);

create policy "Users can insert attachments on their tasks" on task_attachments
for insert to authenticated
with check ( 
  exists (select 1 from tasks where id = task_id and (department_id = auth.uid() or assigned_employee_id = auth.uid() or exists (select 1 from admins where id = auth.uid())))
);


-- TASK ACTIVITY LOGS POLICIES
create policy "Users can view logs on their tasks" on task_activity_logs
for select to authenticated
using ( 
  exists (select 1 from tasks where id = task_activity_logs.task_id and (department_id = auth.uid() or assigned_employee_id = auth.uid() or exists (select 1 from admins where id = auth.uid())))
);

create policy "Users can insert logs on their tasks" on task_activity_logs
for insert to authenticated
with check ( 
  exists (select 1 from tasks where id = task_id and (department_id = auth.uid() or assigned_employee_id = auth.uid() or exists (select 1 from admins where id = auth.uid())))
);

commit;

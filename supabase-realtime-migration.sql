-- Enable Realtime for all core tables
begin;

-- Create the publication if it doesn't exist (Supabase creates it by default, but just in case)
-- drop publication if exists supabase_realtime;
-- create publication supabase_realtime;

-- Add tables to the publication
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table leave_requests;
alter publication supabase_realtime add table departments;
alter publication supabase_realtime add table employees;
alter publication supabase_realtime add table holidays;
alter publication supabase_realtime add table admins;

commit;

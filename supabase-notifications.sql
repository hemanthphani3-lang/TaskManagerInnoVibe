-- NOTIFICATIONS TABLE
create table if not exists notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    message text not null,
    type text not null,
    is_read boolean default false,
    link_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES FOR NOTIFICATIONS
alter table notifications enable row level security;

do $$ begin
    create policy "Users can view their own notifications" on notifications for select to authenticated using ( user_id = auth.uid() );
    create policy "Users can update their own notifications" on notifications for update to authenticated using ( user_id = auth.uid() );
    create policy "System can insert notifications" on notifications for insert to authenticated with check ( true );
exception when duplicate_object then null; end $$;

-- ENABLE REALTIME FOR NOTIFICATIONS
alter publication supabase_realtime add table notifications;

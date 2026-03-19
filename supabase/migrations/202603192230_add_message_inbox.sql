create table if not exists public.message_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'telegram')),
  label text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  inbound_key text not null unique default encode(gen_random_bytes(18), 'hex'),
  verify_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, channel)
);

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  connection_id uuid references public.message_connections(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'telegram')),
  external_chat_id text not null,
  external_contact_id text,
  first_name text,
  last_name text,
  full_name text not null default '',
  phone text,
  telegram_username text,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  urgency_score integer not null default 50 check (urgency_score between 0 and 100),
  urgency_locked boolean not null default false,
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_direction text not null default 'inbound' check (last_message_direction in ('inbound', 'outbound')),
  last_message_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, channel, external_chat_id)
);

create table if not exists public.message_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'telegram')),
  external_message_id text,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  sender_name text,
  body text not null default '',
  message_type text not null default 'text',
  received_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, channel, external_message_id)
);

create index if not exists message_connections_user_channel_idx
on public.message_connections (user_id, channel, status);

create index if not exists message_threads_user_last_message_idx
on public.message_threads (user_id, last_message_at desc);

create index if not exists message_threads_user_urgency_idx
on public.message_threads (user_id, urgency_score desc, last_message_at desc);

create index if not exists message_messages_thread_received_idx
on public.message_messages (thread_id, received_at asc);

drop trigger if exists message_connections_set_updated_at on public.message_connections;
create trigger message_connections_set_updated_at
before update on public.message_connections
for each row
execute function public.set_updated_at();

drop trigger if exists message_threads_set_updated_at on public.message_threads;
create trigger message_threads_set_updated_at
before update on public.message_threads
for each row
execute function public.set_updated_at();

alter table public.message_connections enable row level security;
alter table public.message_threads enable row level security;
alter table public.message_messages enable row level security;

drop policy if exists "message_connections_select_own" on public.message_connections;
create policy "message_connections_select_own"
on public.message_connections
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "message_connections_insert_own" on public.message_connections;
create policy "message_connections_insert_own"
on public.message_connections
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "message_connections_update_own" on public.message_connections;
create policy "message_connections_update_own"
on public.message_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "message_threads_select_own" on public.message_threads;
create policy "message_threads_select_own"
on public.message_threads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "message_threads_insert_own" on public.message_threads;
create policy "message_threads_insert_own"
on public.message_threads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "message_threads_update_own" on public.message_threads;
create policy "message_threads_update_own"
on public.message_threads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "message_messages_select_own" on public.message_messages;
create policy "message_messages_select_own"
on public.message_messages
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "message_messages_insert_own" on public.message_messages;
create policy "message_messages_insert_own"
on public.message_messages
for insert
to authenticated
with check (auth.uid() = user_id);

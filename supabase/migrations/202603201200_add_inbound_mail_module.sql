create table if not exists public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('imap')),
  external_thread_key text not null,
  from_name text,
  from_email text not null,
  subject text,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  urgency_score integer not null default 50 check (urgency_score between 0 and 100),
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source, external_thread_key)
);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  source text not null check (source in ('imap')),
  external_message_id text not null,
  from_name text,
  from_email text not null,
  to_emails jsonb not null default '[]'::jsonb,
  subject text,
  body_text text not null default '',
  body_html text,
  received_at timestamptz not null default timezone('utc', now()),
  raw_headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source, external_message_id)
);

create table if not exists public.mail_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('imap')),
  status text not null check (status in ('success', 'error')),
  imported_count integer not null default 0,
  detail text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mail_threads_user_last_message_idx
on public.mail_threads (user_id, last_message_at desc);

create index if not exists mail_threads_user_urgency_idx
on public.mail_threads (user_id, urgency_score desc, last_message_at desc);

create index if not exists mail_messages_thread_received_idx
on public.mail_messages (thread_id, received_at asc);

create index if not exists mail_sync_runs_user_created_idx
on public.mail_sync_runs (user_id, created_at desc);

drop trigger if exists mail_threads_set_updated_at on public.mail_threads;
create trigger mail_threads_set_updated_at
before update on public.mail_threads
for each row
execute function public.set_updated_at();

alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_sync_runs enable row level security;

drop policy if exists "mail_threads_select_own" on public.mail_threads;
create policy "mail_threads_select_own"
on public.mail_threads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "mail_threads_insert_own" on public.mail_threads;
create policy "mail_threads_insert_own"
on public.mail_threads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "mail_threads_update_own" on public.mail_threads;
create policy "mail_threads_update_own"
on public.mail_threads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "mail_messages_select_own" on public.mail_messages;
create policy "mail_messages_select_own"
on public.mail_messages
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "mail_messages_insert_own" on public.mail_messages;
create policy "mail_messages_insert_own"
on public.mail_messages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "mail_sync_runs_select_own" on public.mail_sync_runs;
create policy "mail_sync_runs_select_own"
on public.mail_sync_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "mail_sync_runs_insert_own" on public.mail_sync_runs;
create policy "mail_sync_runs_insert_own"
on public.mail_sync_runs
for insert
to authenticated
with check (auth.uid() = user_id);

grant select, insert, update on public.mail_threads to authenticated;
grant select, insert on public.mail_messages to authenticated;
grant select, insert on public.mail_sync_runs to authenticated;

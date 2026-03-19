create table if not exists public.remote_backup_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('webdav')),
  status text not null check (status in ('success', 'error')),
  file_name text not null,
  remote_path text not null default '',
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists remote_backup_runs_user_created_idx
on public.remote_backup_runs (user_id, created_at desc);

alter table public.remote_backup_runs enable row level security;

drop policy if exists "remote_backup_runs_select_own" on public.remote_backup_runs;
create policy "remote_backup_runs_select_own"
on public.remote_backup_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "remote_backup_runs_insert_own" on public.remote_backup_runs;
create policy "remote_backup_runs_insert_own"
on public.remote_backup_runs
for insert
to authenticated
with check (auth.uid() = user_id);

grant select, insert on public.remote_backup_runs to authenticated;

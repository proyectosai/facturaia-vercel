create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null check (source_type in ('self', 'pilot')),
  module_key text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'reviewed', 'planned', 'resolved')),
  title text not null,
  message text not null,
  reporter_name text,
  contact_email text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists feedback_entries_user_created_idx
on public.feedback_entries (user_id, created_at desc);

create trigger set_feedback_entries_updated_at
before update on public.feedback_entries
for each row execute function public.set_updated_at();

alter table public.feedback_entries enable row level security;

create policy "feedback_entries_select_own"
on public.feedback_entries
for select
using (auth.uid() = user_id);

create policy "feedback_entries_insert_own"
on public.feedback_entries
for insert
with check (auth.uid() = user_id);

create policy "feedback_entries_update_own"
on public.feedback_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.feedback_entries to authenticated;

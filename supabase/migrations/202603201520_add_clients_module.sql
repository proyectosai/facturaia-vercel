create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  relation_kind text not null default 'client' check (relation_kind in ('client', 'supplier', 'mixed')),
  status text not null default 'lead' check (status in ('lead', 'active', 'paused', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  display_name text not null,
  first_name text,
  last_name text,
  company_name text,
  email text,
  phone text,
  nif text,
  address text,
  notes text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists clients_user_status_idx on public.clients (user_id, status);
create index if not exists clients_user_priority_idx on public.clients (user_id, priority);
create index if not exists clients_user_relation_idx on public.clients (user_id, relation_kind);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

alter table public.clients enable row level security;

drop policy if exists "Users can view own clients" on public.clients;
create policy "Users can view own clients"
on public.clients
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clients" on public.clients;
create policy "Users can insert own clients"
on public.clients
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients"
on public.clients
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own clients" on public.clients;
create policy "Users can delete own clients"
on public.clients
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.clients to authenticated;

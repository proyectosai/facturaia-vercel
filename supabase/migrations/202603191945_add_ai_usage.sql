create table if not exists public.ai_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  calls_count integer not null default 0 check (calls_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, date)
);

create index if not exists ai_usage_user_date_idx
on public.ai_usage (user_id, date desc);

drop trigger if exists ai_usage_set_updated_at on public.ai_usage;
create trigger ai_usage_set_updated_at
before update on public.ai_usage
for each row
execute function public.set_updated_at();

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
on public.ai_usage
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "ai_usage_insert_own" on public.ai_usage;
create policy "ai_usage_insert_own"
on public.ai_usage
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "ai_usage_update_own" on public.ai_usage;
create policy "ai_usage_update_own"
on public.ai_usage
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.ai_usage to authenticated;

create or replace function public.increment_ai_usage_if_allowed(
  p_user_id uuid,
  p_usage_date date,
  p_limit integer
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'No autorizado para registrar el uso de IA.';
  end if;

  if p_limit is null then
    insert into public.ai_usage (user_id, date, calls_count)
    values (p_user_id, p_usage_date, 1)
    on conflict (user_id, date)
    do update
    set calls_count = public.ai_usage.calls_count + 1
    returning calls_count into next_count;

    return next_count;
  end if;

  insert into public.ai_usage (user_id, date, calls_count)
  values (p_user_id, p_usage_date, 1)
  on conflict (user_id, date)
  do update
  set calls_count = public.ai_usage.calls_count + 1
  where public.ai_usage.calls_count < p_limit
  returning calls_count into next_count;

  return next_count;
end;
$$;

grant execute on function public.increment_ai_usage_if_allowed(uuid, date, integer)
to authenticated;

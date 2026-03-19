create extension if not exists pgcrypto;

create sequence if not exists public.invoice_number_seq start 1;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  current_plan text not null default 'free' check (current_plan in ('free', 'basic', 'pro', 'premium')),
  billing_interval text check (billing_interval in ('monthly', 'yearly')),
  plan_status text not null default 'inactive',
  current_period_end timestamptz,
  stripe_customer_id text unique,
  active_subscription_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  email text not null,
  full_name text,
  nif text,
  address text,
  logo_path text,
  logo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  stripe_product_id text,
  plan_key text not null check (plan_key in ('basic', 'pro', 'premium')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_active_subscription_fk'
  ) then
    alter table public.users
    add constraint users_active_subscription_fk
    foreign key (active_subscription_id)
    references public.subscriptions(id)
    on delete set null;
  end if;
end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  invoice_number bigint not null unique default nextval('public.invoice_number_seq'),
  issue_date date not null default current_date,
  issuer_name text not null,
  issuer_nif text not null,
  issuer_address text not null,
  issuer_logo_url text,
  client_name text not null,
  client_nif text not null,
  client_address text not null,
  client_email text not null,
  line_items jsonb not null default '[]'::jsonb,
  vat_breakdown jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  vat_total numeric(12, 2) not null default 0,
  irpf_rate numeric(5, 2) not null default 0,
  irpf_amount numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists invoices_user_issue_date_idx
on public.invoices (user_id, issue_date desc);

create index if not exists subscriptions_user_status_idx
on public.subscriptions (user_id, status, current_period_end desc);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
  set email = excluded.email;

  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
on public.invoices
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own"
on public.invoices
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own"
on public.invoices
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant usage, select on sequence public.invoice_number_seq to authenticated;
grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.subscriptions to authenticated;
grant select, insert, update on public.invoices to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "logos_select_public" on storage.objects;
create policy "logos_select_public"
on storage.objects
for select
using (bucket_id = 'logos');

drop policy if exists "logos_insert_own" on storage.objects;
create policy "logos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "logos_update_own" on storage.objects;
create policy "logos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "logos_delete_own" on storage.objects;
create policy "logos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

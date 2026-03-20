create table if not exists public.bank_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_label text not null,
  booking_date date not null,
  value_date date,
  description text not null,
  counterparty_name text,
  amount numeric(12, 2) not null,
  currency text not null default 'EUR',
  direction text not null check (direction in ('credit', 'debit')),
  balance numeric(12, 2),
  status text not null default 'pending' check (status in ('pending', 'reconciled', 'ignored')),
  matched_invoice_id uuid references public.invoices(id) on delete set null,
  matched_expense_id uuid references public.expenses(id) on delete set null,
  notes text,
  source_file_name text,
  source_hash text not null,
  raw_row jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bank_movements_single_match_check
    check (num_nonnulls(matched_invoice_id, matched_expense_id) <= 1),
  constraint bank_movements_user_source_hash_key unique (user_id, source_hash)
);

create index if not exists bank_movements_user_booking_idx
on public.bank_movements (user_id, booking_date desc, created_at desc);

create index if not exists bank_movements_user_status_idx
on public.bank_movements (user_id, status, updated_at desc);

create index if not exists bank_movements_user_direction_idx
on public.bank_movements (user_id, direction, booking_date desc);

drop trigger if exists bank_movements_set_updated_at on public.bank_movements;
create trigger bank_movements_set_updated_at
before update on public.bank_movements
for each row execute procedure public.set_updated_at();

alter table public.bank_movements enable row level security;

drop policy if exists "bank_movements_select_own" on public.bank_movements;
create policy "bank_movements_select_own"
on public.bank_movements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "bank_movements_insert_own" on public.bank_movements;
create policy "bank_movements_insert_own"
on public.bank_movements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "bank_movements_update_own" on public.bank_movements;
create policy "bank_movements_update_own"
on public.bank_movements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.bank_movements to authenticated;

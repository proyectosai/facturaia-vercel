create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expense_kind text not null check (expense_kind in ('ticket', 'supplier_invoice')),
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed')),
  vendor_name text,
  vendor_nif text,
  expense_date date,
  currency text not null default 'EUR',
  base_amount numeric(12,2),
  vat_amount numeric(12,2),
  total_amount numeric(12,2),
  notes text,
  source_file_name text,
  source_file_path text,
  source_file_mime_type text,
  text_extraction_method text not null default 'unavailable'
    check (text_extraction_method in ('manual', 'pdf_text', 'plain_text', 'unavailable')),
  raw_text text,
  extracted_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists expenses_user_date_idx
on public.expenses (user_id, expense_date desc nulls last, created_at desc);

create index if not exists expenses_user_vendor_idx
on public.expenses (user_id, vendor_name, review_status);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
on public.expenses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
on public.expenses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
on public.expenses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.expenses to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-files',
  'expense-files',
  false,
  15728640,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "expense_files_select_own" on storage.objects;
create policy "expense_files_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'expense-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "expense_files_insert_own" on storage.objects;
create policy "expense_files_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'expense-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "expense_files_update_own" on storage.objects;
create policy "expense_files_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'expense-files'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'expense-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "expense_files_delete_own" on storage.objects;
create policy "expense_files_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'expense-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

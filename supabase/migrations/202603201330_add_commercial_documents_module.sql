create sequence if not exists public.commercial_document_number_seq start 1;

create table if not exists public.commercial_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_type text not null check (document_type in ('quote', 'delivery_note')),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'accepted', 'rejected', 'delivered', 'signed', 'converted')
  ),
  public_id uuid not null default gen_random_uuid() unique,
  document_number bigint not null default nextval('public.commercial_document_number_seq'),
  issue_date date not null default current_date,
  valid_until date,
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
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  irpf_rate numeric(5,2) not null default 0,
  irpf_amount numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  notes text,
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists commercial_documents_user_type_issue_idx
on public.commercial_documents (user_id, document_type, issue_date desc);

create index if not exists commercial_documents_user_status_idx
on public.commercial_documents (user_id, status, updated_at desc);

create index if not exists commercial_documents_user_client_idx
on public.commercial_documents (user_id, client_name, client_email);

drop trigger if exists commercial_documents_set_updated_at on public.commercial_documents;
create trigger commercial_documents_set_updated_at
before update on public.commercial_documents
for each row
execute function public.set_updated_at();

alter table public.commercial_documents enable row level security;

drop policy if exists "commercial_documents_select_own" on public.commercial_documents;
create policy "commercial_documents_select_own"
on public.commercial_documents
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "commercial_documents_insert_own" on public.commercial_documents;
create policy "commercial_documents_insert_own"
on public.commercial_documents
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "commercial_documents_update_own" on public.commercial_documents;
create policy "commercial_documents_update_own"
on public.commercial_documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage, select on sequence public.commercial_document_number_seq to authenticated;
grant select, insert, update on public.commercial_documents to authenticated;

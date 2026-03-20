create table if not exists public.document_signature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.commercial_documents (id) on delete cascade,
  document_type text not null check (document_type in ('quote', 'delivery_note')),
  request_kind text not null check (request_kind in ('quote_acceptance', 'delivery_note_signature')),
  status text not null default 'pending' check (status in ('pending', 'signed', 'rejected', 'revoked', 'expired')),
  public_token text not null unique,
  request_note text,
  requested_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  signer_name text,
  signer_email text,
  signer_nif text,
  signer_message text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_signature_requests_user_idx
  on public.document_signature_requests (user_id, requested_at desc);

create index if not exists document_signature_requests_document_idx
  on public.document_signature_requests (document_id, requested_at desc);

create index if not exists document_signature_requests_status_idx
  on public.document_signature_requests (user_id, status, requested_at desc);

drop trigger if exists document_signature_requests_set_updated_at on public.document_signature_requests;
create trigger document_signature_requests_set_updated_at
before update on public.document_signature_requests
for each row
execute function public.set_updated_at();

alter table public.document_signature_requests enable row level security;

drop policy if exists "Users can view own document signatures" on public.document_signature_requests;
create policy "Users can view own document signatures"
on public.document_signature_requests
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own document signatures" on public.document_signature_requests;
create policy "Users can insert own document signatures"
on public.document_signature_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own document signatures" on public.document_signature_requests;
create policy "Users can update own document signatures"
on public.document_signature_requests
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own document signatures" on public.document_signature_requests;
create policy "Users can delete own document signatures"
on public.document_signature_requests
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.document_signature_requests to authenticated;

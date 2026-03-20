create table if not exists public.invoice_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  delivery_channel text not null default 'email' check (delivery_channel in ('email')),
  trigger_mode text not null check (trigger_mode in ('manual', 'batch')),
  batch_key text,
  recipient_email text not null,
  subject text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists invoice_reminders_user_sent_idx
on public.invoice_reminders (user_id, sent_at desc);

create index if not exists invoice_reminders_invoice_idx
on public.invoice_reminders (invoice_id);

alter table public.invoice_reminders enable row level security;

create policy "invoice_reminders_select_own"
on public.invoice_reminders
for select
using (auth.uid() = user_id);

create policy "invoice_reminders_insert_own"
on public.invoice_reminders
for insert
with check (auth.uid() = user_id);

grant select, insert on public.invoice_reminders to authenticated;

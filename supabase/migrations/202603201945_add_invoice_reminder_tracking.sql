alter table public.invoices
add column if not exists last_reminder_at timestamptz;

alter table public.invoices
add column if not exists reminder_count integer not null default 0;

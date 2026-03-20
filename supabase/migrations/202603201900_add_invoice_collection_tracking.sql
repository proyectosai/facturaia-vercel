alter table public.invoices
add column if not exists due_date date;

update public.invoices
set due_date = coalesce(due_date, issue_date + integer '30')
where due_date is null;

alter table public.invoices
alter column due_date set default (current_date + integer '30');

alter table public.invoices
alter column due_date set not null;

alter table public.invoices
add column if not exists payment_status text not null default 'pending'
check (payment_status in ('pending', 'partial', 'paid'));

alter table public.invoices
add column if not exists amount_paid numeric(12, 2) not null default 0;

alter table public.invoices
add column if not exists paid_at timestamptz;

alter table public.invoices
add column if not exists collection_notes text;

with reconciled_collections as (
  select
    matched_invoice_id as invoice_id,
    sum(abs(amount))::numeric(12, 2) as amount_paid,
    max(booking_date) as latest_booking_date
  from public.bank_movements
  where matched_invoice_id is not null
    and status = 'reconciled'
    and direction = 'credit'
  group by matched_invoice_id
)
update public.invoices as invoices
set
  amount_paid = coalesce(reconciled_collections.amount_paid, 0),
  payment_status = case
    when coalesce(reconciled_collections.amount_paid, 0) >= invoices.grand_total then 'paid'
    when coalesce(reconciled_collections.amount_paid, 0) > 0 then 'partial'
    else 'pending'
  end,
  paid_at = case
    when coalesce(reconciled_collections.amount_paid, 0) >= invoices.grand_total
      then ((reconciled_collections.latest_booking_date::text || 'T12:00:00Z')::timestamptz)
    else null
  end
from reconciled_collections
where invoices.id = reconciled_collections.invoice_id;

create index if not exists invoices_user_payment_due_idx
on public.invoices (user_id, payment_status, due_date asc);

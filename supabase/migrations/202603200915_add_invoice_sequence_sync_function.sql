create or replace function public.sync_invoice_number_sequence()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  max_number bigint;
begin
  select max(invoice_number) into max_number from public.invoices;

  if max_number is null then
    perform setval('public.invoice_number_seq', 1, false);
    return 0;
  end if;

  perform setval('public.invoice_number_seq', max_number, true);
  return max_number;
end;
$$;

grant execute on function public.sync_invoice_number_sequence() to authenticated;

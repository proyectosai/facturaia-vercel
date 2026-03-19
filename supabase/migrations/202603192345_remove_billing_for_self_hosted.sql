alter table if exists public.users
  drop constraint if exists users_active_subscription_id_fkey;

alter table if exists public.users
  drop column if exists current_plan,
  drop column if exists billing_interval,
  drop column if exists plan_status,
  drop column if exists current_period_end,
  drop column if exists stripe_customer_id,
  drop column if exists active_subscription_id;

drop table if exists public.subscriptions cascade;

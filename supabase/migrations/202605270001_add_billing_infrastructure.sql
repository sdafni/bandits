create table if not exists public.billing_customers (
  user_id uuid primary key references public.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text not null,
  name text,
  default_payment_method_brand text,
  default_payment_method_last4 text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  stripe_product_id text,
  plan_key text not null check (plan_key in ('basic', 'pro', 'premium')),
  status text not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  currency text not null default 'eur',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_invoice_id text not null unique,
  stripe_subscription_id text,
  status text not null check (status in ('draft', 'open', 'paid', 'uncollectible', 'void')),
  currency text not null default 'eur',
  amount_due integer,
  amount_paid integer,
  subtotal integer,
  total integer,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  invoice_created_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_check_id uuid references public.tenant_checks(id) on delete set null,
  stripe_checkout_session_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  mode text not null check (mode in ('subscription', 'payment')),
  status text not null default 'open' check (status in ('open', 'completed', 'expired', 'canceled')),
  payment_status text,
  plan_key text check (plan_key in ('basic', 'pro', 'premium')),
  amount_total integer,
  currency text,
  success_url text,
  cancel_url text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.screening_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_check_id uuid not null unique references public.tenant_checks(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  amount_total integer,
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled')),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_subscriptions_user_id on public.billing_subscriptions(user_id);
create index if not exists idx_billing_subscriptions_status on public.billing_subscriptions(status);
create index if not exists idx_billing_invoices_user_id on public.billing_invoices(user_id);
create index if not exists idx_billing_invoices_subscription_id on public.billing_invoices(stripe_subscription_id);
create index if not exists idx_billing_checkout_sessions_user_id on public.billing_checkout_sessions(user_id);
create index if not exists idx_billing_checkout_sessions_tenant_check_id on public.billing_checkout_sessions(tenant_check_id);
create index if not exists idx_screening_payments_user_id on public.screening_payments(user_id);

drop trigger if exists set_billing_customers_updated_at on public.billing_customers;
create trigger set_billing_customers_updated_at
before update on public.billing_customers
for each row
execute function public.set_updated_at();

drop trigger if exists set_billing_subscriptions_updated_at on public.billing_subscriptions;
create trigger set_billing_subscriptions_updated_at
before update on public.billing_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists set_billing_invoices_updated_at on public.billing_invoices;
create trigger set_billing_invoices_updated_at
before update on public.billing_invoices
for each row
execute function public.set_updated_at();

drop trigger if exists set_billing_checkout_sessions_updated_at on public.billing_checkout_sessions;
create trigger set_billing_checkout_sessions_updated_at
before update on public.billing_checkout_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists set_screening_payments_updated_at on public.screening_payments;
create trigger set_screening_payments_updated_at
before update on public.screening_payments
for each row
execute function public.set_updated_at();

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_checkout_sessions enable row level security;
alter table public.screening_payments enable row level security;

drop policy if exists "billing_customers_select_owner_or_admin" on public.billing_customers;
create policy "billing_customers_select_owner_or_admin"
on public.billing_customers
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "billing_subscriptions_select_owner_or_admin" on public.billing_subscriptions;
create policy "billing_subscriptions_select_owner_or_admin"
on public.billing_subscriptions
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "billing_invoices_select_owner_or_admin" on public.billing_invoices;
create policy "billing_invoices_select_owner_or_admin"
on public.billing_invoices
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "billing_checkout_sessions_select_owner_or_admin" on public.billing_checkout_sessions;
create policy "billing_checkout_sessions_select_owner_or_admin"
on public.billing_checkout_sessions
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "screening_payments_select_owner_or_admin" on public.screening_payments;
create policy "screening_payments_select_owner_or_admin"
on public.screening_payments
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

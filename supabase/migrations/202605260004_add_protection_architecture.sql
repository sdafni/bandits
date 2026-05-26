create table if not exists public.insurance_eligibility (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null unique references public.tenant_checks(id) on delete cascade,
  status text not null check (status in ('eligible', 'conditionally_eligible', 'not_eligible', 'pending_more_documents')),
  risk_score integer not null check (risk_score between 0 and 100),
  eligibility_reason text not null,
  missing_requirements text[] not null default array[]::text[],
  recommended_package text,
  manual_override_note text,
  review_source text not null default 'system' check (review_source in ('system', 'admin_override')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.protection_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null,
  description text not null,
  coverage_items text[] not null default array[]::text[],
  estimated_price text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_check_protection_options (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null references public.tenant_checks(id) on delete cascade,
  package_id uuid not null references public.protection_packages(id) on delete cascade,
  eligibility_status text not null check (eligibility_status in ('eligible', 'conditionally_eligible', 'not_eligible', 'pending_more_documents')),
  recommendation_reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deposit_protection_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null references public.tenant_checks(id) on delete cascade,
  tenant_id uuid references public.tenant_public_profiles(id) on delete set null,
  landlord_id uuid not null references public.users(id) on delete cascade,
  rent_amount numeric(10,2),
  traditional_deposit_amount numeric(10,2),
  proposed_protection_fee numeric(10,2),
  coverage_amount numeric(10,2),
  status text not null default 'draft' check (status in ('draft', 'indicative_quote_ready', 'needs_more_documents', 'not_available')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_insurance_eligibility_tenant_check_id on public.insurance_eligibility(tenant_check_id);
create index if not exists idx_protection_packages_is_active on public.protection_packages(is_active);
create index if not exists idx_tenant_check_protection_options_tenant_check_id on public.tenant_check_protection_options(tenant_check_id);
create index if not exists idx_tenant_check_protection_options_package_id on public.tenant_check_protection_options(package_id);
create index if not exists idx_deposit_protection_quotes_tenant_check_id on public.deposit_protection_quotes(tenant_check_id);
create index if not exists idx_deposit_protection_quotes_landlord_id on public.deposit_protection_quotes(landlord_id);

drop trigger if exists set_insurance_eligibility_updated_at on public.insurance_eligibility;
create trigger set_insurance_eligibility_updated_at
before update on public.insurance_eligibility
for each row
execute function public.set_updated_at();

drop trigger if exists set_protection_packages_updated_at on public.protection_packages;
create trigger set_protection_packages_updated_at
before update on public.protection_packages
for each row
execute function public.set_updated_at();

insert into public.protection_packages (name, type, description, coverage_items, estimated_price, is_active)
values
  (
    'Basic Rental Protection',
    'screening-linked-protection',
    'Entry-level rental protection for lower-risk applicants where the landlord wants a simple trust layer after screening.',
    array['Screened applicant record', 'Basic tenant default review', 'Indicative protection onboarding support']::text[],
    '€19/month',
    true
  ),
  (
    'Deposit Protection',
    'deposit-protection',
    'Insurance-backed alternative to a traditional cash deposit, intended as a future SafeKey partner product.',
    array['Deposit alternative placeholder', 'Damage and breach guarantee placeholder', 'Landlord protection workflow layer']::text[],
    '€29/month',
    true
  ),
  (
    'Unpaid Rent Protection',
    'rent-protection',
    'Placeholder package for rent default protection where income and affordability signals are strong enough.',
    array['Unpaid rent cover placeholder', 'Missed payment response support', 'Eligibility tied to affordability signals']::text[],
    '€39/month',
    true
  ),
  (
    'Property Damage Protection',
    'damage-protection',
    'Placeholder package for accidental or malicious property damage scenarios.',
    array['Damage event placeholder', 'Property restoration workflow placeholder', 'Claims handoff placeholder']::text[],
    '€24/month',
    true
  ),
  (
    'Legal Recovery Support',
    'legal-support',
    'Placeholder legal support layer for recovery and breach response scenarios.',
    array['Recovery coordination placeholder', 'Case escalation placeholder', 'Partner legal workflow placeholder']::text[],
    '€34/month',
    true
  ),
  (
    'Full SafeKey Protection',
    'full-protection',
    'Combined flagship placeholder package linking screening, rent protection, deposit protection, and damage/legal layers.',
    array['Rent protection placeholder', 'Deposit protection placeholder', 'Damage support placeholder', 'Legal recovery placeholder']::text[],
    '€69/month',
    true
  )
on conflict (name) do update
set
  type = excluded.type,
  description = excluded.description,
  coverage_items = excluded.coverage_items,
  estimated_price = excluded.estimated_price,
  is_active = excluded.is_active;

alter table public.insurance_eligibility enable row level security;
alter table public.protection_packages enable row level security;
alter table public.tenant_check_protection_options enable row level security;
alter table public.deposit_protection_quotes enable row level security;

drop policy if exists "insurance_eligibility_select_owner_or_admin" on public.insurance_eligibility;
create policy "insurance_eligibility_select_owner_or_admin"
on public.insurance_eligibility
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = insurance_eligibility.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
);

drop policy if exists "insurance_eligibility_admin_manage" on public.insurance_eligibility;
create policy "insurance_eligibility_admin_manage"
on public.insurance_eligibility
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "protection_packages_select_authenticated" on public.protection_packages;
create policy "protection_packages_select_authenticated"
on public.protection_packages
for select
using (auth.uid() is not null and is_active = true);

drop policy if exists "protection_packages_admin_manage" on public.protection_packages;
create policy "protection_packages_admin_manage"
on public.protection_packages
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "tenant_check_protection_options_select_owner_or_admin" on public.tenant_check_protection_options;
create policy "tenant_check_protection_options_select_owner_or_admin"
on public.tenant_check_protection_options
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = tenant_check_protection_options.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
);

drop policy if exists "tenant_check_protection_options_admin_manage" on public.tenant_check_protection_options;
create policy "tenant_check_protection_options_admin_manage"
on public.tenant_check_protection_options
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "deposit_protection_quotes_select_owner_or_admin" on public.deposit_protection_quotes;
create policy "deposit_protection_quotes_select_owner_or_admin"
on public.deposit_protection_quotes
for select
using (
  public.is_admin(auth.uid())
  or landlord_id = auth.uid()
);

drop policy if exists "deposit_protection_quotes_admin_manage" on public.deposit_protection_quotes;
create policy "deposit_protection_quotes_admin_manage"
on public.deposit_protection_quotes
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

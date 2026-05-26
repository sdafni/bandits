create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  company_name text,
  role text not null default 'landlord' check (role in ('landlord', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  address_line1 text not null,
  city text not null,
  postal_code text,
  monthly_rent numeric(10,2),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_checks (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_full_name text not null,
  tenant_email text,
  tenant_phone text,
  requested_documents text[] not null default array['government_id', 'proof_of_income', 'employment_letter', 'bank_statement']::text[],
  status text not null default 'pending_upload' check (status in ('pending_upload', 'documents_received', 'under_review', 'report_ready')),
  upload_token_hash text not null unique,
  upload_token_expires_at timestamptz not null,
  secure_upload_url text,
  review_requested_at timestamptz,
  review_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_public_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null unique references public.tenant_checks(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  current_address text,
  employment_status text,
  employer_name text,
  monthly_income numeric(10,2),
  monthly_rent numeric(10,2),
  move_in_date date,
  notes text,
  consent_confirmed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null references public.tenant_checks(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  storage_path text not null unique,
  extracted_text text,
  upload_status text not null default 'uploaded' check (upload_status in ('uploaded', 'processing', 'reviewed')),
  uploaded_by_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null unique references public.tenant_checks(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  recommendation text not null check (recommendation in ('approve', 'conditional', 'decline')),
  summary text not null,
  red_flags text[] not null default array[]::text[],
  strengths text[] not null default array[]::text[],
  missing_documents text[] not null default array[]::text[],
  reasoning jsonb not null default '{}'::jsonb,
  generated_by text not null default 'heuristic',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_properties_landlord_id on public.properties(landlord_id);
create index if not exists idx_tenant_checks_landlord_id on public.tenant_checks(landlord_id);
create index if not exists idx_tenant_checks_property_id on public.tenant_checks(property_id);
create index if not exists idx_tenant_checks_status on public.tenant_checks(status);
create index if not exists idx_tenant_documents_tenant_check_id on public.tenant_documents(tenant_check_id);
create index if not exists idx_ai_reports_tenant_check_id on public.ai_reports(tenant_check_id);
create index if not exists idx_tenant_public_profiles_tenant_check_id on public.tenant_public_profiles(tenant_check_id);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenant_checks_updated_at on public.tenant_checks;
create trigger set_tenant_checks_updated_at
before update on public.tenant_checks
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenant_public_profiles_updated_at on public.tenant_public_profiles;
create trigger set_tenant_public_profiles_updated_at
before update on public.tenant_public_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenant_documents_updated_at on public.tenant_documents;
create trigger set_tenant_documents_updated_at
before update on public.tenant_documents
for each row
execute function public.set_updated_at();

drop trigger if exists set_ai_reports_updated_at on public.ai_reports;
create trigger set_ai_reports_updated_at
before update on public.ai_reports
for each row
execute function public.set_updated_at();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = user_id
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, company_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'landlord')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name),
      company_name = coalesce(excluded.company_name, public.users.company_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.properties enable row level security;
alter table public.tenant_checks enable row level security;
alter table public.tenant_public_profiles enable row level security;
alter table public.tenant_documents enable row level security;
alter table public.ai_reports enable row level security;

drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
on public.users
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
on public.users
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "properties_manage_owner_or_admin" on public.properties;
create policy "properties_manage_owner_or_admin"
on public.properties
for all
using (landlord_id = auth.uid() or public.is_admin(auth.uid()))
with check (landlord_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "tenant_checks_manage_owner_or_admin" on public.tenant_checks;
create policy "tenant_checks_manage_owner_or_admin"
on public.tenant_checks
for all
using (landlord_id = auth.uid() or public.is_admin(auth.uid()))
with check (landlord_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "tenant_public_profiles_select_owner_or_admin" on public.tenant_public_profiles;
create policy "tenant_public_profiles_select_owner_or_admin"
on public.tenant_public_profiles
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = tenant_public_profiles.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
);

drop policy if exists "tenant_public_profiles_update_owner_or_admin" on public.tenant_public_profiles;
create policy "tenant_public_profiles_update_owner_or_admin"
on public.tenant_public_profiles
for all
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = tenant_public_profiles.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = tenant_public_profiles.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
);

drop policy if exists "tenant_documents_select_owner_or_admin" on public.tenant_documents;
create policy "tenant_documents_select_owner_or_admin"
on public.tenant_documents
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = tenant_documents.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
);

drop policy if exists "tenant_documents_admin_manage" on public.tenant_documents;
create policy "tenant_documents_admin_manage"
on public.tenant_documents
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "ai_reports_select_owner_or_admin" on public.ai_reports;
create policy "ai_reports_select_owner_or_admin"
on public.ai_reports
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.tenant_checks tc
    where tc.id = ai_reports.tenant_check_id
      and tc.landlord_id = auth.uid()
  )
);

drop policy if exists "ai_reports_admin_manage" on public.ai_reports;
create policy "ai_reports_admin_manage"
on public.ai_reports
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('tenant-documents', 'tenant-documents', false)
on conflict (id) do nothing;

drop policy if exists "tenant_documents_bucket_select_owner_or_admin" on storage.objects;
create policy "tenant_documents_bucket_select_owner_or_admin"
on storage.objects
for select
using (
  bucket_id = 'tenant-documents'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.tenant_checks tc
      where tc.id::text = split_part(name, '/', 1)
        and tc.landlord_id = auth.uid()
    )
  )
);

drop policy if exists "tenant_documents_bucket_admin_manage" on storage.objects;
create policy "tenant_documents_bucket_admin_manage"
on storage.objects
for all
using (
  bucket_id = 'tenant-documents'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'tenant-documents'
  and public.is_admin(auth.uid())
);

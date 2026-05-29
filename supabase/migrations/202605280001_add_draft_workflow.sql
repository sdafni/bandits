-- Draft screening workspace: explore before payment, activate workflow at conversion point.

alter table public.tenant_checks
  add column if not exists workflow_activated_at timestamptz;

alter table public.tenant_checks
  drop constraint if exists tenant_checks_status_check;

alter table public.tenant_checks
  add constraint tenant_checks_status_check
  check (status in ('draft', 'pending_upload', 'documents_received', 'under_review', 'report_ready'));

alter table public.tenant_checks
  alter column upload_token_hash drop not null;

alter table public.tenant_checks
  alter column upload_token_expires_at drop not null;

alter table public.tenant_checks
  alter column secure_upload_url drop not null;

create or replace function public.create_tenant_check(
  p_property_name text,
  p_address_line1 text,
  p_city text,
  p_postal_code text,
  p_monthly_rent numeric,
  p_tenant_full_name text,
  p_tenant_email text,
  p_tenant_phone text,
  p_requested_documents text[],
  p_upload_token_hash text,
  p_upload_token_expires_at timestamptz,
  p_secure_upload_url text,
  p_status text default 'draft'
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_landlord_id uuid;
  v_property_id uuid;
  v_check_id uuid;
begin
  v_landlord_id := auth.uid();

  if v_landlord_id is null then
    raise exception 'Authentication required to create a tenant check.';
  end if;

  if p_status not in ('draft', 'pending_upload') then
    raise exception 'Invalid initial tenant check status.';
  end if;

  insert into public.properties (
    landlord_id,
    name,
    address_line1,
    city,
    postal_code,
    monthly_rent
  )
  values (
    v_landlord_id,
    p_property_name,
    p_address_line1,
    p_city,
    nullif(trim(coalesce(p_postal_code, '')), ''),
    p_monthly_rent
  )
  returning id into v_property_id;

  insert into public.tenant_checks (
    landlord_id,
    property_id,
    tenant_full_name,
    tenant_email,
    tenant_phone,
    requested_documents,
    upload_token_hash,
    upload_token_expires_at,
    secure_upload_url,
    status,
    workflow_activated_at
  )
  values (
    v_landlord_id,
    v_property_id,
    p_tenant_full_name,
    nullif(trim(coalesce(p_tenant_email, '')), ''),
    nullif(trim(coalesce(p_tenant_phone, '')), ''),
    p_requested_documents,
    nullif(trim(coalesce(p_upload_token_hash, '')), ''),
    p_upload_token_expires_at,
    nullif(trim(coalesce(p_secure_upload_url, '')), ''),
    p_status,
    case when p_status = 'pending_upload' then timezone('utc', now()) else null end
  )
  returning id into v_check_id;

  return v_check_id;
end;
$$;

grant execute on function public.create_tenant_check(
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text[],
  text,
  timestamptz,
  text,
  text
) to authenticated;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users(id) on delete set null
);

drop trigger if exists set_platform_settings_updated_at on public.platform_settings;
create trigger set_platform_settings_updated_at
before update on public.platform_settings
for each row
execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin_all on public.platform_settings;
create policy platform_settings_admin_all
on public.platform_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

insert into public.platform_settings (key, value)
values (
  'billing_funnel',
  jsonb_build_object(
    'mode', 'PREPAY',
    'billingEnabled', true,
    'gates', jsonb_build_object(
      'create_upload_link', 'subscription_or_per_check',
      'tenant_upload', 'free',
      'run_analysis', 'subscription_or_per_check',
      'view_report', 'subscription_or_per_check'
    ),
    'reportUnlockPriceCents', 1900,
    'autoCreateUploadLinkOnCheckCreate', false
  )
)
on conflict (key) do nothing;

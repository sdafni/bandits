insert into public.platform_settings (key, value)
values (
  'monetization',
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

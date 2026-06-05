alter table tenant_public_profiles
  add column if not exists credit_report_consent boolean not null default false,
  add column if not exists credit_report_consent_at timestamptz;

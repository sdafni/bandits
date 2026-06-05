alter table tenant_public_profiles
  add column if not exists credit_report_requested_at timestamptz;

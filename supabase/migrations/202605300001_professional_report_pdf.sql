-- Phase 3: Professional SafeKey Report PDF storage

alter table public.ai_reports
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_version text default 'v1.0';

insert into storage.buckets (id, name, public)
values ('safekey-reports', 'safekey-reports', false)
on conflict (id) do nothing;

drop policy if exists "safekey_reports_bucket_select_owner_or_admin" on storage.objects;
create policy "safekey_reports_bucket_select_owner_or_admin"
on storage.objects
for select
using (
  bucket_id = 'safekey-reports'
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

drop policy if exists "safekey_reports_bucket_admin_manage" on storage.objects;
create policy "safekey_reports_bucket_admin_manage"
on storage.objects
for all
using (
  bucket_id = 'safekey-reports'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'safekey-reports'
  and public.is_admin(auth.uid())
);

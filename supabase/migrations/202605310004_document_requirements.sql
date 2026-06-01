-- Flexible document requirements: required / recommended / optional priorities per check.

alter table public.tenant_checks
  add column if not exists document_requirements jsonb not null default '[]'::jsonb;

comment on column public.tenant_checks.document_requirements is
  'Array of {documentType, priority} objects. requested_documents stays synced as deduped catalog values.';

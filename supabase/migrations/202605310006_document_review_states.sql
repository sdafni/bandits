-- Per-document review states for SafeKey Core (accepted, rejected, needs_replacement, not_requested, pending_review).

alter table public.tenant_documents
  add column if not exists review_note text;

update public.tenant_documents
set review_note = rejection_reason
where review_note is null
  and rejection_reason is not null;

alter table public.tenant_documents
  drop constraint if exists tenant_documents_upload_status_check;

update public.tenant_documents
set upload_status = case upload_status
  when 'reviewed' then 'accepted'
  when 'uploaded' then 'pending_review'
  when 'processing' then 'pending_review'
  else upload_status
end
where upload_status in ('reviewed', 'uploaded', 'processing');

alter table public.tenant_documents
  add constraint tenant_documents_upload_status_check
  check (
    upload_status in (
      'accepted',
      'rejected',
      'needs_replacement',
      'not_requested',
      'pending_review'
    )
  );

alter table public.tenant_documents
  alter column upload_status set default 'pending_review';

comment on column public.tenant_documents.upload_status is
  'Review state: accepted | rejected | needs_replacement | not_requested | pending_review';
comment on column public.tenant_documents.review_note is
  'Reviewer note shown to tenant when replacement is requested or document is rejected.';

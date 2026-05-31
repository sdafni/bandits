-- SafeKey Core: landlord decisions, document rejection, reviewer notes

alter table public.tenant_checks
  add column if not exists landlord_decision text not null default 'pending'
    check (landlord_decision in ('pending', 'approved', 'declined', 'conditional')),
  add column if not exists landlord_decision_notes text,
  add column if not exists landlord_decided_at timestamptz;

alter table public.tenant_documents
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.users(id);

alter table public.tenant_documents
  drop constraint if exists tenant_documents_upload_status_check;

alter table public.tenant_documents
  add constraint tenant_documents_upload_status_check
  check (upload_status in ('uploaded', 'processing', 'reviewed', 'rejected'));

create table if not exists public.case_reviewer_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_check_id uuid not null references public.tenant_checks(id) on delete cascade,
  author_id uuid not null references public.users(id),
  author_role text not null check (author_role in ('admin', 'landlord')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_case_reviewer_notes_check_id
  on public.case_reviewer_notes(tenant_check_id, created_at desc);

alter table public.case_reviewer_notes enable row level security;

drop policy if exists "Landlords read reviewer notes for own checks" on public.case_reviewer_notes;
create policy "Landlords read reviewer notes for own checks"
  on public.case_reviewer_notes for select
  using (
    exists (
      select 1 from public.tenant_checks tc
      where tc.id = case_reviewer_notes.tenant_check_id
        and tc.landlord_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

drop policy if exists "Landlords insert reviewer notes for own checks" on public.case_reviewer_notes;
create policy "Landlords insert reviewer notes for own checks"
  on public.case_reviewer_notes for insert
  with check (
    author_id = auth.uid()
    and author_role in ('admin', 'landlord')
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.tenant_checks tc
        where tc.id = tenant_check_id
          and tc.landlord_id = auth.uid()
      )
    )
  );

drop policy if exists "Admins manage reviewer notes" on public.case_reviewer_notes;
create policy "Admins manage reviewer notes"
  on public.case_reviewer_notes for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

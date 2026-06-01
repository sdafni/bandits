-- Normalize legacy document aliases in tenant_checks (fixes duplicate Residence Permit rows).
-- Idempotent: safe if 004 was skipped, failed, or document_requirements is missing.

-- ---------------------------------------------------------------------------
-- 1) Normalize requested_documents (no dependency on document_requirements)
-- ---------------------------------------------------------------------------

update public.tenant_checks tc
set requested_documents = sub.normalized_documents
from (
  select
    id,
    coalesce(
      array_agg(distinct normalized_type order by normalized_type)
        filter (where normalized_type is not null),
      '{}'::text[]
    ) as normalized_documents
  from (
    select
      tc_inner.id,
      case doc_type
        when 'accountant_letter' then 'employer_letter'
        when 'employment_letter' then 'employer_letter'
        when 'freelance_income' then 'payslips'
        when 'government_id' then 'national_id'
        when 'guarantor_documents' then 'guarantor'
        when 'pet_documentation' then 'recommendation_letter'
        when 'previous_lease_agreement' then 'landlord_reference'
        when 'proof_of_income' then 'payslips'
        when 'proof_of_savings' then 'bank_statement'
        when 'relocation_contract' then 'employment_contract'
        when 'rental_reference' then 'landlord_reference'
        when 'residency_permit' then 'residence_permit'
        when 'supporting_document' then 'recommendation_letter'
        when 'visa_documents' then 'residence_permit'
        else doc_type
      end as normalized_type
    from public.tenant_checks tc_inner
    cross join lateral unnest(coalesce(tc_inner.requested_documents, '{}'::text[])) as doc_type
  ) expanded
  group by id
) sub
where tc.id = sub.id
  and tc.requested_documents is distinct from sub.normalized_documents;

-- ---------------------------------------------------------------------------
-- 2) Ensure document_requirements exists (004 may be recorded but column absent)
-- ---------------------------------------------------------------------------

alter table public.tenant_checks
  add column if not exists document_requirements jsonb not null default '[]'::jsonb;

comment on column public.tenant_checks.document_requirements is
  'Array of {documentType, priority} objects. requested_documents stays synced as deduped catalog values.';

-- ---------------------------------------------------------------------------
-- 3) Backfill document_requirements from requested_documents when empty
--    (runs only when the column is present — guarded for extra safety)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_checks'
      and column_name = 'document_requirements'
  ) then
    raise notice 'Skipping document_requirements backfill: column still missing after add attempt.';
    return;
  end if;

  update public.tenant_checks tc
  set document_requirements = coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'documentType',
          doc_type,
          'priority',
          case doc_type
            when 'afm' then 'required'
            when 'bank_statement' then 'required'
            when 'national_id' then 'required'
            when 'passport' then 'required'
            when 'payslips' then 'required'
            when 'bank_guarantee' then 'optional'
            when 'guarantor' then 'optional'
            when 'recommendation_letter' then 'optional'
            when 'tax_return' then 'optional'
            when 'utility_bill' then 'optional'
            else 'recommended'
          end
        )
        order by doc_type
      )
      from unnest(coalesce(tc.requested_documents, '{}'::text[])) as doc_type
    ),
    '[]'::jsonb
  )
  where coalesce(jsonb_array_length(tc.document_requirements), 0) = 0
    and coalesce(cardinality(tc.requested_documents), 0) > 0;
end $$;

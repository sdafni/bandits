-- Drop legacy create_tenant_check signature (12 params) before draft-workflow RPC update.
drop function if exists public.create_tenant_check(
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
  text
);

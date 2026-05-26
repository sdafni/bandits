create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
$$;

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.users
  where id = auth.uid()
$$;

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
on public.users
for insert
with check (
  auth.uid() = id
  and role = 'landlord'
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
on public.users
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (
  public.is_admin(auth.uid())
  or (
    auth.uid() = id
    and role = coalesce(public.current_user_role(), 'landlord')
    and lower(email) = lower(coalesce(public.current_user_email(), ''))
  )
);

drop policy if exists "tenant_public_profiles_update_owner_or_admin" on public.tenant_public_profiles;
drop policy if exists "tenant_public_profiles_admin_manage" on public.tenant_public_profiles;
create policy "tenant_public_profiles_admin_manage"
on public.tenant_public_profiles
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Step 04D — Profiles anonymous containment and grant cleanup
-- Compatibility phase: authenticated users still retain broad SELECT while consumers migrate.

begin;

revoke all privileges on table public.profiles from anon;

revoke all privileges on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant all privileges on table public.profiles to service_role;

-- Remove duplicate/public-role policies.
drop policy if exists "Allow authenticated users to read public profile info" on public.profiles;
drop policy if exists "Enable read access for authenticated users" on public.profiles;
drop policy if exists "Perfis públicos são visíveis para todos." on public.profiles;
drop policy if exists "Allow user to update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "Usuários podem inserir e atualizar seu próprio perfil." on public.profiles;

-- TEMPORARY compatibility policy. Replace with explicit public projection/RPC consumers.
create policy "profiles_select_authenticated_compat"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

commit;

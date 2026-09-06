-- Rollback for Step 04D — restores prior profile grants/policies.
-- WARNING: restores anonymous direct SELECT of all profile columns.

begin;

drop policy if exists "profiles_select_authenticated_compat" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

grant all privileges on table public.profiles to anon;
grant all privileges on table public.profiles to authenticated;
grant all privileges on table public.profiles to service_role;

create policy "Allow authenticated users to read public profile info"
on public.profiles for select to public
using (auth.role() = 'authenticated');

create policy "Allow user to update their own profile"
on public.profiles for update to public
using (auth.uid() = id);

create policy "Enable read access for authenticated users"
on public.profiles for select to authenticated
using (true);

create policy "Perfis públicos são visíveis para todos."
on public.profiles for select to public
using (true);

create policy "Users can insert their own profile."
on public.profiles for insert to public
with check (auth.uid() = id);

create policy "Users can update their own profile."
on public.profiles for update to public
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Usuários podem inserir e atualizar seu próprio perfil."
on public.profiles for update to public
using (auth.uid() = id);

commit;

-- Step 07D — consolidate plans/profile taxonomy RLS without changing product visibility.

-- Plans: active plans remain publicly readable; the second authenticated predicate was redundant.
drop policy if exists "Allow authenticated read access to active plans" on public.plans;
drop policy if exists "Enable read access for all users" on public.plans;
create policy plans_select_active
on public.plans for select to public
using (is_active = true);

-- profile_looking_for: all signed-in users may read; only owner may mutate.
drop policy if exists "Users can manage their own looking_for preferences" on public.profile_looking_for;
drop policy if exists "Enable read access for all authenticated users" on public.profile_looking_for;
drop policy if exists profile_looking_for_select_authenticated on public.profile_looking_for;
drop policy if exists profile_looking_for_insert_own on public.profile_looking_for;
drop policy if exists profile_looking_for_update_own on public.profile_looking_for;
drop policy if exists profile_looking_for_delete_own on public.profile_looking_for;

create policy profile_looking_for_select_authenticated
on public.profile_looking_for for select to authenticated
using (true);

create policy profile_looking_for_insert_own
on public.profile_looking_for for insert to authenticated
with check (profile_id = (select auth.uid()));

create policy profile_looking_for_update_own
on public.profile_looking_for for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy profile_looking_for_delete_own
on public.profile_looking_for for delete to authenticated
using (profile_id = (select auth.uid()));

-- profile_tribes: tribe associations remain public profile data; only owner may mutate.
drop policy if exists "Users can manage their own tribe associations" on public.profile_tribes;
drop policy if exists "Usuários podem gerenciar suas próprias tribos." on public.profile_tribes;
drop policy if exists "Allow read access to all profile_tribes" on public.profile_tribes;
drop policy if exists "Usuários podem ver as tribos de todos." on public.profile_tribes;
drop policy if exists profile_tribes_select_public on public.profile_tribes;
drop policy if exists profile_tribes_insert_own on public.profile_tribes;
drop policy if exists profile_tribes_update_own on public.profile_tribes;
drop policy if exists profile_tribes_delete_own on public.profile_tribes;

create policy profile_tribes_select_public
on public.profile_tribes for select to public
using (true);

create policy profile_tribes_insert_own
on public.profile_tribes for insert to authenticated
with check (profile_id = (select auth.uid()));

create policy profile_tribes_update_own
on public.profile_tribes for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy profile_tribes_delete_own
on public.profile_tribes for delete to authenticated
using (profile_id = (select auth.uid()));

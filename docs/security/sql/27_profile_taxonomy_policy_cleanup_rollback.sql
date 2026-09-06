-- Step 07D rollback — restore exact pre-cleanup policies.

drop policy if exists plans_select_active on public.plans;
create policy "Allow authenticated read access to active plans"
on public.plans for select to public
using ((auth.role() = 'authenticated'::text) and (is_active = true));
create policy "Enable read access for all users"
on public.plans for select to public
using (is_active = true);

drop policy if exists profile_looking_for_select_authenticated on public.profile_looking_for;
drop policy if exists profile_looking_for_insert_own on public.profile_looking_for;
drop policy if exists profile_looking_for_update_own on public.profile_looking_for;
drop policy if exists profile_looking_for_delete_own on public.profile_looking_for;
create policy "Users can manage their own looking_for preferences"
on public.profile_looking_for for all to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);
create policy "Enable read access for all authenticated users"
on public.profile_looking_for for select to authenticated
using (true);

drop policy if exists profile_tribes_select_public on public.profile_tribes;
drop policy if exists profile_tribes_insert_own on public.profile_tribes;
drop policy if exists profile_tribes_update_own on public.profile_tribes;
drop policy if exists profile_tribes_delete_own on public.profile_tribes;
create policy "Users can manage their own tribe associations"
on public.profile_tribes for all to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);
create policy "Usuários podem gerenciar suas próprias tribos."
on public.profile_tribes for all to public
using (auth.uid() = profile_id);
create policy "Allow read access to all profile_tribes"
on public.profile_tribes for select to authenticated
using (true);
create policy "Usuários podem ver as tribos de todos."
on public.profile_tribes for select to public
using (true);

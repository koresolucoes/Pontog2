create table if not exists public.hidden_profiles (
  owner_id uuid not null references auth.users(id) on delete cascade,
  hidden_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, hidden_id),
  constraint hidden_profiles_not_self check (owner_id <> hidden_id)
);

alter table public.hidden_profiles enable row level security;

drop policy if exists "hidden_profiles_select_own" on public.hidden_profiles;
create policy "hidden_profiles_select_own" on public.hidden_profiles
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "hidden_profiles_insert_own" on public.hidden_profiles;
create policy "hidden_profiles_insert_own" on public.hidden_profiles
for insert to authenticated
with check (owner_id = (select auth.uid()) and hidden_id <> (select auth.uid()));

drop policy if exists "hidden_profiles_delete_own" on public.hidden_profiles;
create policy "hidden_profiles_delete_own" on public.hidden_profiles
for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "pontog_authenticated_session_guard" on public.hidden_profiles;
create policy "pontog_authenticated_session_guard" on public.hidden_profiles
as restrictive for all to authenticated
using ((select private.current_user_session_allowed()))
with check ((select private.current_user_session_allowed()));

create or replace function public.hide_profile_v1(p_hidden_id uuid)
returns void
language plpgsql
security invoker
set search_path = 'pg_catalog','public','pg_temp'
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_hidden_id is null or p_hidden_id = v_uid then raise exception 'invalid_profile' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles p where p.id=p_hidden_id) then raise exception 'profile_not_found' using errcode='P0002'; end if;
  insert into public.hidden_profiles(owner_id, hidden_id) values(v_uid,p_hidden_id) on conflict do nothing;
end;
$$;

create or replace function public.unhide_profile_v1(p_hidden_id uuid)
returns void
language plpgsql
security invoker
set search_path = 'pg_catalog','public','pg_temp'
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  delete from public.hidden_profiles where owner_id=v_uid and hidden_id=p_hidden_id;
end;
$$;

create or replace function public.get_my_hidden_profiles_v1()
returns table(hidden_id uuid, username text, avatar_url text, created_at timestamptz)
language sql
security invoker
set search_path = 'pg_catalog','public','pg_temp'
as $$
  select h.hidden_id, p.username, p.avatar_url, h.created_at
  from public.hidden_profiles h
  join public.profiles p on p.id=h.hidden_id
  where h.owner_id=auth.uid()
  order by h.created_at desc;
$$;

revoke all on function public.hide_profile_v1(uuid) from public, anon;
revoke all on function public.unhide_profile_v1(uuid) from public, anon;
revoke all on function public.get_my_hidden_profiles_v1() from public, anon;
grant execute on function public.hide_profile_v1(uuid) to authenticated;
grant execute on function public.unhide_profile_v1(uuid) to authenticated;
grant execute on function public.get_my_hidden_profiles_v1() to authenticated;

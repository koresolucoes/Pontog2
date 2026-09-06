-- Step 04A — Harden grant_album_access SECURITY DEFINER RPC
-- Fixes NULL-auth fail-open and removes anon/PUBLIC execution.

begin;

create or replace function public.grant_album_access(
  p_album_id integer,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required.' using errcode = '22004';
  end if;

  select user_id
    into v_owner_id
  from public.private_albums
  where id = p_album_id;

  if v_owner_id is null then
    raise exception 'Album not found.' using errcode = 'P0002';
  end if;

  if v_owner_id is distinct from v_actor_id then
    raise exception 'You are not the owner of this album.' using errcode = '42501';
  end if;

  if p_target_user_id = v_owner_id then
    raise exception 'Owner already has access.' using errcode = '22023';
  end if;

  insert into public.private_album_access (owner_id, requester_id, status)
  values (v_owner_id, p_target_user_id, 'granted')
  on conflict (owner_id, requester_id)
  do update
    set status = 'granted', updated_at = now();
end;
$function$;

revoke execute on function public.grant_album_access(integer, uuid) from public;
revoke execute on function public.grant_album_access(integer, uuid) from anon;
grant execute on function public.grant_album_access(integer, uuid) to authenticated;
grant execute on function public.grant_album_access(integer, uuid) to service_role;

commit;

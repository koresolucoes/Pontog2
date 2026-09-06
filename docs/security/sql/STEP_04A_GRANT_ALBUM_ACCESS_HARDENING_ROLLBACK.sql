-- Rollback for Step 04A — restores previous grant_album_access implementation.
-- WARNING: this restores anon/PUBLIC execute and the previous NULL-auth comparison behavior.

begin;

create or replace function public.grant_album_access(
  p_album_id integer,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
as $function$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id from private_albums where id = p_album_id;

  if v_owner_id != auth.uid() then
    raise exception 'You are not the owner of this album.';
  end if;

  insert into private_album_access (owner_id, requester_id, status)
  values (v_owner_id, p_target_user_id, 'granted')
  on conflict (owner_id, requester_id)
  do update set status = 'granted', updated_at = now();
end;
$function$;

grant execute on function public.grant_album_access(integer, uuid) to public;
grant execute on function public.grant_album_access(integer, uuid) to anon;
grant execute on function public.grant_album_access(integer, uuid) to authenticated;
grant execute on function public.grant_album_access(integer, uuid) to service_role;

commit;

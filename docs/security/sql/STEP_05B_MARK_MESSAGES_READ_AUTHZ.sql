-- Step 05B — Harden mark_messages_as_read
-- Caller may mark only messages from conversations they participate in,
-- and never their own sent messages.

begin;

create or replace function public.mark_messages_as_read(message_ids integer[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_message_count integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if message_ids is null or coalesce(array_length(message_ids, 1), 0) = 0 then
    return;
  end if;

  v_message_count := array_length(message_ids, 1);
  if v_message_count > 500 then
    raise exception 'Too many messages in one request.' using errcode = '22023';
  end if;

  update public.messages m
  set read_at = now()
  where m.id = any(message_ids)
    and m.sender_id is distinct from v_actor_id
    and m.read_at is null
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = m.conversation_id
        and cp.user_id = v_actor_id
    );
end;
$function$;

revoke execute on function public.mark_messages_as_read(integer[]) from public;
revoke execute on function public.mark_messages_as_read(integer[]) from anon;
grant execute on function public.mark_messages_as_read(integer[]) to authenticated;
grant execute on function public.mark_messages_as_read(integer[]) to service_role;

commit;

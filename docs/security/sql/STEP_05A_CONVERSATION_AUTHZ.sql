-- Step 05A — Harden get_or_create_conversation
-- Requires authenticated caller to be one participant, respects blocks,
-- fixes boolean precedence/exact-pair lookup, and serializes creation per user pair.

begin;

create or replace function public.get_or_create_conversation(
  p_one uuid,
  p_two uuid
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_conversation_id bigint;
  v_pair_key text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_one is null or p_two is null or p_one = p_two then
    raise exception 'Two distinct participants are required.' using errcode = '22023';
  end if;

  if v_actor_id is distinct from p_one and v_actor_id is distinct from p_two then
    raise exception 'Caller must be a conversation participant.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_one)
     or not exists (select 1 from public.profiles where id = p_two) then
    raise exception 'Participant not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.blocks b
    where (b.blocker_id = p_one and b.blocked_id = p_two)
       or (b.blocker_id = p_two and b.blocked_id = p_one)
  ) then
    raise exception 'Conversation is not allowed.' using errcode = '42501';
  end if;

  -- Serialize concurrent creation of the same unordered pair.
  v_pair_key := least(p_one::text, p_two::text) || ':' || greatest(p_one::text, p_two::text);
  perform pg_advisory_xact_lock(hashtextextended(v_pair_key, 0));

  select cp.conversation_id
    into v_conversation_id
  from public.conversation_participants cp
  where cp.user_id in (p_one, p_two)
  group by cp.conversation_id
  having count(*) = 2
     and (
       select count(*)
       from public.conversation_participants all_cp
       where all_cp.conversation_id = cp.conversation_id
     ) = 2
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations default values
    returning id into v_conversation_id;

    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation_id, p_one), (v_conversation_id, p_two);
  end if;

  return v_conversation_id;
end;
$function$;

revoke execute on function public.get_or_create_conversation(uuid, uuid) from public;
revoke execute on function public.get_or_create_conversation(uuid, uuid) from anon;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid) to service_role;

commit;

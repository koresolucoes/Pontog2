-- Rollback for Step 05A — restores previous get_or_create_conversation implementation.
-- WARNING: restores anon/PUBLIC execute and arbitrary participant creation.

begin;

create or replace function public.get_or_create_conversation(p_one uuid, p_two uuid)
returns bigint
language plpgsql
security definer
as $function$
declare
  v_conversation_id bigint;
begin
  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  where
    (cp1.user_id = p_one and cp2.user_id = p_two) or
    (cp1.user_id = p_two and cp2.user_id = p_one)
    and not exists (
      select 1
      from public.conversation_participants cp3
      where cp3.conversation_id = cp1.conversation_id
        and cp3.user_id not in (p_one, p_two)
    )
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations default values returning id into v_conversation_id;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation_id, p_one), (v_conversation_id, p_two);
  end if;

  return v_conversation_id;
end;
$function$;

grant execute on function public.get_or_create_conversation(uuid, uuid) to public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to anon;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid) to service_role;

commit;

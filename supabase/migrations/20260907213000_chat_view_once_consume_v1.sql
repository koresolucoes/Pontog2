create or replace function public.consume_view_once_message_v1(p_message_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_message public.messages%rowtype;
  v_viewed_at timestamptz;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select m.*
    into v_message
  from public.messages m
  where m.id = p_message_id
  for update;

  if not found then
    raise exception 'message_not_found' using errcode = 'P0002';
  end if;

  if coalesce(v_message.is_view_once, false) is not true then
    raise exception 'message_is_not_view_once' using errcode = '22023';
  end if;

  if v_message.sender_id = v_uid then
    return jsonb_build_object(
      'id', v_message.id,
      'viewed_at', v_message.viewed_at,
      'already_consumed', v_message.viewed_at is not null,
      'is_sender_preview', true
    );
  end if;

  if not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = v_message.conversation_id
      and cp.user_id = v_uid
  ) then
    raise exception 'message_access_denied' using errcode = '42501';
  end if;

  if v_message.viewed_at is not null then
    raise exception 'view_once_already_consumed' using errcode = '42501';
  end if;

  update public.messages m
  set viewed_at = now()
  where m.id = p_message_id
    and m.viewed_at is null
  returning m.viewed_at into v_viewed_at;

  if v_viewed_at is null then
    raise exception 'view_once_already_consumed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_message.id,
    'viewed_at', v_viewed_at,
    'already_consumed', false,
    'is_sender_preview', false
  );
end;
$function$;

revoke all on function public.consume_view_once_message_v1(bigint) from public;
revoke all on function public.consume_view_once_message_v1(bigint) from anon;
grant execute on function public.consume_view_once_message_v1(bigint) to authenticated;
grant execute on function public.consume_view_once_message_v1(bigint) to service_role;

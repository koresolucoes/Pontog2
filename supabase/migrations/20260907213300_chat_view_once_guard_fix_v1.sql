create or replace function public.guard_recipient_view_once_update_v1()
returns trigger
language plpgsql
security invoker
set search_path = 'pg_catalog', 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_audio_cleared text := '{"type":"audio","url":null}';
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if current_user = 'postgres' and v_uid is null then
    return new;
  end if;

  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if old.sender_id = v_uid then
    return new;
  end if;

  if coalesce(old.is_view_once, false) is not true then
    raise exception 'recipient_update_not_allowed' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = old.conversation_id and cp.user_id = v_uid
  ) then
    raise exception 'message_access_denied' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.conversation_id is distinct from old.conversation_id
     or new.sender_id is distinct from old.sender_id
     or new.is_view_once is distinct from old.is_view_once
     or new.read_at is distinct from old.read_at
     or new.created_at is distinct from old.created_at
     or new.updated_at is distinct from old.updated_at then
    raise exception 'recipient_can_only_consume_view_once_media' using errcode = '42501';
  end if;

  if old.viewed_at is null then
    if new.viewed_at is null then
      raise exception 'viewed_at_required' using errcode = '42501';
    end if;
  else
    new.viewed_at := old.viewed_at;
  end if;

  if old.image_url is not null then
    if new.image_url is distinct from old.image_url and new.image_url is not null then
      raise exception 'invalid_view_once_image_transition' using errcode = '42501';
    end if;
    if new.content is distinct from old.content then
      raise exception 'recipient_cannot_change_message_content' using errcode = '42501';
    end if;
  else
    if new.image_url is distinct from old.image_url then
      raise exception 'recipient_cannot_change_image' using errcode = '42501';
    end if;
    if new.content is distinct from old.content and new.content is distinct from v_audio_cleared then
      raise exception 'invalid_view_once_content_transition' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.can_send_message_v1(p_conversation_id bigint, p_sender_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'public', 'pg_temp'
as $function$
  select
    auth.uid() is not null
    and p_sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = p_conversation_id and cp.user_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status::text = 'active'
    )
    and not exists (
      select 1
      from public.conversation_participants other_cp
      join public.profiles other_p on other_p.id = other_cp.user_id
      where other_cp.conversation_id = p_conversation_id
        and other_cp.user_id <> auth.uid()
        and other_p.status::text <> 'active'
    )
    and not exists (
      select 1
      from public.conversation_participants other_cp
      join public.blocks b
        on (b.blocker_id = auth.uid() and b.blocked_id = other_cp.user_id)
        or (b.blocker_id = other_cp.user_id and b.blocked_id = auth.uid())
      where other_cp.conversation_id = p_conversation_id
        and other_cp.user_id <> auth.uid()
    );
$function$;

revoke all on function public.can_send_message_v1(bigint, uuid) from public;
revoke all on function public.can_send_message_v1(bigint, uuid) from anon;
grant execute on function public.can_send_message_v1(bigint, uuid) to authenticated;
grant execute on function public.can_send_message_v1(bigint, uuid) to service_role;

drop policy if exists "Allow insert access to messages in own conversations" on public.messages;
create policy "Allow insert access to messages in own conversations"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.can_send_message_v1(conversation_id, sender_id)
);

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

drop trigger if exists trg_guard_recipient_view_once_update_v1 on public.messages;
create trigger trg_guard_recipient_view_once_update_v1
before update on public.messages
for each row
execute function public.guard_recipient_view_once_update_v1();

drop policy if exists "Allow recipient consume view once messages" on public.messages;
create policy "Allow recipient consume view once messages"
on public.messages
for update
to authenticated
using (
  sender_id <> auth.uid()
  and coalesce(is_view_once, false)
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
)
with check (
  sender_id <> auth.uid()
  and coalesce(is_view_once, false)
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

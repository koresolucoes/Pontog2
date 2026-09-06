-- Rollback for Step 05B — restores previous mark_messages_as_read implementation.
-- WARNING: restores anon/PUBLIC execute and lacks conversation-membership authorization.

begin;

create or replace function public.mark_messages_as_read(message_ids integer[])
returns void
language plpgsql
security definer
as $function$
begin
  update public.messages
  set read_at = now()
  where id = any(message_ids)
    and sender_id != auth.uid()
    and read_at is null;
end;
$function$;

grant execute on function public.mark_messages_as_read(integer[]) to public;
grant execute on function public.mark_messages_as_read(integer[]) to anon;
grant execute on function public.mark_messages_as_read(integer[]) to authenticated;
grant execute on function public.mark_messages_as_read(integer[]) to service_role;

commit;

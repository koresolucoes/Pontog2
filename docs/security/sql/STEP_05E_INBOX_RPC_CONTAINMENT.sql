-- Step 05E — Inbox / messaging RPC containment
-- Preserve existing business logic while closing anonymous execution and fixing search_path.

begin;

alter function public.delete_conversation(bigint)
  set search_path = public, pg_temp;
alter function public.get_my_conversations()
  set search_path = public, pg_temp;
alter function public.get_my_album_access_requests()
  set search_path = public, pg_temp;
alter function public.get_my_winks()
  set search_path = public, pg_temp;

revoke execute on function public.delete_conversation(bigint) from public;
revoke execute on function public.delete_conversation(bigint) from anon;
grant execute on function public.delete_conversation(bigint) to authenticated, service_role;

revoke execute on function public.get_my_conversations() from public;
revoke execute on function public.get_my_conversations() from anon;
grant execute on function public.get_my_conversations() to authenticated, service_role;

revoke execute on function public.get_my_album_access_requests() from public;
revoke execute on function public.get_my_album_access_requests() from anon;
grant execute on function public.get_my_album_access_requests() to authenticated, service_role;

revoke execute on function public.get_my_winks() from public;
revoke execute on function public.get_my_winks() from anon;
grant execute on function public.get_my_winks() to authenticated, service_role;

commit;

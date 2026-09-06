-- Rollback Step 05E — restore previous execution surface.

begin;

alter function public.delete_conversation(bigint) reset search_path;
alter function public.get_my_conversations() reset search_path;
alter function public.get_my_album_access_requests() reset search_path;
alter function public.get_my_winks() reset search_path;

grant execute on function public.delete_conversation(bigint) to public, anon, authenticated, service_role;
grant execute on function public.get_my_conversations() to public, anon, authenticated, service_role;
grant execute on function public.get_my_album_access_requests() to public, anon, authenticated, service_role;
grant execute on function public.get_my_winks() to public, anon, authenticated, service_role;

commit;

-- Rollback for Step 02A
-- WARNING: restores the previous insecure public execution surface.

begin;

grant execute on function public.get_all_users_for_admin() to public;
grant execute on function public.get_all_users_for_admin() to anon;
grant execute on function public.get_all_users_for_admin() to authenticated;
grant execute on function public.get_all_users_for_admin() to service_role;

commit;

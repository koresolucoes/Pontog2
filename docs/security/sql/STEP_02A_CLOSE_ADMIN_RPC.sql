-- Step 02A — Close public access to privileged admin RPC
-- Scope: public.get_all_users_for_admin()
-- Rollback: docs/security/sql/STEP_02A_CLOSE_ADMIN_RPC_ROLLBACK.sql

begin;

revoke execute on function public.get_all_users_for_admin() from public;
revoke execute on function public.get_all_users_for_admin() from anon;
revoke execute on function public.get_all_users_for_admin() from authenticated;

grant execute on function public.get_all_users_for_admin() to service_role;

commit;

-- Verification
select
  has_function_privilege('anon', 'public.get_all_users_for_admin()', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', 'public.get_all_users_for_admin()', 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', 'public.get_all_users_for_admin()', 'EXECUTE') as service_role_can_execute;

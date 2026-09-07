-- Rollback for 40_internalize_community_helpers_forward.sql

alter function private.can_view_community(uuid) set schema public;
alter function private.can_manage_community(uuid) set schema public;
alter function private.is_community_member(uuid) set schema public;

revoke all on function public.can_view_community(uuid) from public, anon;
revoke all on function public.can_manage_community(uuid) from public, anon;
revoke all on function public.is_community_member(uuid) from public, anon;

grant execute on function public.can_view_community(uuid) to authenticated, service_role;
grant execute on function public.can_manage_community(uuid) to authenticated, service_role;
grant execute on function public.is_community_member(uuid) to authenticated, service_role;

alter function public.can_view_community(uuid) set search_path = pg_catalog, public;
alter function public.can_manage_community(uuid) set search_path = pg_catalog, public;
alter function public.is_community_member(uuid) set search_path = pg_catalog, public;

-- Backend finalization — internalize Community RLS helpers.
-- These functions are policy primitives only and have no direct application callers.

create schema if not exists private;

grant usage on schema private to authenticated;

alter function public.can_view_community(uuid) set schema private;
alter function public.can_manage_community(uuid) set schema private;
alter function public.is_community_member(uuid) set schema private;

revoke all on function private.can_view_community(uuid) from public, anon;
revoke all on function private.can_manage_community(uuid) from public, anon;
revoke all on function private.is_community_member(uuid) from public, anon;

grant execute on function private.can_view_community(uuid) to authenticated, service_role;
grant execute on function private.can_manage_community(uuid) to authenticated, service_role;
grant execute on function private.is_community_member(uuid) to authenticated, service_role;

alter function private.can_view_community(uuid) set search_path = pg_catalog, public, private;
alter function private.can_manage_community(uuid) set search_path = pg_catalog, public, private;
alter function private.is_community_member(uuid) set search_path = pg_catalog, public, private;

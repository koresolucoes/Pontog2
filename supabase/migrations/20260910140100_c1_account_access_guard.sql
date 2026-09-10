-- C1: canonical account lifecycle guard for authenticated Data API callers.
-- This migration creates the guard primitives only. The global PostgREST
-- pre-request hook is enabled in a separate migration after verification.

create or replace function private.is_profile_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.profile_account_state s
    where s.profile_id = p_user_id
      and (
        s.status = 'active'::public.profile_status
        or (
          s.status = 'suspended'::public.profile_status
          and s.suspended_until is not null
          and s.suspended_until <= now()
        )
      )
  );
$$;

revoke all on function private.is_profile_active(uuid) from public, anon;
grant execute on function private.is_profile_active(uuid) to authenticated, service_role;

create or replace function public.restore_my_expired_suspension_v1()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_restored boolean := false;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.profiles
     set status = 'active'::public.profile_status,
         suspended_until = null,
         updated_at = now()
   where id = v_uid
     and status = 'suspended'::public.profile_status
     and suspended_until is not null
     and suspended_until <= now();

  v_restored := found;

  -- profiles_sync_account_state keeps the compatibility mirror aligned.
  return v_restored;
end;
$$;

revoke all on function public.restore_my_expired_suspension_v1() from public, anon;
grant execute on function public.restore_my_expired_suspension_v1() to authenticated, service_role;

create or replace function public.pontog_enforce_account_access()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_role text := coalesce(v_claims ->> 'role', '');
  v_subject text := nullif(v_claims ->> 'sub', '');
  v_uid uuid;
  v_status public.profile_status;
  v_suspended_until timestamptz;
begin
  -- Public traffic and server-side service-role traffic are not user lifecycle
  -- requests and must continue through their own RLS/server authorization.
  if v_role <> 'authenticated' then
    return;
  end if;

  begin
    v_uid := v_subject::uuid;
  exception when invalid_text_representation then
    v_uid := null;
  end;

  if v_uid is null then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'authentication_required',
        'message', 'Authentication required.'
      )::text,
      detail = json_build_object('status', 401)::text;
  end if;

  select s.status, s.suspended_until
    into v_status, v_suspended_until
    from public.profile_account_state s
   where s.profile_id = v_uid;

  if found then
    if v_status = 'active'::public.profile_status then
      return;
    end if;

    -- A temporary suspension is effectively over at its deadline. The client
    -- normalizes the persisted state through restore_my_expired_suspension_v1.
    if v_status = 'suspended'::public.profile_status
       and v_suspended_until is not null
       and v_suspended_until <= now() then
      return;
    end if;

    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', case when v_status = 'banned'::public.profile_status then 'account_banned' else 'account_suspended' end,
        'message', case when v_status = 'banned'::public.profile_status then 'Account access revoked.' else 'Account temporarily suspended.' end
      )::text,
      detail = json_build_object('status', 403)::text;
  end if;

  -- A valid Auth user may transiently exist before the profile trigger finishes.
  -- Deleted/nonexistent identities must not keep Data API access with an old JWT.
  if exists (select 1 from auth.users u where u.id = v_uid) then
    return;
  end if;

  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'account_not_available',
      'message', 'Account is not available.'
    )::text,
    detail = json_build_object('status', 401)::text;
end;
$$;

-- PostgREST itself executes this function for each request once enabled.
-- Keeping EXECUTE available is required for the authenticated role at pre-request time.
revoke all on function public.pontog_enforce_account_access() from public, anon;
grant execute on function public.pontog_enforce_account_access() to authenticated, service_role;

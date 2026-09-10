-- Blocked accounts still need the minimal self-profile lifecycle read so the
-- Consumer can render SuspendedScreen instead of failing into an auth loop.
-- No social/content mutation is exempted.

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
  v_path text := ltrim(coalesce(current_setting('request.path', true), ''), '/');
  v_uid uuid;
  v_status public.profile_status;
  v_suspended_until timestamptz;
begin
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
      message = json_build_object('code','authentication_required','message','Authentication required.')::text,
      detail = json_build_object('status',401)::text;
  end if;

  -- Lifecycle-only self operations. get_my_profile_v1 only exposes the caller's
  -- own profile when the target is itself; restore only succeeds after expiry.
  if v_path in ('rpc/get_my_profile_v1', 'rpc/restore_my_expired_suspension_v1') then
    return;
  end if;

  select s.status, s.suspended_until
    into v_status, v_suspended_until
    from public.profile_account_state s
   where s.profile_id = v_uid;

  if found then
    if v_status = 'active'::public.profile_status then return; end if;
    if v_status = 'suspended'::public.profile_status
       and v_suspended_until is not null
       and v_suspended_until <= now() then return; end if;

    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', case when v_status='banned'::public.profile_status then 'account_banned' else 'account_suspended' end,
        'message', case when v_status='banned'::public.profile_status then 'Account access revoked.' else 'Account temporarily suspended.' end
      )::text,
      detail = json_build_object('status',403)::text;
  end if;

  if exists (select 1 from auth.users u where u.id = v_uid) then return; end if;

  raise sqlstate 'PGRST' using
    message = json_build_object('code','account_not_available','message','Account is not available.')::text,
    detail = json_build_object('status',401)::text;
end;
$$;

revoke all on function public.pontog_enforce_account_access() from public, anon;
grant execute on function public.pontog_enforce_account_access() to authenticated, service_role;

notify pgrst, 'reload schema';

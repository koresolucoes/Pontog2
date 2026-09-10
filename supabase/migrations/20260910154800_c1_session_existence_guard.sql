-- C1 final hardening: a cryptographically valid JWT is not operational when its
-- Supabase session row no longer exists (global/local sign-out, security event).

create or replace function private.current_session_not_revoked()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sid_text text := nullif(auth.jwt() ->> 'session_id', '');
  v_sid uuid;
begin
  if v_uid is null or v_sid_text is null then return false; end if;
  begin v_sid := v_sid_text::uuid;
  exception when invalid_text_representation then return false;
  end;

  return exists (
    select 1 from auth.sessions s
    where s.id = v_sid and s.user_id = v_uid
  ) and not exists (
    select 1 from private.revoked_user_sessions r
    where r.session_id = v_sid and r.user_id = v_uid
  );
end;
$$;

create or replace function public.pg_server_session_allowed(p_user_id uuid, p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
     and p_session_id is not null
     and exists (
       select 1 from auth.sessions session_row
       where session_row.id = p_session_id and session_row.user_id = p_user_id
     )
     and (
       exists (
         select 1 from public.profile_account_state s
         where s.profile_id = p_user_id
           and (
             s.status = 'active'::public.profile_status
             or (
               s.status = 'suspended'::public.profile_status
               and s.suspended_until is not null
               and s.suspended_until <= now()
             )
           )
       )
       or (
         not exists (select 1 from public.profile_account_state s where s.profile_id = p_user_id)
         and not exists (select 1 from public.profiles p where p.id = p_user_id)
         and exists (select 1 from auth.users u where u.id = p_user_id)
       )
     )
     and not exists (
       select 1 from private.revoked_user_sessions r
       where r.user_id = p_user_id and r.session_id = p_session_id
     );
$$;

revoke all on function public.pg_server_session_allowed(uuid, uuid) from public, anon, authenticated;
grant execute on function public.pg_server_session_allowed(uuid, uuid) to service_role;

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
  v_sid_text text := nullif(v_claims ->> 'session_id', '');
  v_path text := ltrim(coalesce(current_setting('request.path', true), ''), '/');
  v_uid uuid;
  v_sid uuid;
  v_status public.profile_status;
  v_suspended_until timestamptz;
begin
  if v_role <> 'authenticated' then return; end if;

  begin v_uid := v_subject::uuid;
  exception when invalid_text_representation then v_uid := null;
  end;
  begin v_sid := v_sid_text::uuid;
  exception when invalid_text_representation then v_sid := null;
  end;

  if v_uid is null or v_sid is null then
    raise sqlstate 'PGRST' using
      message = json_build_object('code','authentication_required','message','Authentication required.')::text,
      detail = json_build_object('status',401)::text;
  end if;

  if not exists (select 1 from auth.sessions s where s.id = v_sid and s.user_id = v_uid) then
    raise sqlstate 'PGRST' using
      message = json_build_object('code','session_not_active','message','Session is no longer active.')::text,
      detail = json_build_object('status',401)::text;
  end if;

  if exists (select 1 from private.revoked_user_sessions r where r.user_id = v_uid and r.session_id = v_sid) then
    raise sqlstate 'PGRST' using
      message = json_build_object('code','session_revoked','message','Session access revoked.')::text,
      detail = json_build_object('status',401)::text;
  end if;

  if v_path in ('rpc/get_my_profile_v1', 'rpc/restore_my_expired_suspension_v1') then return; end if;

  select s.status, s.suspended_until into v_status, v_suspended_until
  from public.profile_account_state s where s.profile_id = v_uid;

  if found then
    if v_status = 'active'::public.profile_status then return; end if;
    if v_status = 'suspended'::public.profile_status and v_suspended_until is not null and v_suspended_until <= now() then return; end if;
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code',case when v_status='banned'::public.profile_status then 'account_banned' else 'account_suspended' end,
        'message',case when v_status='banned'::public.profile_status then 'Account access revoked.' else 'Account temporarily suspended.' end
      )::text,
      detail = json_build_object('status',403)::text;
  end if;

  -- Auth -> profile bootstrap is allowed while no profile/account-state exists.
  if exists (select 1 from auth.users u where u.id = v_uid)
     and not exists (select 1 from public.profiles p where p.id = v_uid) then return; end if;

  raise sqlstate 'PGRST' using
    message = json_build_object('code','account_not_available','message','Account is not available.')::text,
    detail = json_build_object('status',401)::text;
end;
$$;

revoke all on function public.pontog_enforce_account_access() from public, anon;
grant execute on function public.pontog_enforce_account_access() to authenticated, service_role;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
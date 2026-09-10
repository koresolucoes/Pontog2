create table if not exists public.account_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_status text not null check (account_status in ('suspended','banned')),
  reason text not null check (char_length(reason) between 3 and 120),
  details text not null check (char_length(details) between 10 and 4000),
  status text not null default 'pending' check (status in ('pending','in_review','approved','rejected')),
  resolution_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (resolution_reason is null or char_length(resolution_reason) <= 4000)
);
alter table public.account_appeals enable row level security;
revoke insert,update,delete on public.account_appeals from anon,authenticated;
grant select on public.account_appeals to authenticated;
create index if not exists account_appeals_user_created_idx on public.account_appeals(user_id,created_at desc);
create index if not exists account_appeals_queue_idx on public.account_appeals(status,created_at asc);
create unique index if not exists account_appeals_one_open_per_user_idx on public.account_appeals(user_id) where status in ('pending','in_review');

drop policy if exists account_appeals_own_read on public.account_appeals;
create policy account_appeals_own_read on public.account_appeals for select to authenticated using (user_id=(select auth.uid()));

create table if not exists private.appeal_decisions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  appeal_id uuid not null references public.account_appeals(id) on delete cascade,
  reviewer_id uuid not null,
  decision text not null check (decision in ('in_review','approved','rejected')),
  reason text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table private.appeal_decisions enable row level security;
revoke all on table private.appeal_decisions from public,anon,authenticated;
grant select,insert on table private.appeal_decisions to service_role;
create index if not exists appeal_decisions_appeal_created_idx on private.appeal_decisions(appeal_id,created_at desc);

create or replace function public.submit_my_appeal_v1(p_reason text,p_details text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_status public.profile_status; v_id uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.current_session_not_revoked() then raise exception 'session_not_active'; end if;
  select s.status into v_status from public.profile_account_state s where s.profile_id=v_actor;
  if v_status not in ('suspended'::public.profile_status,'banned'::public.profile_status) then raise exception 'appeal_not_available'; end if;
  if char_length(btrim(coalesce(p_reason,'')))<3 or char_length(btrim(coalesce(p_reason,'')))>120 then raise exception 'invalid_reason'; end if;
  if char_length(btrim(coalesce(p_details,'')))<10 or char_length(btrim(coalesce(p_details,'')))>4000 then raise exception 'invalid_details'; end if;
  if exists(select 1 from public.account_appeals a where a.user_id=v_actor and a.status in ('pending','in_review')) then raise exception 'appeal_already_open'; end if;
  if exists(select 1 from public.account_appeals a where a.user_id=v_actor and a.created_at>now()-interval '24 hours') then raise exception 'appeal_rate_limited'; end if;
  insert into public.account_appeals(user_id,account_status,reason,details)
  values(v_actor,v_status::text,btrim(p_reason),btrim(p_details)) returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.submit_my_appeal_v1(text,text) from public,anon;
grant execute on function public.submit_my_appeal_v1(text,text) to authenticated,service_role;

create or replace function public.get_my_appeals_v1()
returns table(id uuid,account_status text,reason text,details text,status text,resolution_reason text,reviewed_at timestamptz,created_at timestamptz,updated_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select a.id,a.account_status,a.reason,a.details,a.status,a.resolution_reason,a.reviewed_at,a.created_at,a.updated_at
 from public.account_appeals a
 where a.user_id=auth.uid()
 order by a.created_at desc limit 20;
$$;
revoke all on function public.get_my_appeals_v1() from public,anon;
grant execute on function public.get_my_appeals_v1() to authenticated,service_role;

create or replace function public.pg_admin_appeals_page(p_status text default null,p_search text default null,p_limit integer default 25,p_offset integer default 0)
returns table(id uuid,user_id uuid,display_name text,username text,account_status text,reason text,details text,status text,resolution_reason text,reviewed_by uuid,reviewed_at timestamptz,created_at timestamptz,total_count bigint)
language sql stable security definer set search_path=''
as $$
 with filtered as (
  select a.*,coalesce(nullif(p.display_name,''),nullif(p.username,''),'Pessoa') display_name,p.username
  from public.account_appeals a left join public.profiles p on p.id=a.user_id
  where (p_status is null or a.status=p_status)
    and (coalesce(p_search,'')='' or coalesce(p.display_name,'') ilike '%'||p_search||'%' or coalesce(p.username,'') ilike '%'||p_search||'%' or a.reason ilike '%'||p_search||'%' or a.details ilike '%'||p_search||'%')
 )
 select f.id,f.user_id,f.display_name,f.username,f.account_status,f.reason,f.details,f.status,f.resolution_reason,f.reviewed_by,f.reviewed_at,f.created_at,count(*) over()
 from filtered f
 order by case f.status when 'pending' then 1 when 'in_review' then 2 else 3 end,f.created_at asc
 limit greatest(1,least(coalesce(p_limit,25),100)) offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.pg_admin_appeals_page(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.pg_admin_appeals_page(text,text,integer,integer) to service_role;

create or replace function public.pg_admin_appeal_decide(p_appeal_id uuid,p_reviewer_id uuid,p_idempotency_key uuid,p_decision text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_existing private.appeal_decisions%rowtype; v_appeal public.account_appeals%rowtype; v_decision text:=lower(btrim(coalesce(p_decision,''))); v_reason text:=nullif(btrim(coalesce(p_reason,'')),''); v_result jsonb;
begin
 if p_appeal_id is null or p_reviewer_id is null or p_idempotency_key is null then raise exception 'invalid_request'; end if;
 if v_decision not in ('in_review','approved','rejected') then raise exception 'invalid_decision'; end if;
 if v_decision in ('approved','rejected') and (v_reason is null or char_length(v_reason)<3) then raise exception 'resolution_reason_required'; end if;
 if v_reason is not null and char_length(v_reason)>4000 then raise exception 'reason_too_long'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
 select * into v_existing from private.appeal_decisions where idempotency_key=p_idempotency_key;
 if found then
   if v_existing.appeal_id<>p_appeal_id or v_existing.reviewer_id<>p_reviewer_id then raise exception 'idempotency_key_conflict'; end if;
   return v_existing.result||jsonb_build_object('replayed',true);
 end if;
 select * into v_appeal from public.account_appeals where id=p_appeal_id for update;
 if not found then raise exception 'appeal_not_found'; end if;
 if v_appeal.status in ('approved','rejected') then raise exception 'appeal_already_terminal'; end if;
 if v_decision='approved' then perform public.pg_admin_set_user_state(v_appeal.user_id,'active'::public.profile_status,null); end if;
 update public.account_appeals set status=v_decision,resolution_reason=case when v_decision='in_review' then resolution_reason else v_reason end,reviewed_by=p_reviewer_id,reviewed_at=case when v_decision='in_review' then reviewed_at else now() end,updated_at=now() where id=p_appeal_id;
 v_result:=jsonb_build_object('appeal_id',p_appeal_id,'user_id',v_appeal.user_id,'decision',v_decision,'replayed',false);
 insert into private.appeal_decisions(idempotency_key,appeal_id,reviewer_id,decision,reason,result) values(p_idempotency_key,p_appeal_id,p_reviewer_id,v_decision,v_reason,v_result);
 return v_result;
end;$$;
revoke all on function public.pg_admin_appeal_decide(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.pg_admin_appeal_decide(uuid,uuid,uuid,text,text) to service_role;

create or replace function public.pontog_enforce_account_access()
returns void language plpgsql security definer set search_path=''
as $$
declare
 v_claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
 v_role text:=coalesce(v_claims->>'role',''); v_subject text:=nullif(v_claims->>'sub',''); v_sid_text text:=nullif(v_claims->>'session_id','');
 v_path text:=ltrim(coalesce(current_setting('request.path',true),''),'/'); v_uid uuid; v_sid uuid; v_status public.profile_status; v_suspended_until timestamptz;
begin
 if v_role<>'authenticated' then return; end if;
 begin v_uid:=v_subject::uuid; exception when invalid_text_representation then v_uid:=null; end;
 begin v_sid:=v_sid_text::uuid; exception when invalid_text_representation then v_sid:=null; end;
 if v_uid is null or v_sid is null then raise sqlstate 'PGRST' using message=json_build_object('code','authentication_required','message','Authentication required.')::text,detail=json_build_object('status',401)::text; end if;
 if not exists(select 1 from auth.sessions s where s.id=v_sid and s.user_id=v_uid) then raise sqlstate 'PGRST' using message=json_build_object('code','session_not_active','message','Session is no longer active.')::text,detail=json_build_object('status',401)::text; end if;
 if exists(select 1 from private.revoked_user_sessions r where r.user_id=v_uid and r.session_id=v_sid) then raise sqlstate 'PGRST' using message=json_build_object('code','session_revoked','message','Session access revoked.')::text,detail=json_build_object('status',401)::text; end if;
 if v_path in ('rpc/get_my_profile_v1','rpc/restore_my_expired_suspension_v1','rpc/submit_my_appeal_v1','rpc/get_my_appeals_v1','rpc/create_my_support_ticket_v1','rpc/get_my_support_tickets_v1','rpc/get_my_support_messages_v1','rpc/send_my_support_message_v1') then return; end if;
 select s.status,s.suspended_until into v_status,v_suspended_until from public.profile_account_state s where s.profile_id=v_uid;
 if found then
  if v_status='active'::public.profile_status then return; end if;
  if v_status='suspended'::public.profile_status and v_suspended_until is not null and v_suspended_until<=now() then return; end if;
  raise sqlstate 'PGRST' using message=json_build_object('code',case when v_status='banned'::public.profile_status then 'account_banned' else 'account_suspended' end,'message',case when v_status='banned'::public.profile_status then 'Account access revoked.' else 'Account temporarily suspended.' end)::text,detail=json_build_object('status',403)::text;
 end if;
 if exists(select 1 from auth.users u where u.id=v_uid) and not exists(select 1 from public.profiles p where p.id=v_uid) then return; end if;
 raise sqlstate 'PGRST' using message=json_build_object('code','account_not_available','message','Account is not available.')::text,detail=json_build_object('status',401)::text;
end;$$;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='account_appeals') then
  alter publication supabase_realtime add table public.account_appeals;
 end if;
end $$;
notify pgrst,'reload schema';
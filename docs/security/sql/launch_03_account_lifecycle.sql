-- Launch P0: account lifecycle, consent and onboarding contracts.

create table if not exists public.user_consents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  age_confirmed boolean not null default false,
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_consents enable row level security;
revoke all on public.user_consents from public, anon;
grant select, insert, update on public.user_consents to authenticated;
grant all on public.user_consents to service_role;

drop policy if exists user_consents_select_own on public.user_consents;
create policy user_consents_select_own on public.user_consents
for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists user_consents_insert_own on public.user_consents;
create policy user_consents_insert_own on public.user_consents
for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists user_consents_update_own on public.user_consents;
create policy user_consents_update_own on public.user_consents
for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create or replace function public.get_my_consent_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case when uc.profile_id is null then null else to_jsonb(uc) end
  from (select auth.uid() as uid) a
  left join public.user_consents uc on uc.profile_id = a.uid;
$$;

create or replace function public.accept_my_consent_v1(
  p_terms_version text,
  p_privacy_version text,
  p_age_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_age_confirmed is distinct from true then raise exception 'adult_confirmation_required' using errcode='42501'; end if;
  if nullif(btrim(p_terms_version),'') is null or nullif(btrim(p_privacy_version),'') is null then
    raise exception 'consent_version_required' using errcode='22023';
  end if;

  insert into public.user_consents(profile_id,terms_version,privacy_version,age_confirmed,accepted_at,updated_at)
  values(v_uid,p_terms_version,p_privacy_version,true,now(),now())
  on conflict(profile_id) do update set
    terms_version=excluded.terms_version,
    privacy_version=excluded.privacy_version,
    age_confirmed=true,
    accepted_at=now(),
    updated_at=now();

  return public.get_my_consent_v1();
end;
$$;

create or replace function public.complete_onboarding_v2(
  p_username text,
  p_date_of_birth date,
  p_status_text text default null,
  p_tribe_ids bigint[] default '{}'::bigint[],
  p_terms_version text default '2026-09-07',
  p_privacy_version text default '2026-09-07'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if nullif(btrim(p_username),'') is null then raise exception 'username_required' using errcode='22023'; end if;
  if p_date_of_birth is null then raise exception 'date_of_birth_required' using errcode='22023'; end if;
  if p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'underage_not_allowed' using errcode='42501';
  end if;

  insert into public.profile_private(profile_id,date_of_birth,updated_at)
  values(v_uid,p_date_of_birth,now())
  on conflict(profile_id) do update set date_of_birth=excluded.date_of_birth, updated_at=now();

  update public.profiles
  set username=left(btrim(p_username),64),
      status_text=left(coalesce(p_status_text,''),500),
      has_completed_onboarding=true,
      tribes_configured=true,
      updated_at=now()
  where id=v_uid;
  if not found then raise exception 'profile_not_found' using errcode='P0002'; end if;

  delete from public.profile_tribes where profile_id=v_uid;
  if coalesce(array_length(p_tribe_ids,1),0) > 0 then
    insert into public.profile_tribes(profile_id,tribe_id)
    select v_uid,t.id from public.tribes t where t.id = any(p_tribe_ids)
    on conflict do nothing;
  end if;

  perform public.accept_my_consent_v1(p_terms_version,p_privacy_version,true);
  return public.get_my_profile_v1();
end;
$$;

create or replace function public.anonymize_account_server_v1(
  p_actor_id uuid,
  p_reason text default 'user_requested'
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_actor_id is null then raise exception 'actor_required' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id) then return true; end if;

  -- Remove user-generated/social content. Payments and safety/audit records remain
  -- linked only to the anonymized profile id for legal/accounting integrity.
  delete from public.agora_comment_likes where user_id=p_actor_id;
  delete from public.agora_post_comments where user_id=p_actor_id;
  delete from public.agora_post_likes where user_id=p_actor_id;
  delete from public.agora_posts where user_id=p_actor_id;
  delete from public.blocks where blocker_id=p_actor_id or blocked_id=p_actor_id;
  update public.communities set creator_id=null where creator_id=p_actor_id;
  delete from public.community_comments where author_id=p_actor_id;
  delete from public.community_join_requests where user_id=p_actor_id;
  delete from public.community_members where user_id=p_actor_id;
  delete from public.community_post_likes where user_id=p_actor_id;
  delete from public.community_posts where author_id=p_actor_id;
  delete from public.favorites where user_id=p_actor_id or favorite_id=p_actor_id;
  delete from public.messages where sender_id=p_actor_id;
  delete from public.conversation_participants where user_id=p_actor_id;
  delete from public.news_comment_likes where user_id=p_actor_id;
  delete from public.news_comments where user_id=p_actor_id;
  delete from public.notification_preferences where user_id=p_actor_id;
  delete from public.private_album_access where owner_id=p_actor_id or requester_id=p_actor_id;
  delete from public.private_albums where user_id=p_actor_id;
  delete from public.profile_looking_for where profile_id=p_actor_id;
  delete from public.profile_tribes where profile_id=p_actor_id;
  delete from public.profile_verification_requests where user_id=p_actor_id;
  delete from public.profile_views where viewer_id=p_actor_id or viewed_id=p_actor_id;
  delete from public.user_connections where follower_id=p_actor_id or following_id=p_actor_id;
  delete from public.venue_checkins where user_id=p_actor_id;
  delete from public.video_comment_likes where user_id=p_actor_id;
  delete from public.video_comments where user_id=p_actor_id;
  delete from public.video_ratings where user_id=p_actor_id;
  delete from public.videos where user_id=p_actor_id;
  delete from public.winks where sender_id=p_actor_id or receiver_id=p_actor_id;
  delete from public.user_consents where profile_id=p_actor_id;

  update public.profile_private set
    full_name=null,date_of_birth=null,height_cm=null,weight_kg=null,position=null,hiv_status=null,
    status_relacionamento=null,tipo_corpo=null,etnia=null,habitos_fumo=null,habitos_bebida=null,
    redes_sociais=null,last_seen=null,kinks='{}',can_host=false,location=null,lat=null,lng=null,
    gender_identity=null,pronouns=null,sexual_orientation=null,relationship_status=null,
    looking_for='{}',interests='{}',visibility=null,oral_preference=null,accommodation_preference=null,
    current_checkin_venue_id=null,current_checkin_venue_name=null,is_traveling=false,updated_at=now()
  where profile_id=p_actor_id;

  update public.profiles set
    username='deleted_' || left(replace(p_actor_id::text,'-',''),12),
    full_name=null,display_name=null,avatar_url=null,date_of_birth=null,height_cm=null,weight_kg=null,
    status_text=null,location=null,position=null,hiv_status=null,public_photos='{}',status_relacionamento=null,
    tipo_corpo=null,etnia=null,habitos_fumo=null,habitos_bebida=null,redes_sociais=null,last_seen=null,
    is_incognito=true,has_completed_onboarding=false,status='banned',suspended_until=null,
    has_private_albums=false,kinks='{}',can_host=false,is_traveling=false,video_url=null,lat=null,lng=null,
    is_verified=false,has_seen_tour=false,gender_identity=null,pronouns=null,sexual_orientation=null,
    relationship_status=null,looking_for='{}',interests='{}',tribes_configured=false,visibility=null,
    oral_preference=null,accommodation_preference=null,current_checkin_venue_id=null,current_checkin_venue_name=null,
    updated_at=now()
  where id=p_actor_id;

  insert into public.profile_account_state(profile_id,status,updated_at)
  values(p_actor_id,'banned',now())
  on conflict(profile_id) do update set status='banned',updated_at=now();

  return true;
end;
$$;

revoke all on function public.get_my_consent_v1() from public, anon;
grant execute on function public.get_my_consent_v1() to authenticated, service_role;
revoke all on function public.accept_my_consent_v1(text,text,boolean) from public, anon;
grant execute on function public.accept_my_consent_v1(text,text,boolean) to authenticated, service_role;
revoke all on function public.complete_onboarding_v2(text,date,text,bigint[],text,text) from public, anon;
grant execute on function public.complete_onboarding_v2(text,date,text,bigint[],text,text) to authenticated, service_role;
revoke all on function public.anonymize_account_server_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.anonymize_account_server_v1(uuid,text) to service_role;

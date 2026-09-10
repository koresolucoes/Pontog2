create table if not exists private.moderation_content_state (
  target_type text not null,
  target_id text not null,
  state text not null default 'visible' check (state in ('visible','hidden','removed')),
  report_id bigint references public.reports(id) on delete set null,
  changed_by uuid,
  reason text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (target_type,target_id),
  check (reason is null or char_length(reason) <= 4000),
  check (octet_length(snapshot::text) <= 32768)
);
alter table private.moderation_content_state enable row level security;
revoke all on table private.moderation_content_state from public, anon, authenticated;
grant select,insert,update on table private.moderation_content_state to service_role;
create index if not exists moderation_content_state_report_idx on private.moderation_content_state(report_id,updated_at desc);

create or replace function private.moderation_content_visible(p_target_type text,p_target_id text)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select coalesce((
    select m.state='visible'
    from private.moderation_content_state m
    where m.target_type=p_target_type and m.target_id=p_target_id
  ),true);
$$;
revoke all on function private.moderation_content_visible(text,text) from public;
grant execute on function private.moderation_content_visible(text,text) to anon,authenticated,service_role;

create or replace function private.can_view_agora_post(p_post_id bigint,p_allow_own_expired boolean default false)
returns boolean
language sql stable security definer
set search_path='pg_catalog','public','private'
as $$
  with actor as (
    select p.id,coalesce(p.visibility,'todos') visibility
    from public.profiles p
    where p.id=auth.uid() and p.status='active'::public.profile_status
  ), target as (
    select ap.id,ap.user_id,ap.expires_at,p.status,coalesce(p.is_incognito,false) is_incognito,coalesce(p.visibility,'todos') visibility
    from public.agora_posts ap join public.profiles p on p.id=ap.user_id
    where ap.id=p_post_id and private.moderation_content_visible('agora_post',ap.id::text)
  ), shared_tribe as (
    select exists(
      select 1 from public.profile_tribes a join public.profile_tribes t on t.tribe_id=a.tribe_id
      where a.profile_id=auth.uid() and t.profile_id=(select user_id from target)
    ) yes
  )
  select exists(
    select 1 from actor a cross join target t cross join shared_tribe st
    where t.status='active'::public.profile_status
      and (t.user_id=auth.uid() or (
        t.expires_at>now() and t.is_incognito=false
        and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=t.user_id) or (b.blocker_id=t.user_id and b.blocked_id=auth.uid()))
        and (a.visibility='todos' or st.yes) and (t.visibility='todos' or st.yes)
      ))
      and (t.expires_at>now() or (p_allow_own_expired and t.user_id=auth.uid()))
  );
$$;

create or replace function private.can_view_community(p_community_id uuid)
returns boolean
language sql stable security definer
set search_path='pg_catalog','public','private'
as $$
  select exists(
    select 1 from public.communities c
    where c.id=p_community_id
      and private.moderation_content_visible('community',c.id::text)
      and (c.is_private=false or c.creator_id=auth.uid() or exists(select 1 from public.community_members cm where cm.community_id=c.id and cm.user_id=auth.uid()))
  );
$$;

drop policy if exists moderation_visible on public.agora_posts;
create policy moderation_visible on public.agora_posts as restrictive for select to authenticated
using (private.moderation_content_visible('agora_post',id::text));

drop policy if exists moderation_visible on public.agora_post_comments;
create policy moderation_visible on public.agora_post_comments as restrictive for select to authenticated
using (private.moderation_content_visible('agora_comment',id::text) and private.moderation_content_visible('agora_post',post_id::text));

drop policy if exists moderation_visible on public.videos;
create policy moderation_visible on public.videos as restrictive for select to public
using (private.moderation_content_visible('video',id::text));

drop policy if exists moderation_visible on public.video_comments;
create policy moderation_visible on public.video_comments as restrictive for select to public
using (private.moderation_content_visible('video_comment',id::text) and private.moderation_content_visible('video',video_id::text));

drop policy if exists moderation_visible on public.communities;
create policy moderation_visible on public.communities as restrictive for select to public
using (private.moderation_content_visible('community',id::text));

drop policy if exists moderation_visible on public.community_posts;
create policy moderation_visible on public.community_posts as restrictive for select to public
using (private.moderation_content_visible('community_post',id::text));

drop policy if exists moderation_visible on public.community_comments;
create policy moderation_visible on public.community_comments as restrictive for select to public
using (private.moderation_content_visible('community_comment',id::text) and exists(
  select 1 from public.community_posts cp where cp.id=community_comments.post_id and private.moderation_content_visible('community_post',cp.id::text)
));

drop policy if exists moderation_visible on public.venue_reviews;
create policy moderation_visible on public.venue_reviews as restrictive for select to public
using (private.moderation_content_visible('venue_review',id::text));

drop policy if exists moderation_visible on public.venue_review_replies;
create policy moderation_visible on public.venue_review_replies as restrictive for select to public
using (private.moderation_content_visible('venue_review_reply',id::text) and exists(
  select 1 from public.venue_reviews vr where vr.id=venue_review_replies.review_id and private.moderation_content_visible('venue_review',vr.id::text)
));

drop policy if exists moderation_parent_visible_insert on public.video_comments;
create policy moderation_parent_visible_insert on public.video_comments as restrictive for insert to authenticated
with check (private.moderation_content_visible('video',video_id::text));

drop policy if exists moderation_parent_visible_insert on public.community_posts;
create policy moderation_parent_visible_insert on public.community_posts as restrictive for insert to authenticated
with check (private.moderation_content_visible('community',community_id::text));

drop policy if exists moderation_parent_visible_insert on public.community_comments;
create policy moderation_parent_visible_insert on public.community_comments as restrictive for insert to authenticated
with check (exists(select 1 from public.community_posts cp where cp.id=community_comments.post_id and private.moderation_content_visible('community_post',cp.id::text)));

drop policy if exists moderation_parent_visible_insert on public.venue_review_replies;
create policy moderation_parent_visible_insert on public.venue_review_replies as restrictive for insert to authenticated
with check (private.moderation_content_visible('venue_review',review_id::text));

create or replace function public.get_active_agora_posts_paginated(p_page integer default 1,p_limit integer default 10)
returns table(id integer,user_id uuid,photo_url text,status_text text,expires_at timestamptz,created_at timestamptz,username text,avatar_url text,date_of_birth date,likes_count integer,comments_count integer,user_has_liked boolean)
language plpgsql security definer set search_path='public','pg_temp'
as $$
declare v_actor_id uuid:=auth.uid();
begin
  if v_actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return query
  with current_user_info as (
    select coalesce(actor.visibility,'todos') c_visibility,array(select pt.tribe_id from public.profile_tribes pt where pt.profile_id=v_actor_id) c_tribe_ids
    from public.profiles actor where actor.id=v_actor_id and actor.status='active'
  )
  select ap.id::integer,ap.user_id,ap.photo_url::text,ap.status_text::text,ap.expires_at,ap.created_at,p.username::text,p.avatar_url::text,
    case when p.date_of_birth is null then null::date else make_date(extract(year from p.date_of_birth)::integer,1,1) end,
    ap.likes_count,ap.comments_count,exists(select 1 from public.agora_post_likes apl where apl.post_id=ap.id and apl.user_id=v_actor_id)
  from public.agora_posts ap join public.profiles p on p.id=ap.user_id left join current_user_info cui on true
  where ap.expires_at>now() and private.moderation_content_visible('agora_post',ap.id::text)
    and p.status='active' and coalesce(p.is_incognito,false)=false
    and not exists(select 1 from public.blocks b where (b.blocker_id=v_actor_id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_actor_id))
    and (coalesce(cui.c_visibility,'todos')='todos' or exists(select 1 from public.profile_tribes pt where pt.profile_id=p.id and pt.tribe_id=any(cui.c_tribe_ids)))
    and (coalesce(p.visibility,'todos')='todos' or exists(select 1 from public.profile_tribes pt where pt.profile_id=p.id and pt.tribe_id=any(cui.c_tribe_ids)))
  order by ap.created_at desc
  limit greatest(1,least(coalesce(p_limit,10),50)) offset (greatest(1,coalesce(p_page,1))-1)*greatest(1,least(coalesce(p_limit,10),50));
end;$$;

create or replace function public.get_comments_for_post_with_details(p_post_id bigint)
returns table(id bigint,post_id bigint,user_id uuid,content text,created_at timestamptz,profiles json,likes_count bigint,user_has_liked boolean)
language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
declare v_actor_id uuid:=auth.uid();
begin
  if v_actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not private.can_view_agora_post(p_post_id,false) then return; end if;
  return query
  select c.id,c.post_id,c.user_id,c.content,c.created_at,json_build_object('username',p.username,'avatar_url',p.avatar_url),count(l.id),
    exists(select 1 from public.agora_comment_likes acl where acl.comment_id=c.id and acl.user_id=v_actor_id)
  from public.agora_post_comments c join public.profiles p on p.id=c.user_id left join public.agora_comment_likes l on l.comment_id=c.id
  where c.post_id=p_post_id and private.moderation_content_visible('agora_comment',c.id::text)
    and p.status='active'::public.profile_status
    and not exists(select 1 from public.blocks b where (b.blocker_id=v_actor_id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_actor_id))
  group by c.id,p.id order by c.created_at asc;
end;$$;

create or replace function public.get_video_comments_v2(p_video_id integer)
returns table(id bigint,video_id bigint,user_id uuid,comment_text text,created_at timestamptz,likes_count bigint,liked_by_me boolean,author_username text,author_display_name text,author_avatar_url text,author_is_verified boolean)
language sql stable security definer set search_path='pg_catalog','public','pg_temp'
as $$
 select vc.id,vc.video_id,vc.user_id,vc.comment,vc.created_at,
  (select count(*) from public.video_comment_likes vcl where vcl.comment_id=vc.id),
  case when auth.uid() is null then false else exists(select 1 from public.video_comment_likes vcl2 where vcl2.comment_id=vc.id and vcl2.user_id=auth.uid()) end,
  p.username,p.display_name,p.avatar_url,coalesce(p.is_verified,false)
 from public.video_comments vc left join public.profiles p on p.id=vc.user_id
 where vc.video_id=p_video_id and private.moderation_content_visible('video',p_video_id::text) and private.moderation_content_visible('video_comment',vc.id::text)
 order by vc.created_at asc,vc.id asc;
$$;

create or replace function public.get_video_feed_v2(p_limit integer default 20,p_offset integer default 0,p_category text default 'all',p_sort text default 'relevant')
returns table(id integer,user_id uuid,title text,video_url text,thumbnail_url text,description text,views_count integer,likes_count integer,rating numeric,ratings_count integer,comments_count bigint,created_at timestamptz,category text,is_nsfw boolean,liked_by_me boolean,rated_by_me integer,author_username text,author_display_name text,author_avatar_url text,author_is_verified boolean,author_subscription_tier text)
language sql stable security definer set search_path='pg_catalog','public','pg_temp'
as $$
 select v.id,v.user_id,v.title,v.video_url,v.thumbnail_url,v.description,coalesce(v.views_count,0),coalesce(v.likes_count,0),
  case when coalesce(v.ratings_count,0)>0 then v.rating else null end,coalesce(v.ratings_count,0),
  (select count(*) from public.video_comments vc where vc.video_id=v.id and private.moderation_content_visible('video_comment',vc.id::text)),
  v.created_at,coalesce(v.category,'outros'),coalesce(v.is_nsfw,false),
  case when auth.uid() is null then false else exists(select 1 from public.video_likes vl where vl.video_id=v.id and vl.user_id=auth.uid()) end,
  case when auth.uid() is null then null else (select vr.rating from public.video_ratings vr where vr.video_id=v.id and vr.user_id=auth.uid() limit 1) end,
  p.username,p.display_name,p.avatar_url,coalesce(p.is_verified,false),coalesce(p.subscription_tier::text,'free')
 from public.videos v left join public.profiles p on p.id=v.user_id
 where private.moderation_content_visible('video',v.id::text)
   and (p_category is null or p_category='all' or (p_category='favorites' and auth.uid() is not null and exists(select 1 from public.video_likes vlf where vlf.video_id=v.id and vlf.user_id=auth.uid())) or v.category=p_category)
 order by
  case when p_sort='recent' then extract(epoch from v.created_at) end desc nulls last,
  case when p_sort='views' then coalesce(v.views_count,0) end desc nulls last,
  case when p_sort='rating' and coalesce(v.ratings_count,0)>0 then v.rating end desc nulls last,
  case when p_sort='relevant' then (coalesce(v.likes_count,0)::numeric*3+coalesce(v.views_count,0)::numeric*0.05+coalesce((select count(*) from public.video_comments vc2 where vc2.video_id=v.id and private.moderation_content_visible('video_comment',vc2.id::text)),0)::numeric*2-greatest(extract(epoch from (now()-coalesce(v.created_at,now())))/86400,0)::numeric*0.08) end desc nulls last,
  v.created_at desc nulls last,v.id desc
 limit greatest(1,least(coalesce(p_limit,20),50)) offset greatest(coalesce(p_offset,0),0);
$$;

create or replace function public.pg_admin_set_content_moderation(
  p_target_type text,p_target_id text,p_state text,p_admin_id uuid,p_report_id bigint default null,p_reason text default null,p_snapshot jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_type text:=lower(btrim(coalesce(p_target_type,''))); v_id text:=btrim(coalesce(p_target_id,'')); v_state text:=lower(btrim(coalesce(p_state,''))); v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
 if v_type not in ('agora_post','agora_comment','video','video_comment','community','community_post','community_comment','venue_review','venue_review_reply') then raise exception 'unsupported_target_type'; end if;
 if v_id='' or p_admin_id is null then raise exception 'invalid_request'; end if;
 if v_state not in ('visible','hidden','removed') then raise exception 'invalid_state'; end if;
 if v_state<>'visible' and (v_reason is null or char_length(v_reason)<3) then raise exception 'reason_required'; end if;
 if v_reason is not null and char_length(v_reason)>4000 then raise exception 'reason_too_long'; end if;
 insert into private.moderation_content_state(target_type,target_id,state,report_id,changed_by,reason,snapshot,removed_at)
 values(v_type,v_id,v_state,p_report_id,p_admin_id,v_reason,coalesce(p_snapshot,'{}'::jsonb),case when v_state='removed' then now() else null end)
 on conflict(target_type,target_id) do update set state=excluded.state,report_id=coalesce(excluded.report_id,private.moderation_content_state.report_id),changed_by=excluded.changed_by,reason=excluded.reason,snapshot=case when excluded.snapshot='{}'::jsonb then private.moderation_content_state.snapshot else excluded.snapshot end,removed_at=case when excluded.state='removed' then coalesce(private.moderation_content_state.removed_at,now()) else null end,updated_at=now();
 return jsonb_build_object('target_type',v_type,'target_id',v_id,'state',v_state,'report_id',p_report_id);
end;$$;
revoke all on function public.pg_admin_set_content_moderation(text,text,text,uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.pg_admin_set_content_moderation(text,text,text,uuid,bigint,text,jsonb) to service_role;

notify pgrst,'reload schema';
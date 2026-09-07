-- Events + presence/check-in foundation.
-- Applied to production Supabase before this file was committed.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid null references public.venues(id) on delete set null,
  title text not null,
  description text null,
  cover_image_url text null,
  category text not null default 'party' check (category in ('party','karaoke','show','drag','meetup','festival','special_night','cultural','other')),
  start_time timestamptz not null,
  end_time timestamptz null,
  location_name text null,
  location_lat double precision null,
  location_lng double precision null,
  organizer_id uuid null references public.profiles(id) on delete set null,
  organizer_name text null,
  source_url text null,
  source_type text not null default 'curated_web',
  tags text[] not null default '{}'::text[],
  is_public boolean not null default true,
  is_verified boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (end_time is null or end_time > start_time),
  constraint events_location check (venue_id is not null or (location_name is not null and location_lat is not null and location_lng is not null))
);

create index if not exists events_start_time_idx on public.events(start_time);
create index if not exists events_venue_start_idx on public.events(venue_id,start_time);
create index if not exists events_public_verified_idx on public.events(is_public,is_verified,start_time) where status='scheduled';

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('interested','going')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
create index if not exists event_attendees_user_idx on public.event_attendees(user_id,updated_at desc);
create index if not exists event_attendees_event_status_idx on public.event_attendees(event_id,status);

create table if not exists public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  checked_out_at timestamptz null,
  expires_at timestamptz not null
);
create index if not exists event_checkins_event_active_idx on public.event_checkins(event_id,expires_at desc) where checked_out_at is null;
create index if not exists event_checkins_user_idx on public.event_checkins(user_id,created_at desc);
create unique index if not exists event_checkins_one_active_per_user_idx on public.event_checkins(user_id) where checked_out_at is null;

alter table public.venue_checkins add column if not exists checked_out_at timestamptz null;
alter table public.venue_checkins add column if not exists expires_at timestamptz null;
alter table public.venue_checkins add column if not exists source_event_id uuid null references public.events(id) on delete set null;
update public.venue_checkins set expires_at=coalesce(expires_at,created_at+interval '12 hours'), checked_out_at=coalesce(checked_out_at,created_at+interval '12 hours') where checked_out_at is null and created_at <= now()-interval '12 hours';
alter table public.venue_checkins alter column venue_id type uuid using venue_id::uuid;
alter table public.venue_checkins drop constraint if exists venue_checkins_venue_id_fkey;
alter table public.venue_checkins add constraint venue_checkins_venue_id_fkey foreign key(venue_id) references public.venues(id) on delete cascade;
create index if not exists venue_checkins_venue_active_idx on public.venue_checkins(venue_id,expires_at desc) where checked_out_at is null;
create index if not exists venue_checkins_user_history_idx on public.venue_checkins(user_id,created_at desc);
create unique index if not exists venue_checkins_one_active_per_user_idx on public.venue_checkins(user_id) where checked_out_at is null;

alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_checkins enable row level security;

revoke all on public.events from anon, authenticated;
revoke all on public.event_attendees from anon, authenticated;
revoke all on public.event_checkins from anon, authenticated;
revoke insert, update, delete on public.venue_checkins from authenticated;
grant select on public.event_attendees to authenticated;
grant select on public.event_checkins to authenticated;
grant select on public.venue_checkins to authenticated;

drop policy if exists event_attendees_own_read on public.event_attendees;
create policy event_attendees_own_read on public.event_attendees for select to authenticated using (user_id=auth.uid());
drop policy if exists event_checkins_own_read on public.event_checkins;
create policy event_checkins_own_read on public.event_checkins for select to authenticated using (user_id=auth.uid());
drop policy if exists venue_checkins_own_read on public.venue_checkins;
create policy venue_checkins_own_read on public.venue_checkins for select to authenticated using (user_id=auth.uid());

create or replace function public.set_my_checkin_v1(p_venue_id uuid default null)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid(); v_venue_name text; v_now timestamptz:=now();
begin
 if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 insert into public.profile_private(profile_id) values(v_uid) on conflict(profile_id) do nothing;
 update public.event_checkins set checked_out_at=v_now where user_id=v_uid and checked_out_at is null;
 update public.venue_checkins set checked_out_at=v_now where user_id=v_uid and checked_out_at is null;
 if p_venue_id is null then
   update public.profile_private set current_checkin_venue_id=null,current_checkin_venue_name=null,updated_at=v_now where profile_id=v_uid;
   return jsonb_build_object('venue_id',null,'venue_name',null,'checked_in_at',null);
 end if;
 select v.name into v_venue_name from public.venues v where v.id=p_venue_id and (v.is_verified=true or v.source_type='osm');
 if not found then raise exception 'venue_not_available' using errcode='22023'; end if;
 insert into public.venue_checkins(venue_id,user_id,created_at,expires_at,source_event_id) values(p_venue_id,v_uid,v_now,v_now+interval '12 hours',null);
 update public.profile_private set current_checkin_venue_id=p_venue_id,current_checkin_venue_name=v_venue_name,updated_at=v_now where profile_id=v_uid;
 return jsonb_build_object('venue_id',p_venue_id,'venue_name',v_venue_name,'checked_in_at',v_now,'expires_at',v_now+interval '12 hours');
end;$$;

drop function if exists public.get_venue_checkins(text);
create or replace function public.get_venue_checkins(p_venue_id uuid)
returns table(user_id uuid,username text,avatar_url text,checked_in_at timestamptz,event_id uuid,event_title text)
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_actor_id uuid:=auth.uid();
begin
 if v_actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
 return query select vc.user_id,p.username,p.avatar_url,vc.created_at,vc.source_event_id,e.title
 from public.venue_checkins vc join public.profiles p on p.id=vc.user_id left join public.events e on e.id=vc.source_event_id
 where vc.venue_id=p_venue_id and vc.checked_out_at is null and coalesce(vc.expires_at,vc.created_at+interval '12 hours')>now()
 and p.status='active' and coalesce(p.is_incognito,false)=false
 and not exists(select 1 from public.blocks b where (b.blocker_id=v_actor_id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_actor_id))
 order by vc.created_at desc;
end;$$;

create or replace function public.set_my_event_attendance_v1(p_event_id uuid,p_status text default null)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid(); v_event public.events%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_event from public.events where id=p_event_id and is_public=true and is_verified=true and status<>'cancelled';
 if not found then raise exception 'event_not_available' using errcode='22023'; end if;
 if p_status is null then delete from public.event_attendees where event_id=p_event_id and user_id=v_uid; return jsonb_build_object('event_id',p_event_id,'status',null); end if;
 if p_status not in ('interested','going') then raise exception 'invalid_attendance_status' using errcode='22023'; end if;
 insert into public.event_attendees(event_id,user_id,status) values(p_event_id,v_uid,p_status) on conflict(event_id,user_id) do update set status=excluded.status,updated_at=now();
 return jsonb_build_object('event_id',p_event_id,'status',p_status);
end;$$;

create or replace function public.set_my_event_checkin_v1(p_event_id uuid,p_active boolean default true)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid(); v_event public.events%rowtype; v_now timestamptz:=now(); v_end timestamptz; v_venue_name text;
begin
 if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_event from public.events where id=p_event_id and is_public=true and is_verified=true and status='scheduled';
 if not found then raise exception 'event_not_available' using errcode='22023'; end if;
 v_end:=coalesce(v_event.end_time,v_event.start_time+interval '6 hours');
 if p_active then
   if v_now < v_event.start_time-interval '2 hours' or v_now > v_end+interval '2 hours' then raise exception 'event_checkin_not_open' using errcode='22023'; end if;
   update public.event_checkins set checked_out_at=v_now where user_id=v_uid and checked_out_at is null;
   insert into public.event_checkins(event_id,user_id,created_at,expires_at) values(p_event_id,v_uid,v_now,least(v_now+interval '12 hours',v_end+interval '2 hours'));
   insert into public.event_attendees(event_id,user_id,status) values(p_event_id,v_uid,'going') on conflict(event_id,user_id) do update set status='going',updated_at=v_now;
   if v_event.venue_id is not null then
     select name into v_venue_name from public.venues where id=v_event.venue_id;
     update public.venue_checkins set checked_out_at=v_now where user_id=v_uid and checked_out_at is null;
     insert into public.venue_checkins(venue_id,user_id,created_at,expires_at,source_event_id) values(v_event.venue_id,v_uid,v_now,least(v_now+interval '12 hours',v_end+interval '2 hours'),p_event_id);
     insert into public.profile_private(profile_id) values(v_uid) on conflict(profile_id) do nothing;
     update public.profile_private set current_checkin_venue_id=v_event.venue_id,current_checkin_venue_name=v_venue_name,updated_at=v_now where profile_id=v_uid;
   end if;
   return jsonb_build_object('event_id',p_event_id,'active',true,'checked_in_at',v_now,'expires_at',least(v_now+interval '12 hours',v_end+interval '2 hours'),'venue_id',v_event.venue_id);
 else
   update public.event_checkins set checked_out_at=v_now where user_id=v_uid and event_id=p_event_id and checked_out_at is null;
   update public.venue_checkins set checked_out_at=v_now where user_id=v_uid and source_event_id=p_event_id and checked_out_at is null;
   if v_event.venue_id is not null then update public.profile_private set current_checkin_venue_id=null,current_checkin_venue_name=null,updated_at=v_now where profile_id=v_uid and current_checkin_venue_id=v_event.venue_id; end if;
   return jsonb_build_object('event_id',p_event_id,'active',false,'checked_out_at',v_now);
 end if;
end;$$;

create or replace function public.get_event_attendees_v1(p_event_id uuid)
returns table(user_id uuid,username text,avatar_url text,attendance_status text,is_checked_in boolean,checked_in_at timestamptz)
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_actor_id uuid:=auth.uid();
begin
 if v_actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
 return query select ea.user_id,p.username,p.avatar_url,ea.status,
 exists(select 1 from public.event_checkins ec where ec.event_id=p_event_id and ec.user_id=ea.user_id and ec.checked_out_at is null and ec.expires_at>now()),
 (select ec.created_at from public.event_checkins ec where ec.event_id=p_event_id and ec.user_id=ea.user_id and ec.checked_out_at is null and ec.expires_at>now() order by ec.created_at desc limit 1)
 from public.event_attendees ea join public.profiles p on p.id=ea.user_id
 where ea.event_id=p_event_id and p.status='active' and coalesce(p.is_incognito,false)=false
 and not exists(select 1 from public.blocks b where (b.blocker_id=v_actor_id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_actor_id))
 order by is_checked_in desc,ea.updated_at desc;
end;$$;

create or replace function public.get_venue_events_v1(p_venue_id uuid,p_limit integer default 10)
returns table(id uuid,venue_id uuid,title text,description text,cover_image_url text,category text,start_time timestamptz,end_time timestamptz,source_url text,tags text[],interested_count bigint,going_count bigint,here_now_count bigint)
language sql stable security definer set search_path='public','pg_temp' as $$
 select e.id,e.venue_id,e.title,e.description,e.cover_image_url,e.category,e.start_time,e.end_time,e.source_url,e.tags,
 (select count(*) from public.event_attendees a where a.event_id=e.id and a.status='interested'),
 (select count(*) from public.event_attendees a where a.event_id=e.id and a.status='going'),
 (select count(*) from public.event_checkins c where c.event_id=e.id and c.checked_out_at is null and c.expires_at>now())
 from public.events e where e.venue_id=p_venue_id and e.is_public=true and e.is_verified=true and e.status='scheduled' and coalesce(e.end_time,e.start_time+interval '6 hours')>now()-interval '2 hours'
 order by e.start_time asc limit greatest(1,least(p_limit,50));
$$;

create or replace function public.get_event_feed_v1(p_lat double precision default null,p_lng double precision default null,p_limit integer default 50)
returns table(id uuid,venue_id uuid,title text,description text,cover_image_url text,category text,start_time timestamptz,end_time timestamptz,location_name text,lat double precision,lng double precision,venue_name text,source_url text,tags text[],interested_count bigint,going_count bigint,here_now_count bigint)
language sql stable security definer set search_path='public','pg_temp' as $$
 select e.id,e.venue_id,e.title,e.description,e.cover_image_url,e.category,e.start_time,e.end_time,coalesce(v.name,e.location_name),coalesce(v.lat,e.location_lat),coalesce(v.lng,e.location_lng),v.name,e.source_url,e.tags,
 (select count(*) from public.event_attendees a where a.event_id=e.id and a.status='interested'),
 (select count(*) from public.event_attendees a where a.event_id=e.id and a.status='going'),
 (select count(*) from public.event_checkins c where c.event_id=e.id and c.checked_out_at is null and c.expires_at>now())
 from public.events e left join public.venues v on v.id=e.venue_id
 where e.is_public=true and e.is_verified=true and e.status='scheduled' and coalesce(e.end_time,e.start_time+interval '6 hours')>now()-interval '2 hours'
 order by case when p_lat is not null and p_lng is not null then power(coalesce(v.lat,e.location_lat)-p_lat,2)+power(coalesce(v.lng,e.location_lng)-p_lng,2) else 0 end asc,e.start_time asc
 limit greatest(1,least(p_limit,100));
$$;

grant execute on function public.set_my_checkin_v1(uuid) to authenticated;
grant execute on function public.get_venue_checkins(uuid) to authenticated;
grant execute on function public.set_my_event_attendance_v1(uuid,text) to authenticated;
grant execute on function public.set_my_event_checkin_v1(uuid,boolean) to authenticated;
grant execute on function public.get_event_attendees_v1(uuid) to authenticated;
grant execute on function public.get_venue_events_v1(uuid,integer) to anon,authenticated;
grant execute on function public.get_event_feed_v1(double precision,double precision,integer) to anon,authenticated;

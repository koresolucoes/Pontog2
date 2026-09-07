-- Backend finalization — additive profile contracts before closing direct profiles access.

create or replace function public.get_my_profile_v1()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select to_jsonb(p) || jsonb_build_object(
    'tribes', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name)
      from public.profile_tribes pt
      join public.tribes t on t.id = pt.tribe_id
      where pt.profile_id = p.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.profiles p
  where p.id = v_uid;

  return v_result;
end;
$$;

revoke all on function public.get_my_profile_v1() from public, anon;
grant execute on function public.get_my_profile_v1() to authenticated, service_role;

create or replace function public.ensure_my_profile_v1(
  p_username text default null,
  p_display_name text default null,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  v_username := coalesce(nullif(trim(p_username), ''), 'user_' || left(replace(v_uid::text, '-', ''), 10));

  insert into public.profiles(id, username, display_name, avatar_url)
  values (v_uid, left(v_username, 80), nullif(trim(p_display_name), ''), nullif(trim(p_avatar_url), ''))
  on conflict (id) do nothing;

  return public.get_my_profile_v1();
end;
$$;

revoke all on function public.ensure_my_profile_v1(text,text,text) from public, anon;
grant execute on function public.ensure_my_profile_v1(text,text,text) to authenticated, service_role;

create or replace function public.set_my_travel_mode(
  p_enabled boolean,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if coalesce(p_enabled,false) then
    if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
      raise exception 'invalid_coordinates' using errcode='22023';
    end if;

    update public.profiles
    set is_traveling=true,
        lat=p_lat,
        lng=p_lng,
        location=st_setsrid(st_makepoint(p_lng,p_lat),4326)::geography,
        updated_at=now()
    where id=v_uid and status='active';
  else
    update public.profiles
    set is_traveling=false,
        updated_at=now()
    where id=v_uid;
  end if;
end;
$$;

revoke all on function public.set_my_travel_mode(boolean,double precision,double precision) from public, anon;
grant execute on function public.set_my_travel_mode(boolean,double precision,double precision) to authenticated, service_role;

create or replace function public.get_nearby_profiles_v3(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 50,
  p_radius_km double precision default 50
)
returns table(
  id uuid, username text, avatar_url text, date_of_birth date, status_text text,
  lat double precision, lng double precision, distance_km double precision,
  is_verified boolean, subscription_tier text, tribes text[], looking_for text[],
  current_checkin_venue_id uuid, current_checkin_venue_name text, last_seen timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1,least(coalesce(p_limit,50),100));
  v_radius double precision := greatest(1,least(coalesce(p_radius_km,50),100));
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_coordinates' using errcode='22023';
  end if;

  return query
  with actor as (
    select coalesce(p.visibility,'todos') visibility,
           array(select pt.tribe_id from public.profile_tribes pt where pt.profile_id=v_uid) tribe_ids
    from public.profiles p where p.id=v_uid and p.status='active'
  ), candidates as (
    select p.*,
           round(coalesce(p.lat,st_y(p.location::geometry))::numeric,2)::double precision grid_lat,
           round(coalesce(p.lng,st_x(p.location::geometry))::numeric,2)::double precision grid_lng
    from public.profiles p left join actor a on true
    where p.id<>v_uid and p.status='active' and coalesce(p.is_incognito,false)=false
      and (p.location is not null or (p.lat is not null and p.lng is not null))
      and not exists(select 1 from public.blocks b where (b.blocker_id=v_uid and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_uid))
      and (coalesce(a.visibility,'todos')='todos' or exists(select 1 from public.profile_tribes pt where pt.profile_id=p.id and pt.tribe_id=any(a.tribe_ids)))
      and (coalesce(p.visibility,'todos')='todos' or exists(select 1 from public.profile_tribes pt where pt.profile_id=p.id and pt.tribe_id=any(a.tribe_ids)))
  ), measured as (
    select c.*, st_distance(st_setsrid(st_makepoint(c.grid_lng,c.grid_lat),4326)::geography,st_setsrid(st_makepoint(p_lng,p_lat),4326)::geography)/1000.0 approximate_distance_km
    from candidates c
  )
  select m.id,m.username,m.avatar_url,
         case when m.date_of_birth is null then null::date else make_date(extract(year from m.date_of_birth)::integer,1,1) end,
         m.status_text::text,m.grid_lat,m.grid_lng,m.approximate_distance_km,
         coalesce(m.is_verified,false),m.subscription_tier::text,
         array(select t.name::text from public.profile_tribes pt join public.tribes t on t.id=pt.tribe_id where pt.profile_id=m.id order by t.name)::text[],
         coalesce(m.looking_for,'{}'::text[]),
         ci.venue_uuid,ci.venue_name,m.last_seen
  from measured m
  left join lateral (
    select v.id venue_uuid, v.name venue_name
    from public.venue_checkins vc
    join public.venues v on v.id::text=vc.venue_id
    where vc.user_id=m.id and vc.created_at>now()-interval '12 hours'
    order by vc.created_at desc limit 1
  ) ci on true
  where m.approximate_distance_km<=v_radius
  order by m.approximate_distance_km asc
  limit v_limit;
end;
$$;

revoke all on function public.get_nearby_profiles_v3(double precision,double precision,integer,double precision) from public, anon;
grant execute on function public.get_nearby_profiles_v3(double precision,double precision,integer,double precision) to authenticated, service_role;

create or replace function public.get_popular_profiles_v2(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  id uuid, username text, avatar_url text, date_of_birth date, status_text text,
  lat double precision, lng double precision, distance_km double precision,
  is_verified boolean, subscription_tier text, tribes text[], looking_for text[],
  current_checkin_venue_id uuid, current_checkin_venue_name text, last_seen timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1,least(coalesce(p_limit,20),100));
  v_offset integer := greatest(0,coalesce(p_offset,0));
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_coordinates' using errcode='22023';
  end if;

  return query
  with actor as (
    select coalesce(p.visibility,'todos') visibility,
           array(select pt.tribe_id from public.profile_tribes pt where pt.profile_id=v_uid) tribe_ids
    from public.profiles p where p.id=v_uid and p.status='active'
  ), candidates as (
    select p.*,
           round(coalesce(p.lat,st_y(p.location::geometry))::numeric,2)::double precision grid_lat,
           round(coalesce(p.lng,st_x(p.location::geometry))::numeric,2)::double precision grid_lng
    from public.profiles p left join actor a on true
    where p.id<>v_uid and p.status='active' and coalesce(p.is_incognito,false)=false
      and (p.location is not null or (p.lat is not null and p.lng is not null))
      and not exists(select 1 from public.blocks b where (b.blocker_id=v_uid and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_uid))
      and (coalesce(a.visibility,'todos')='todos' or exists(select 1 from public.profile_tribes pt where pt.profile_id=p.id and pt.tribe_id=any(a.tribe_ids)))
      and (coalesce(p.visibility,'todos')='todos' or exists(select 1 from public.profile_tribes pt where pt.profile_id=p.id and pt.tribe_id=any(a.tribe_ids)))
  )
  select c.id,c.username,c.avatar_url,
         case when c.date_of_birth is null then null::date else make_date(extract(year from c.date_of_birth)::integer,1,1) end,
         c.status_text::text,c.grid_lat,c.grid_lng,
         st_distance(st_setsrid(st_makepoint(c.grid_lng,c.grid_lat),4326)::geography,st_setsrid(st_makepoint(p_lng,p_lat),4326)::geography)/1000.0,
         coalesce(c.is_verified,false),c.subscription_tier::text,
         array(select t.name::text from public.profile_tribes pt join public.tribes t on t.id=pt.tribe_id where pt.profile_id=c.id order by t.name)::text[],
         coalesce(c.looking_for,'{}'::text[]),
         ci.venue_uuid,ci.venue_name,c.last_seen
  from candidates c
  left join lateral (
    select v.id venue_uuid,v.name venue_name
    from public.venue_checkins vc join public.venues v on v.id::text=vc.venue_id
    where vc.user_id=c.id and vc.created_at>now()-interval '12 hours'
    order by vc.created_at desc limit 1
  ) ci on true
  order by c.is_verified desc,c.updated_at desc nulls last
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.get_popular_profiles_v2(double precision,double precision,integer,integer) from public, anon;
grant execute on function public.get_popular_profiles_v2(double precision,double precision,integer,integer) to authenticated, service_role;

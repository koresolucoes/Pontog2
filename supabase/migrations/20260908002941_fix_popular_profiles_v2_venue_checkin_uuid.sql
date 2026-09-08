-- Fix get_popular_profiles_v2 after venue_checkins.venue_id migrated to uuid.
-- Keeps the RPC contract intact and aligns active check-in semantics with get_nearby_profiles_v3.

create or replace function public.get_popular_profiles_v2(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  id uuid,
  username text,
  avatar_url text,
  date_of_birth date,
  status_text text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  is_verified boolean,
  subscription_tier text,
  tribes text[],
  looking_for text[],
  current_checkin_venue_id uuid,
  current_checkin_venue_name text,
  last_seen timestamptz
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_coordinates' using errcode = '22023';
  end if;

  return query
  with actor as (
    select
      coalesce(pp.visibility, 'todos') visibility,
      array(select pt.tribe_id from public.profile_tribes pt where pt.profile_id = v_uid) tribe_ids
    from public.profiles p
    left join public.profile_private pp on pp.profile_id = p.id
    where p.id = v_uid and p.status = 'active'
  ),
  candidates as (
    select
      p.id,
      p.username,
      p.avatar_url,
      p.status_text,
      p.is_verified,
      p.subscription_tier,
      p.last_seen,
      p.updated_at,
      pp.date_of_birth as private_date_of_birth,
      pp.looking_for as private_looking_for,
      round(coalesce(pp.lat, st_y(pp.location::geometry))::numeric, 2)::double precision grid_lat,
      round(coalesce(pp.lng, st_x(pp.location::geometry))::numeric, 2)::double precision grid_lng
    from public.profiles p
    join public.profile_private pp on pp.profile_id = p.id
    left join actor a on true
    where p.id <> v_uid
      and p.status = 'active'
      and coalesce(p.is_incognito, false) = false
      and (pp.location is not null or (pp.lat is not null and pp.lng is not null))
      and not exists (
        select 1
        from public.blocks b
        where (b.blocker_id = v_uid and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = v_uid)
      )
      and (
        coalesce(a.visibility, 'todos') = 'todos'
        or exists (
          select 1
          from public.profile_tribes pt
          where pt.profile_id = p.id and pt.tribe_id = any(a.tribe_ids)
        )
      )
      and (
        coalesce(pp.visibility, 'todos') = 'todos'
        or exists (
          select 1
          from public.profile_tribes pt
          where pt.profile_id = p.id and pt.tribe_id = any(a.tribe_ids)
        )
      )
  )
  select
    c.id,
    c.username,
    c.avatar_url,
    case
      when c.private_date_of_birth is null then null::date
      else make_date(extract(year from c.private_date_of_birth)::integer, 1, 1)
    end,
    c.status_text::text,
    c.grid_lat,
    c.grid_lng,
    st_distance(
      st_setsrid(st_makepoint(c.grid_lng, c.grid_lat), 4326)::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) / 1000.0,
    coalesce(c.is_verified, false),
    c.subscription_tier::text,
    array(
      select t.name::text
      from public.profile_tribes pt
      join public.tribes t on t.id = pt.tribe_id
      where pt.profile_id = c.id
      order by t.name
    )::text[],
    coalesce(c.private_looking_for, '{}'::text[]),
    ci.venue_uuid,
    ci.venue_name,
    c.last_seen
  from candidates c
  left join lateral (
    select v.id venue_uuid, v.name venue_name
    from public.venue_checkins vc
    join public.venues v on v.id = vc.venue_id
    where vc.user_id = c.id
      and vc.checked_out_at is null
      and coalesce(vc.expires_at, vc.created_at + interval '12 hours') > now()
    order by vc.created_at desc
    limit 1
  ) ci on true
  order by c.is_verified desc, c.updated_at desc nulls last
  limit v_limit offset v_offset;
end;
$function$;

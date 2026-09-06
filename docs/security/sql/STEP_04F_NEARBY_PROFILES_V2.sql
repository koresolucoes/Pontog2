-- Step 04F — Privacy-safe discovery projection
-- Additive v2 contract. Does not replace get_nearby_profiles until frontend migration.
-- Coordinates are rounded to a ~1 km grid and distance is returned only as a band.

begin;

create or replace function public.get_nearby_profiles_v2(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 50,
  p_radius_km double precision default 50
)
returns table (
  id uuid,
  username text,
  avatar_url text,
  age integer,
  status_text text,
  approximate_lat double precision,
  approximate_lng double precision,
  distance_band text,
  is_verified boolean,
  subscription_tier text,
  tribes text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_radius double precision := greatest(1, least(coalesce(p_radius_km, 50), 100));
begin
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    raise exception 'Invalid coordinates.' using errcode = '22023';
  end if;

  return query
  with current_user_info as (
    select
      coalesce(actor.visibility, 'todos') as actor_visibility,
      array(
        select pt.tribe_id
        from public.profile_tribes pt
        where pt.profile_id = v_actor_id
      ) as actor_tribe_ids
    from public.profiles actor
    where actor.id = v_actor_id
  ), candidates as (
    select
      p.*,
      round(coalesce(p.lat, st_y(p.location::geometry))::numeric, 2)::double precision as grid_lat,
      round(coalesce(p.lng, st_x(p.location::geometry))::numeric, 2)::double precision as grid_lng
    from public.profiles p
    left join current_user_info cui on true
    where p.id <> v_actor_id
      and p.status::text = 'active'
      and not p.is_incognito
      and (p.location is not null or (p.lat is not null and p.lng is not null))
      and not exists (
        select 1
        from public.blocks b
        where (b.blocker_id = v_actor_id and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = v_actor_id)
      )
      and (
        coalesce(cui.actor_visibility, 'todos') = 'todos'
        or exists (
          select 1
          from public.profile_tribes target_pt
          where target_pt.profile_id = p.id
            and target_pt.tribe_id = any(cui.actor_tribe_ids)
        )
      )
      and (
        coalesce(p.visibility, 'todos') = 'todos'
        or exists (
          select 1
          from public.profile_tribes target_pt
          where target_pt.profile_id = p.id
            and target_pt.tribe_id = any(cui.actor_tribe_ids)
        )
      )
  ), measured as (
    select
      c.*,
      st_distance(
        st_setsrid(st_makepoint(c.grid_lng, c.grid_lat), 4326)::geography,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
      ) / 1000.0 as approximate_distance_km
    from candidates c
  )
  select
    m.id,
    m.username,
    m.avatar_url,
    case
      when m.date_of_birth is null then null
      else extract(year from age(current_date, m.date_of_birth))::integer
    end as age,
    m.status_text::text,
    m.grid_lat as approximate_lat,
    m.grid_lng as approximate_lng,
    case
      when m.approximate_distance_km < 1 then '<1 km'
      when m.approximate_distance_km < 3 then '1-3 km'
      when m.approximate_distance_km < 5 then '3-5 km'
      when m.approximate_distance_km < 10 then '5-10 km'
      when m.approximate_distance_km < 25 then '10-25 km'
      when m.approximate_distance_km < 50 then '25-50 km'
      else '50+ km'
    end as distance_band,
    coalesce(m.is_verified, false) as is_verified,
    m.subscription_tier::text,
    array(
      select t.name::text
      from public.profile_tribes pt
      join public.tribes t on t.id = pt.tribe_id
      where pt.profile_id = m.id
      order by t.name
    )::text[] as tribes
  from measured m
  where m.approximate_distance_km <= v_radius
  order by m.approximate_distance_km asc
  limit v_limit;
end;
$function$;

revoke execute on function public.get_nearby_profiles_v2(double precision, double precision, integer, double precision) from public;
revoke execute on function public.get_nearby_profiles_v2(double precision, double precision, integer, double precision) from anon;
grant execute on function public.get_nearby_profiles_v2(double precision, double precision, integer, double precision) to authenticated;
grant execute on function public.get_nearby_profiles_v2(double precision, double precision, integer, double precision) to service_role;

commit;

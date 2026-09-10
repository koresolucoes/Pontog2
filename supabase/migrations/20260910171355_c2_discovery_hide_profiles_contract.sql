create or replace function public.get_nearby_profiles_v4(
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
language sql
security invoker
set search_path='pg_catalog','public','pg_temp'
as $$
  select p.*
  from public.get_nearby_profiles_v3(p_lat,p_lng,p_limit,p_radius_km) p
  where not exists (
    select 1 from public.hidden_profiles h
    where h.owner_id=auth.uid() and h.hidden_id=p.id
  );
$$;

create or replace function public.get_popular_profiles_v3(
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
language sql
security invoker
set search_path='pg_catalog','public','pg_temp'
as $$
  select p.*
  from public.get_popular_profiles_v2(p_lat,p_lng,p_limit,p_offset) p
  where not exists (
    select 1 from public.hidden_profiles h
    where h.owner_id=auth.uid() and h.hidden_id=p.id
  );
$$;

revoke all on function public.get_nearby_profiles_v4(double precision,double precision,integer,double precision) from public,anon;
revoke all on function public.get_popular_profiles_v3(double precision,double precision,integer,integer) from public,anon;
grant execute on function public.get_nearby_profiles_v4(double precision,double precision,integer,double precision) to authenticated;
grant execute on function public.get_popular_profiles_v3(double precision,double precision,integer,integer) to authenticated;

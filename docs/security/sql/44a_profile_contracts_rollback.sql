-- Rollback for 44a_profile_contracts_forward.sql

drop function if exists public.get_popular_profiles_v2(double precision,double precision,integer,integer);
drop function if exists public.get_nearby_profiles_v3(double precision,double precision,integer,double precision);
drop function if exists public.set_my_travel_mode(boolean,double precision,double precision);
drop function if exists public.ensure_my_profile_v1(text,text,text);
drop function if exists public.get_my_profile_v1();

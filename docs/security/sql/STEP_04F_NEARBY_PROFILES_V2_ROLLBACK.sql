-- Rollback for Step 04F — additive RPC only.

begin;

drop function if exists public.get_nearby_profiles_v2(double precision, double precision, integer, double precision);

commit;

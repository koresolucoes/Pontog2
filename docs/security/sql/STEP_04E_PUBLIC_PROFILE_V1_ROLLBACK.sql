-- Rollback for Step 04E — additive RPC only.

begin;

drop function if exists public.get_public_profile_v1(uuid);

commit;

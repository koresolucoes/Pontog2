-- Rollback for Step 02C — restores prior anonymous grants.
-- WARNING: use only for emergency rollback.

begin;

grant all privileges on table public.b2b_wallets to anon;
grant all privileges on table public.b2b_transactions to anon;
grant all privileges on table public.b2b_campaigns to anon;

commit;

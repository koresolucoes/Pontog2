-- Rollback for 43_backend_least_privilege_grants_forward.sql

-- system_settings prior state
revoke all privileges on table public.system_settings from anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger on table public.system_settings to anon, authenticated;

-- B2B prior state
revoke all privileges on table public.b2b_wallets from authenticated;
grant select, references, trigger on table public.b2b_wallets to authenticated;
revoke all privileges on table public.b2b_transactions from authenticated;
grant select, references, trigger on table public.b2b_transactions to authenticated;
revoke all privileges on table public.b2b_campaigns from anon, authenticated;
grant select on table public.b2b_campaigns to anon;
grant select, references, trigger on table public.b2b_campaigns to authenticated;

-- venue_claims prior state
revoke all privileges on table public.venue_claims from authenticated;
grant select, insert, references, trigger on table public.venue_claims to authenticated;

-- venues prior state
revoke all privileges on table public.venues from anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger on table public.venues to anon, authenticated;

-- venue_posts prior state
revoke all privileges on table public.venue_posts from anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger on table public.venue_posts to anon, authenticated;

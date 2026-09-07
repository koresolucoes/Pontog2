-- Backend finalization — least-privilege client grants.

-- Server-only settings.
revoke all privileges on table public.system_settings from anon, authenticated;

-- B2B is read-only from authenticated clients; mutations remain backend/RPC-only.
revoke all privileges on table public.b2b_wallets from anon, authenticated;
revoke all privileges on table public.b2b_transactions from anon, authenticated;
revoke all privileges on table public.b2b_campaigns from anon, authenticated;
grant select on table public.b2b_wallets to authenticated;
grant select on table public.b2b_transactions to authenticated;
grant select on table public.b2b_campaigns to anon, authenticated;

-- Claims: user can submit/read own claim under RLS, never trigger/reference directly.
revoke all privileges on table public.venue_claims from anon, authenticated;
grant select, insert on table public.venue_claims to authenticated;

-- Venues: public discovery; authenticated submit/update under RLS. Delete remains admin/backend-only.
revoke all privileges on table public.venues from anon, authenticated;
grant select on table public.venues to anon, authenticated;
grant insert, update on table public.venues to authenticated;

-- Venue posts: public read of active posts; owner CRUD under RLS.
revoke all privileges on table public.venue_posts from anon, authenticated;
grant select on table public.venue_posts to anon, authenticated;
grant insert, update, delete on table public.venue_posts to authenticated;

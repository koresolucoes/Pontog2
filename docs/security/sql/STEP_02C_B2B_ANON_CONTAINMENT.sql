-- Step 02C — B2B anonymous containment
-- Ownership for authenticated B2B users is not trustworthy yet; do not invent owner policies here.

begin;

-- Wallets and transaction ledger must never be reachable by anonymous clients.
revoke all privileges on table public.b2b_wallets from anon;
revoke all privileges on table public.b2b_transactions from anon;

-- Campaign content may remain publicly readable for rendering, but anonymous mutation is blocked.
revoke insert, update, delete, truncate, references, trigger on table public.b2b_campaigns from anon;
grant select on table public.b2b_campaigns to anon;

commit;

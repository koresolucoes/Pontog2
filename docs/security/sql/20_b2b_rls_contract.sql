-- B2B ownership hardening — CONTRACT phase.
-- Apply ONLY after owner frontend/API consumers have migrated to backend mutations.

-- Wallets: owner-scoped read, backend-only mutation.
drop policy if exists "Allow full access for administrators on wallets" on public.b2b_wallets;
drop policy if exists "Allow select for owners on their own wallets" on public.b2b_wallets;
drop policy if exists b2b_wallets_select_owner on public.b2b_wallets;
create policy b2b_wallets_select_owner
on public.b2b_wallets for select to authenticated
using (exists (
  select 1 from public.venues v
  where v.id = b2b_wallets.venue_id
    and v.owner_id = (select auth.uid())
));

-- Ledger: owner-scoped read, backend-only mutation.
drop policy if exists "Allow insert/update for transactions" on public.b2b_transactions;
drop policy if exists "Allow read for transactions" on public.b2b_transactions;
drop policy if exists b2b_transactions_select_owner on public.b2b_transactions;
create policy b2b_transactions_select_owner
on public.b2b_transactions for select to authenticated
using (exists (
  select 1
  from public.b2b_wallets w
  join public.venues v on v.id = w.venue_id
  where w.id = b2b_transactions.wallet_id
    and v.owner_id = (select auth.uid())
));

-- Campaigns: approved ads remain readable by clients; owner can also read paused campaigns.
drop policy if exists "Allow full action on campaigns" on public.b2b_campaigns;
drop policy if exists "Allow read on campaigns" on public.b2b_campaigns;
drop policy if exists b2b_campaigns_select_public_approved on public.b2b_campaigns;
drop policy if exists b2b_campaigns_select_owner on public.b2b_campaigns;
create policy b2b_campaigns_select_public_approved
on public.b2b_campaigns for select to anon, authenticated
using (status = 'approved');
create policy b2b_campaigns_select_owner
on public.b2b_campaigns for select to authenticated
using (exists (
  select 1 from public.venues v
  where v.id = b2b_campaigns.venue_id
    and v.owner_id = (select auth.uid())
));

revoke insert, update, delete, truncate on public.b2b_wallets from anon, authenticated;
revoke insert, update, delete, truncate on public.b2b_transactions from anon, authenticated;
revoke insert, update, delete, truncate on public.b2b_campaigns from anon, authenticated;
revoke select on public.b2b_wallets, public.b2b_transactions from anon;
grant select on public.b2b_wallets, public.b2b_transactions to authenticated;
grant select on public.b2b_campaigns to anon, authenticated;

-- Claims: own pending claim only, no anonymous surface.
drop policy if exists "Donos podem criar reivindicações" on public.venue_claims;
drop policy if exists "Donos podem ver suas reivindicações" on public.venue_claims;
drop policy if exists "Usuários criam solicitações" on public.venue_claims;
drop policy if exists "Usuários veem suas próprias solicitações" on public.venue_claims;
drop policy if exists venue_claims_insert_own on public.venue_claims;
drop policy if exists venue_claims_select_own on public.venue_claims;
create policy venue_claims_insert_own
on public.venue_claims for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.venues v
    where v.id = venue_claims.venue_id
      and (v.owner_id is null or v.owner_id = (select auth.uid()))
  )
);
create policy venue_claims_select_own
on public.venue_claims for select to authenticated
using (user_id = (select auth.uid()));
revoke all on public.venue_claims from anon;
revoke update, delete, truncate on public.venue_claims from authenticated;
grant select, insert on public.venue_claims to authenticated;

-- Remove blanket venue visibility while preserving map/public + owner/submitted records.
drop policy if exists "Todos podem ler venues" on public.venues;
drop policy if exists "Public venues are viewable by everyone" on public.venues;
drop policy if exists venues_select_visible on public.venues;
create policy venues_select_visible
on public.venues for select to anon, authenticated
using (
  is_verified = true
  or source_type = 'osm'
  or submitted_by = (select auth.uid())
  or owner_id = (select auth.uid())
);

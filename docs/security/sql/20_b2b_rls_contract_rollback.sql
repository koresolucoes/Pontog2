-- Rollback for Step 20 B2B RLS CONTRACT phase.
-- Restores the policies/grants captured immediately before contract application.
-- Does NOT reverse financial ledger entries, ownership decisions, or payment effects.

-- Wallets
DROP POLICY IF EXISTS b2b_wallets_select_owner ON public.b2b_wallets;
CREATE POLICY "Allow full access for administrators on wallets"
ON public.b2b_wallets FOR ALL TO public
USING (true) WITH CHECK (true);
CREATE POLICY "Allow select for owners on their own wallets"
ON public.b2b_wallets FOR SELECT TO public
USING (true);
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.b2b_wallets TO authenticated;

-- Transactions
DROP POLICY IF EXISTS b2b_transactions_select_owner ON public.b2b_transactions;
CREATE POLICY "Allow insert/update for transactions"
ON public.b2b_transactions FOR ALL TO public
USING (true) WITH CHECK (true);
CREATE POLICY "Allow read for transactions"
ON public.b2b_transactions FOR SELECT TO public
USING (true);
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.b2b_transactions TO authenticated;

-- Campaigns
DROP POLICY IF EXISTS b2b_campaigns_select_public_approved ON public.b2b_campaigns;
DROP POLICY IF EXISTS b2b_campaigns_select_owner ON public.b2b_campaigns;
CREATE POLICY "Allow full action on campaigns"
ON public.b2b_campaigns FOR ALL TO public
USING (true) WITH CHECK (true);
CREATE POLICY "Allow read on campaigns"
ON public.b2b_campaigns FOR SELECT TO public
USING (true);
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.b2b_campaigns TO authenticated;

-- Venue claims
DROP POLICY IF EXISTS venue_claims_insert_own ON public.venue_claims;
DROP POLICY IF EXISTS venue_claims_select_own ON public.venue_claims;
CREATE POLICY "Donos podem criar reivindicações"
ON public.venue_claims FOR INSERT TO public
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Donos podem ver suas reivindicações"
ON public.venue_claims FOR SELECT TO public
USING (user_id = auth.uid());
CREATE POLICY "Usuários criam solicitações"
ON public.venue_claims FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários veem suas próprias solicitações"
ON public.venue_claims FOR SELECT TO public
USING (auth.uid() = user_id);
GRANT ALL PRIVILEGES ON public.venue_claims TO anon, authenticated;

-- Venues
DROP POLICY IF EXISTS venues_select_visible ON public.venues;
CREATE POLICY "Public venues are viewable by everyone"
ON public.venues FOR SELECT TO public
USING ((is_verified = true) OR (auth.uid() = submitted_by) OR (source_type = 'osm'::text));
CREATE POLICY "Todos podem ler venues"
ON public.venues FOR SELECT TO public
USING (true);

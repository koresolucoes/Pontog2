-- Rollback for 41_backend_rls_consolidation_forward.sql

-- B2B campaigns
drop policy if exists b2b_campaigns_select_anon_approved on public.b2b_campaigns;
drop policy if exists b2b_campaigns_select_authenticated on public.b2b_campaigns;
create policy b2b_campaigns_select_owner on public.b2b_campaigns for select to authenticated using (exists (select 1 from public.venues v where v.id=b2b_campaigns.venue_id and v.owner_id=(select auth.uid())));
create policy b2b_campaigns_select_public_approved on public.b2b_campaigns for select to anon, authenticated using (status::text='approved');

-- Private album access
drop policy if exists private_album_access_insert_scoped on public.private_album_access;
create policy private_album_access_owner_insert on public.private_album_access for insert to authenticated with check ((owner_id=(select auth.uid())) and requester_id is distinct from (select auth.uid()) and status=any(array['pending'::text,'granted'::text,'denied'::text]));
create policy private_album_access_request_pending on public.private_album_access for insert to authenticated with check ((requester_id=(select auth.uid())) and owner_id is distinct from (select auth.uid()) and status='pending');

-- News
drop policy if exists news_comments_insert_own on public.news_comments;
drop policy if exists news_comments_delete_own on public.news_comments;
create policy "Usuários logados podem comentar" on public.news_comments for insert to public with check (auth.uid()=user_id);
create policy "Dono pode apagar comentário" on public.news_comments for delete to public using (auth.uid()=user_id);
drop policy if exists news_comment_likes_insert_own on public.news_comment_likes;
drop policy if exists news_comment_likes_delete_own on public.news_comment_likes;
create policy "Usuários logados podem dar like" on public.news_comment_likes for insert to public with check (auth.uid()=user_id);
create policy "Dono pode remover like" on public.news_comment_likes for delete to public using (auth.uid()=user_id);

-- Temporary perks
drop policy if exists user_temporary_perks_select_own on public.user_temporary_perks;
create policy "Users can view their own temporary perks" on public.user_temporary_perks for select to public using (auth.uid()=user_id);

-- Venues
drop policy if exists venues_insert_authenticated on public.venues;
drop policy if exists venues_update_owner on public.venues;
create policy "Users can insert venues" on public.venues for insert to public with check (auth.uid()=submitted_by);
create policy "Donos podem atualizar seus próprios locais" on public.venues for update to public using (auth.uid()=owner_id);

-- Venue posts
drop policy if exists venue_posts_select_anon_active on public.venue_posts;
drop policy if exists venue_posts_select_authenticated on public.venue_posts;
drop policy if exists venue_posts_insert_owner on public.venue_posts;
drop policy if exists venue_posts_update_owner on public.venue_posts;
drop policy if exists venue_posts_delete_owner on public.venue_posts;
create policy "Donos gerenciam seus posts" on public.venue_posts for all to public using (exists (select 1 from public.venues where venues.id=venue_posts.venue_id and venues.owner_id=auth.uid()));
create policy "Todos podem ver posts ativos de locais" on public.venue_posts for select to public using (true);

-- Venue review likes
drop policy if exists venue_review_likes_insert_own on public.venue_review_likes;
drop policy if exists venue_review_likes_delete_own on public.venue_review_likes;
create policy "Gerenciar likes em venue_review_likes" on public.venue_review_likes for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Venue reviews
drop policy if exists venue_reviews_insert_own on public.venue_reviews;
drop policy if exists venue_reviews_update_own on public.venue_reviews;
drop policy if exists venue_reviews_delete_own on public.venue_reviews;
create policy "Permitir aos usuários autenticados criar suas próprias avalia" on public.venue_reviews for insert to authenticated with check (auth.uid()=user_id);
create policy "Permitir aos usuários autenticados atualizar suas próprias av" on public.venue_reviews for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Permitir aos usuários autenticados excluir suas próprias aval" on public.venue_reviews for delete to authenticated using (auth.uid()=user_id);

-- Safety reviews
drop policy if exists venue_safety_reviews_insert_own on public.venue_safety_reviews;
drop policy if exists venue_safety_reviews_update_own on public.venue_safety_reviews;
drop policy if exists venue_safety_reviews_delete_own on public.venue_safety_reviews;
create policy "Permitir aos usuários autenticados criar suas próprias avalia" on public.venue_safety_reviews for insert to authenticated with check (auth.uid()=user_id);
create policy "Permitir aos usuários autenticados atualizar suas próprias av" on public.venue_safety_reviews for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Permitir aos usuários autenticados excluir suas próprias aval" on public.venue_safety_reviews for delete to authenticated using (auth.uid()=user_id);

-- Review replies
drop policy if exists venue_review_replies_insert_own on public.venue_review_replies;
drop policy if exists venue_review_replies_update_own on public.venue_review_replies;
drop policy if exists venue_review_replies_delete_own on public.venue_review_replies;
create policy "Permitir aos usuários autenticados criar suas próprias respos" on public.venue_review_replies for insert to authenticated with check (auth.uid()=user_id);
create policy "Permitir aos usuários autenticados atualizar suas próprias re" on public.venue_review_replies for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Permitir aos usuários autenticados excluir suas próprias resp" on public.venue_review_replies for delete to authenticated using (auth.uid()=user_id);

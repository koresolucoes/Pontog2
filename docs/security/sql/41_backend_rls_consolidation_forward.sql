-- Backend finalization — residual RLS consolidation.
-- Preserve product visibility while removing overlapping policies and per-row auth.uid() calls.

-- B2B campaigns: one authenticated SELECT policy + one anonymous approved-only policy.
drop policy if exists b2b_campaigns_select_owner on public.b2b_campaigns;
drop policy if exists b2b_campaigns_select_public_approved on public.b2b_campaigns;
create policy b2b_campaigns_select_anon_approved on public.b2b_campaigns
for select to anon
using (status::text = 'approved');
create policy b2b_campaigns_select_authenticated on public.b2b_campaigns
for select to authenticated
using (
  status::text = 'approved'
  or exists (
    select 1 from public.venues v
    where v.id = b2b_campaigns.venue_id
      and v.owner_id = (select auth.uid())
  )
);

-- Private albums: consolidate the two permissive INSERT policies.
drop policy if exists private_album_access_owner_insert on public.private_album_access;
drop policy if exists private_album_access_request_pending on public.private_album_access;
create policy private_album_access_insert_scoped on public.private_album_access
for insert to authenticated
with check (
  (
    owner_id = (select auth.uid())
    and requester_id is distinct from (select auth.uid())
    and status = any(array['pending'::text,'granted'::text,'denied'::text])
  )
  or (
    requester_id = (select auth.uid())
    and owner_id is distinct from (select auth.uid())
    and status = 'pending'
  )
);

-- News comments/likes: public read, authenticated own mutation.
drop policy if exists "Usuários logados podem comentar" on public.news_comments;
drop policy if exists "Dono pode apagar comentário" on public.news_comments;
create policy news_comments_insert_own on public.news_comments
for insert to authenticated
with check (user_id = (select auth.uid()));
create policy news_comments_delete_own on public.news_comments
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Usuários logados podem dar like" on public.news_comment_likes;
drop policy if exists "Dono pode remover like" on public.news_comment_likes;
create policy news_comment_likes_insert_own on public.news_comment_likes
for insert to authenticated
with check (user_id = (select auth.uid()));
create policy news_comment_likes_delete_own on public.news_comment_likes
for delete to authenticated
using (user_id = (select auth.uid()));

-- Temporary perks are private to the signed-in user.
drop policy if exists "Users can view their own temporary perks" on public.user_temporary_perks;
create policy user_temporary_perks_select_own on public.user_temporary_perks
for select to authenticated
using (user_id = (select auth.uid()));

-- Venues: keep public visibility, but mutations require authenticated ownership.
drop policy if exists "Users can insert venues" on public.venues;
drop policy if exists "Donos podem atualizar seus próprios locais" on public.venues;
create policy venues_insert_authenticated on public.venues
for insert to authenticated
with check (submitted_by = (select auth.uid()));
create policy venues_update_owner on public.venues
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Venue posts: only active/current posts are public; owners can see and manage their own.
drop policy if exists "Donos gerenciam seus posts" on public.venue_posts;
drop policy if exists "Todos podem ver posts ativos de locais" on public.venue_posts;
create policy venue_posts_select_anon_active on public.venue_posts
for select to anon
using (is_active = true and (ends_at is null or ends_at > now()));
create policy venue_posts_select_authenticated on public.venue_posts
for select to authenticated
using (
  (is_active = true and (ends_at is null or ends_at > now()))
  or exists (
    select 1 from public.venues v
    where v.id = venue_posts.venue_id
      and v.owner_id = (select auth.uid())
  )
);
create policy venue_posts_insert_owner on public.venue_posts
for insert to authenticated
with check (
  exists (
    select 1 from public.venues v
    where v.id = venue_posts.venue_id
      and v.owner_id = (select auth.uid())
  )
);
create policy venue_posts_update_owner on public.venue_posts
for update to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_posts.venue_id
      and v.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.venues v
    where v.id = venue_posts.venue_id
      and v.owner_id = (select auth.uid())
  )
);
create policy venue_posts_delete_owner on public.venue_posts
for delete to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_posts.venue_id
      and v.owner_id = (select auth.uid())
  )
);

-- Venue review likes: public read, own insert/delete; likes are immutable.
drop policy if exists "Gerenciar likes em venue_review_likes" on public.venue_review_likes;
create policy venue_review_likes_insert_own on public.venue_review_likes
for insert to authenticated
with check (user_id = (select auth.uid()));
create policy venue_review_likes_delete_own on public.venue_review_likes
for delete to authenticated
using (user_id = (select auth.uid()));

-- Venue reviews / safety reviews / replies: same rules, optimized auth lookup.
drop policy if exists "Permitir aos usuários autenticados criar suas próprias avalia" on public.venue_reviews;
drop policy if exists "Permitir aos usuários autenticados atualizar suas próprias av" on public.venue_reviews;
drop policy if exists "Permitir aos usuários autenticados excluir suas próprias aval" on public.venue_reviews;
create policy venue_reviews_insert_own on public.venue_reviews for insert to authenticated with check (user_id = (select auth.uid()));
create policy venue_reviews_update_own on public.venue_reviews for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy venue_reviews_delete_own on public.venue_reviews for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Permitir aos usuários autenticados criar suas próprias avalia" on public.venue_safety_reviews;
drop policy if exists "Permitir aos usuários autenticados atualizar suas próprias av" on public.venue_safety_reviews;
drop policy if exists "Permitir aos usuários autenticados excluir suas próprias aval" on public.venue_safety_reviews;
create policy venue_safety_reviews_insert_own on public.venue_safety_reviews for insert to authenticated with check (user_id = (select auth.uid()));
create policy venue_safety_reviews_update_own on public.venue_safety_reviews for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy venue_safety_reviews_delete_own on public.venue_safety_reviews for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Permitir aos usuários autenticados criar suas próprias respos" on public.venue_review_replies;
drop policy if exists "Permitir aos usuários autenticados atualizar suas próprias re" on public.venue_review_replies;
drop policy if exists "Permitir aos usuários autenticados excluir suas próprias resp" on public.venue_review_replies;
create policy venue_review_replies_insert_own on public.venue_review_replies for insert to authenticated with check (user_id = (select auth.uid()));
create policy venue_review_replies_update_own on public.venue_review_replies for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy venue_review_replies_delete_own on public.venue_review_replies for delete to authenticated using (user_id = (select auth.uid()));

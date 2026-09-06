-- Step 07F — Video domain RLS cleanup.
-- Preserves current product semantics:
--   * videos/comments/likes/ratings remain publicly readable;
--   * mutations require authenticated ownership.
-- Removes overlapping policies and per-row auth.uid() initplans.

-- videos
drop policy if exists "Usuários podem remover seus próprios vídeos" on public.videos;
drop policy if exists "Usuários podem postar seus próprios vídeos" on public.videos;
drop policy if exists "Todos podem ver os vídeos" on public.videos;
drop policy if exists "Vídeos são visíveis para todos os usuários autenticados" on public.videos;
drop policy if exists "Usuários podem atualizar seus próprios vídeos" on public.videos;
drop policy if exists videos_select_public on public.videos;
drop policy if exists videos_insert_own on public.videos;
drop policy if exists videos_update_own on public.videos;
drop policy if exists videos_delete_own on public.videos;

create policy videos_select_public
on public.videos for select to public
using (true);

create policy videos_insert_own
on public.videos for insert to authenticated
with check (user_id = (select auth.uid()));

create policy videos_update_own
on public.videos for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy videos_delete_own
on public.videos for delete to authenticated
using (user_id = (select auth.uid()));

-- video_likes
drop policy if exists "Usuários logados podem remover suas próprias curtidas" on public.video_likes;
drop policy if exists "Usuários podem descurtir vídeos" on public.video_likes;
drop policy if exists "Usuários logados podem curtir vídeos" on public.video_likes;
drop policy if exists "Usuários podem curtir vídeos" on public.video_likes;
drop policy if exists "Todos podem ver curtidas" on public.video_likes;
drop policy if exists video_likes_select_public on public.video_likes;
drop policy if exists video_likes_insert_own on public.video_likes;
drop policy if exists video_likes_delete_own on public.video_likes;

create policy video_likes_select_public
on public.video_likes for select to public
using (true);

create policy video_likes_insert_own
on public.video_likes for insert to authenticated
with check (user_id = (select auth.uid()));

create policy video_likes_delete_own
on public.video_likes for delete to authenticated
using (user_id = (select auth.uid()));

-- video_ratings
drop policy if exists delete_video_ratings on public.video_ratings;
drop policy if exists "Usuários podem avaliar vídeos" on public.video_ratings;
drop policy if exists insert_video_ratings on public.video_ratings;
drop policy if exists "Avaliações são visíveis para todos" on public.video_ratings;
drop policy if exists select_video_ratings on public.video_ratings;
drop policy if exists "Permitir atualização de avaliações para donos do registro" on public.video_ratings;
drop policy if exists update_video_ratings on public.video_ratings;
drop policy if exists video_ratings_select_public on public.video_ratings;
drop policy if exists video_ratings_insert_own on public.video_ratings;
drop policy if exists video_ratings_update_own on public.video_ratings;
drop policy if exists video_ratings_delete_own on public.video_ratings;

create policy video_ratings_select_public
on public.video_ratings for select to public
using (true);

create policy video_ratings_insert_own
on public.video_ratings for insert to authenticated
with check (user_id = (select auth.uid()));

create policy video_ratings_update_own
on public.video_ratings for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy video_ratings_delete_own
on public.video_ratings for delete to authenticated
using (user_id = (select auth.uid()));

-- video_comments
drop policy if exists delete_video_comments on public.video_comments;
drop policy if exists insert_video_comments on public.video_comments;
drop policy if exists select_video_comments on public.video_comments;
drop policy if exists update_video_comments on public.video_comments;
drop policy if exists video_comments_select_public on public.video_comments;
drop policy if exists video_comments_insert_own on public.video_comments;
drop policy if exists video_comments_update_own on public.video_comments;
drop policy if exists video_comments_delete_own on public.video_comments;

create policy video_comments_select_public
on public.video_comments for select to public
using (true);

create policy video_comments_insert_own
on public.video_comments for insert to authenticated
with check (user_id = (select auth.uid()));

create policy video_comments_update_own
on public.video_comments for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy video_comments_delete_own
on public.video_comments for delete to authenticated
using (user_id = (select auth.uid()));

-- video_comment_likes
drop policy if exists delete_video_comment_likes on public.video_comment_likes;
drop policy if exists insert_video_comment_likes on public.video_comment_likes;
drop policy if exists select_video_comment_likes on public.video_comment_likes;
drop policy if exists video_comment_likes_select_public on public.video_comment_likes;
drop policy if exists video_comment_likes_insert_own on public.video_comment_likes;
drop policy if exists video_comment_likes_delete_own on public.video_comment_likes;

create policy video_comment_likes_select_public
on public.video_comment_likes for select to public
using (true);

create policy video_comment_likes_insert_own
on public.video_comment_likes for insert to authenticated
with check (user_id = (select auth.uid()));

create policy video_comment_likes_delete_own
on public.video_comment_likes for delete to authenticated
using (user_id = (select auth.uid()));

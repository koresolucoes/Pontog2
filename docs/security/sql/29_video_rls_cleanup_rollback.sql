-- Step 07F rollback — restore exact pre-cleanup video policies.

-- Remove canonical policies.
drop policy if exists videos_select_public on public.videos;
drop policy if exists videos_insert_own on public.videos;
drop policy if exists videos_update_own on public.videos;
drop policy if exists videos_delete_own on public.videos;

drop policy if exists video_likes_select_public on public.video_likes;
drop policy if exists video_likes_insert_own on public.video_likes;
drop policy if exists video_likes_delete_own on public.video_likes;

drop policy if exists video_ratings_select_public on public.video_ratings;
drop policy if exists video_ratings_insert_own on public.video_ratings;
drop policy if exists video_ratings_update_own on public.video_ratings;
drop policy if exists video_ratings_delete_own on public.video_ratings;

drop policy if exists video_comments_select_public on public.video_comments;
drop policy if exists video_comments_insert_own on public.video_comments;
drop policy if exists video_comments_update_own on public.video_comments;
drop policy if exists video_comments_delete_own on public.video_comments;

drop policy if exists video_comment_likes_select_public on public.video_comment_likes;
drop policy if exists video_comment_likes_insert_own on public.video_comment_likes;
drop policy if exists video_comment_likes_delete_own on public.video_comment_likes;

-- videos
create policy "Usuários podem remover seus próprios vídeos"
on public.videos for delete to authenticated
using (auth.uid() = user_id);
create policy "Usuários podem postar seus próprios vídeos"
on public.videos for insert to authenticated
with check (auth.uid() = user_id);
create policy "Todos podem ver os vídeos"
on public.videos for select to public
using (true);
create policy "Vídeos são visíveis para todos os usuários autenticados"
on public.videos for select to authenticated
using (true);
create policy "Usuários podem atualizar seus próprios vídeos"
on public.videos for update to authenticated
using (auth.uid() = user_id);

-- video_likes
create policy "Usuários logados podem remover suas próprias curtidas"
on public.video_likes for delete to public
using (auth.uid() = user_id);
create policy "Usuários podem descurtir vídeos"
on public.video_likes for delete to authenticated
using (auth.uid() = user_id);
create policy "Usuários logados podem curtir vídeos"
on public.video_likes for insert to public
with check (auth.uid() = user_id);
create policy "Usuários podem curtir vídeos"
on public.video_likes for insert to authenticated
with check (auth.uid() = user_id);
create policy "Todos podem ver curtidas"
on public.video_likes for select to public
using (true);

-- video_ratings
create policy delete_video_ratings
on public.video_ratings for delete to public
using (auth.uid() = user_id);
create policy "Usuários podem avaliar vídeos"
on public.video_ratings for insert to authenticated
with check (auth.uid() = user_id);
create policy insert_video_ratings
on public.video_ratings for insert to public
with check (auth.uid() = user_id);
create policy "Avaliações são visíveis para todos"
on public.video_ratings for select to authenticated
using (true);
create policy select_video_ratings
on public.video_ratings for select to public
using (true);
create policy "Permitir atualização de avaliações para donos do registro"
on public.video_ratings for update to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy update_video_ratings
on public.video_ratings for update to public
using (auth.uid() = user_id);

-- video_comments
create policy delete_video_comments
on public.video_comments for delete to public
using (auth.uid() = user_id);
create policy insert_video_comments
on public.video_comments for insert to public
with check (auth.uid() = user_id);
create policy select_video_comments
on public.video_comments for select to public
using (true);
create policy update_video_comments
on public.video_comments for update to public
using (auth.uid() = user_id);

-- video_comment_likes
create policy delete_video_comment_likes
on public.video_comment_likes for delete to public
using (auth.uid() = user_id);
create policy insert_video_comment_likes
on public.video_comment_likes for insert to public
with check (auth.uid() = user_id);
create policy select_video_comment_likes
on public.video_comment_likes for select to public
using (true);

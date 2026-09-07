-- Rollback Step 07H — restore previous community interaction policies.

-- Drop Step 07H policies.
drop policy if exists community_comments_select_anon_public on public.community_comments;
drop policy if exists community_comments_select_authenticated_visible on public.community_comments;
drop policy if exists community_comments_insert_member on public.community_comments;
drop policy if exists community_comments_update_author on public.community_comments;
drop policy if exists community_comments_delete_author_or_manager on public.community_comments;

drop policy if exists community_post_likes_select_anon_public on public.community_post_likes;
drop policy if exists community_post_likes_select_authenticated_visible on public.community_post_likes;
drop policy if exists community_post_likes_insert_visible on public.community_post_likes;
drop policy if exists community_post_likes_delete_own on public.community_post_likes;

drop policy if exists community_join_requests_select_scoped on public.community_join_requests;
drop policy if exists community_join_requests_insert_own on public.community_join_requests;
drop policy if exists community_join_requests_update_manager on public.community_join_requests;

-- Restore prior community_comments policies.
create policy "Autores ou admins podem deletar comentários"
on public.community_comments
for delete
to public
using (
  auth.uid() = author_id
  or auth.uid() in (
    select cm.user_id
    from public.community_members cm
    join public.community_posts cp on cm.community_id = cp.community_id
    where cp.id = community_comments.post_id
      and cm.role in ('admin', 'moderator')
  )
);

create policy "Membros podem comentar"
on public.community_comments
for insert
to public
with check (
  auth.uid() = author_id
  and auth.uid() in (
    select cm.user_id
    from public.community_members cm
    join public.community_posts cp on cm.community_id = cp.community_id
    where cp.id = community_comments.post_id
  )
);

create policy "Comentários visíveis para quem vê a postagem"
on public.community_comments
for select
to public
using (true);

create policy "Autores podem atualizar comentários"
on public.community_comments
for update
to public
using (auth.uid() = author_id);

-- Restore prior community_post_likes policies.
create policy "Usuários podem remover sua curtida"
on public.community_post_likes
for delete
to public
using (auth.uid() = user_id);

create policy "Usuários podem curtir postagens"
on public.community_post_likes
for insert
to public
with check (auth.uid() = user_id);

create policy "Qualquer pessoa pode ver curtidas"
on public.community_post_likes
for select
to public
using (true);

-- Restore prior community_join_requests policies.
create policy "Users can insert own join requests"
on public.community_join_requests
for insert
to public
with check (auth.uid() = user_id);

create policy "Users can read own join requests or if admin"
on public.community_join_requests
for select
to public
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.community_members
    where community_members.community_id = community_join_requests.community_id
      and community_members.user_id = auth.uid()
      and community_members.role in ('admin', 'moderator')
  )
);

create policy "Admins can update join requests"
on public.community_join_requests
for update
to public
using (
  exists (
    select 1
    from public.community_members
    where community_members.community_id = community_join_requests.community_id
      and community_members.user_id = auth.uid()
      and community_members.role in ('admin', 'moderator')
  )
);

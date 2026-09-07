-- Step 07H — Community interaction privacy and ownership hardening.
-- Aligns comments/likes/join requests with the parent community visibility contract.

-- community_comments ---------------------------------------------------------
drop policy if exists "Autores ou admins podem deletar comentários" on public.community_comments;
drop policy if exists "Membros podem comentar" on public.community_comments;
drop policy if exists "Comentários visíveis para quem vê a postagem" on public.community_comments;
drop policy if exists "Autores podem atualizar comentários" on public.community_comments;

drop policy if exists community_comments_select_anon_public on public.community_comments;
drop policy if exists community_comments_select_authenticated_visible on public.community_comments;
drop policy if exists community_comments_insert_member on public.community_comments;
drop policy if exists community_comments_update_author on public.community_comments;
drop policy if exists community_comments_delete_author_or_manager on public.community_comments;

create policy community_comments_select_anon_public
on public.community_comments
for select
to anon
using (
  exists (
    select 1
    from public.community_posts cp
    join public.communities c on c.id = cp.community_id
    where cp.id = community_comments.post_id
      and c.is_private = false
  )
);

create policy community_comments_select_authenticated_visible
on public.community_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.community_posts cp
    where cp.id = community_comments.post_id
      and public.can_view_community(cp.community_id)
  )
);

create policy community_comments_insert_member
on public.community_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.community_posts cp
    where cp.id = community_comments.post_id
      and (
        public.is_community_member(cp.community_id)
        or public.can_manage_community(cp.community_id)
      )
  )
);

create policy community_comments_update_author
on public.community_comments
for update
to authenticated
using (author_id = (select auth.uid()))
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.community_posts cp
    where cp.id = community_comments.post_id
      and (
        public.is_community_member(cp.community_id)
        or public.can_manage_community(cp.community_id)
      )
  )
);

create policy community_comments_delete_author_or_manager
on public.community_comments
for delete
to authenticated
using (
  author_id = (select auth.uid())
  or exists (
    select 1
    from public.community_posts cp
    where cp.id = community_comments.post_id
      and public.can_manage_community(cp.community_id)
  )
);

-- community_post_likes -------------------------------------------------------
drop policy if exists "Usuários podem remover sua curtida" on public.community_post_likes;
drop policy if exists "Usuários podem curtir postagens" on public.community_post_likes;
drop policy if exists "Qualquer pessoa pode ver curtidas" on public.community_post_likes;

drop policy if exists community_post_likes_select_anon_public on public.community_post_likes;
drop policy if exists community_post_likes_select_authenticated_visible on public.community_post_likes;
drop policy if exists community_post_likes_insert_visible on public.community_post_likes;
drop policy if exists community_post_likes_delete_own on public.community_post_likes;

create policy community_post_likes_select_anon_public
on public.community_post_likes
for select
to anon
using (
  exists (
    select 1
    from public.community_posts cp
    join public.communities c on c.id = cp.community_id
    where cp.id = community_post_likes.post_id
      and c.is_private = false
  )
);

create policy community_post_likes_select_authenticated_visible
on public.community_post_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.community_posts cp
    where cp.id = community_post_likes.post_id
      and public.can_view_community(cp.community_id)
  )
);

create policy community_post_likes_insert_visible
on public.community_post_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.community_posts cp
    where cp.id = community_post_likes.post_id
      and public.can_view_community(cp.community_id)
  )
);

create policy community_post_likes_delete_own
on public.community_post_likes
for delete
to authenticated
using (user_id = (select auth.uid()));

-- community_join_requests ----------------------------------------------------
drop policy if exists "Users can insert own join requests" on public.community_join_requests;
drop policy if exists "Users can read own join requests or if admin" on public.community_join_requests;
drop policy if exists "Admins can update join requests" on public.community_join_requests;

drop policy if exists community_join_requests_select_scoped on public.community_join_requests;
drop policy if exists community_join_requests_insert_own on public.community_join_requests;
drop policy if exists community_join_requests_update_manager on public.community_join_requests;

create policy community_join_requests_select_scoped
on public.community_join_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.can_manage_community(community_id)
);

create policy community_join_requests_insert_own
on public.community_join_requests
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy community_join_requests_update_manager
on public.community_join_requests
for update
to authenticated
using (public.can_manage_community(community_id))
with check (public.can_manage_community(community_id));

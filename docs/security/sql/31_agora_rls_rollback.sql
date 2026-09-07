-- Rollback Step 07H — restore previous Agora policies/RPC exposure.

DROP POLICY IF EXISTS agora_comment_likes_delete_own ON public.agora_comment_likes;
DROP POLICY IF EXISTS agora_comment_likes_insert_own_visible ON public.agora_comment_likes;
DROP POLICY IF EXISTS agora_comment_likes_select_visible ON public.agora_comment_likes;
DROP POLICY IF EXISTS agora_post_comments_delete_own ON public.agora_post_comments;
DROP POLICY IF EXISTS agora_post_comments_insert_own_visible ON public.agora_post_comments;
DROP POLICY IF EXISTS agora_post_comments_select_visible ON public.agora_post_comments;
DROP POLICY IF EXISTS agora_post_likes_delete_own ON public.agora_post_likes;
DROP POLICY IF EXISTS agora_post_likes_insert_own_visible ON public.agora_post_likes;
DROP POLICY IF EXISTS agora_post_likes_select_visible ON public.agora_post_likes;
DROP POLICY IF EXISTS agora_posts_delete_own ON public.agora_posts;
DROP POLICY IF EXISTS agora_posts_update_own ON public.agora_posts;
DROP POLICY IF EXISTS agora_posts_insert_own_active ON public.agora_posts;
DROP POLICY IF EXISTS agora_posts_select_visible ON public.agora_posts;

create policy "Allow authenticated read access to active posts"
on public.agora_posts for select to authenticated
using (expires_at > now());
create policy "Allow user to insert their own post"
on public.agora_posts for insert to authenticated
with check (auth.uid() = user_id);
create policy "Allow user to update their own post"
on public.agora_posts for update to authenticated
using (auth.uid() = user_id);
create policy "Allow user to delete their own post"
on public.agora_posts for delete to authenticated
using (auth.uid() = user_id);

create policy "Allow authenticated read access"
on public.agora_post_likes for select to authenticated
using (true);
create policy "Allow user to insert their own like"
on public.agora_post_likes for insert to authenticated
with check (auth.uid() = user_id);
create policy "Allow user to delete their own like"
on public.agora_post_likes for delete to authenticated
using (auth.uid() = user_id);

create policy "Allow authenticated read access"
on public.agora_post_comments for select to authenticated
using (true);
create policy "Allow user to insert their own comment"
on public.agora_post_comments for insert to authenticated
with check (auth.uid() = user_id);
create policy "Allow user to delete their own comment"
on public.agora_post_comments for delete to authenticated
using (auth.uid() = user_id);

create policy "Allow authenticated users to view all likes"
on public.agora_comment_likes for select to authenticated
using (true);
create policy "Allow authenticated users to insert their own like"
on public.agora_comment_likes for insert to authenticated
with check (auth.uid() = user_id);
create policy "Allow authenticated users to delete their own like"
on public.agora_comment_likes for delete to authenticated
using (auth.uid() = user_id);

create or replace function public.get_comments_for_post_with_details(p_post_id bigint)
returns table(id bigint, post_id bigint, user_id uuid, content text, created_at timestamp with time zone, profiles json, likes_count bigint, user_has_liked boolean)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;

  return query
  select c.id,c.post_id,c.user_id,c.content,c.created_at,
         json_build_object('username',p.username,'avatar_url',p.avatar_url),
         count(l.id),
         exists(select 1 from public.agora_comment_likes acl where acl.comment_id=c.id and acl.user_id=v_actor_id)
  from public.agora_post_comments c
  join public.profiles p on p.id=c.user_id
  left join public.agora_comment_likes l on l.comment_id=c.id
  where c.post_id=p_post_id
    and p.status='active'::public.profile_status
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id=v_actor_id and b.blocked_id=p.id)
         or (b.blocker_id=p.id and b.blocked_id=v_actor_id)
    )
  group by c.id,p.id
  order by c.created_at asc;
end;
$$;

revoke all on function public.get_comments_for_post_with_details(bigint) from public, anon;
grant execute on function public.get_comments_for_post_with_details(bigint) to authenticated;
grant execute on function public.get_active_agora_posts_paginated(integer, integer) to authenticated;

drop function if exists private.can_view_agora_post(bigint, boolean);

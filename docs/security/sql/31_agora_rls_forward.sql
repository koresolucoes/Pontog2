-- Step 07H — Agora RLS + ephemeral interaction contract.
-- Goals:
-- 1) Keep expired Agora content private except to the owner for cleanup.
-- 2) Apply the same visibility/blocking rules to direct Data API reads.
-- 3) Prevent likes/comments on expired or invisible posts.
-- 4) Keep existing client RPC signature for comment retrieval, but make it visibility-aware.

create schema if not exists private;

create or replace function private.can_view_agora_post(
  p_post_id bigint,
  p_allow_own_expired boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with actor as (
    select p.id, coalesce(p.visibility, 'todos') as visibility
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'::public.profile_status
  ), target as (
    select ap.id,
           ap.user_id,
           ap.expires_at,
           p.status,
           coalesce(p.is_incognito, false) as is_incognito,
           coalesce(p.visibility, 'todos') as visibility
    from public.agora_posts ap
    join public.profiles p on p.id = ap.user_id
    where ap.id = p_post_id
  ), shared_tribe as (
    select exists (
      select 1
      from public.profile_tribes a
      join public.profile_tribes t on t.tribe_id = a.tribe_id
      where a.profile_id = auth.uid()
        and t.profile_id = (select user_id from target)
    ) as yes
  )
  select exists (
    select 1
    from actor a
    cross join target t
    cross join shared_tribe st
    where t.status = 'active'::public.profile_status
      and (
        t.user_id = auth.uid()
        or (
          t.expires_at > now()
          and t.is_incognito = false
          and not exists (
            select 1
            from public.blocks b
            where (b.blocker_id = auth.uid() and b.blocked_id = t.user_id)
               or (b.blocker_id = t.user_id and b.blocked_id = auth.uid())
          )
          and (a.visibility = 'todos' or st.yes)
          and (t.visibility = 'todos' or st.yes)
        )
      )
      and (t.expires_at > now() or (p_allow_own_expired and t.user_id = auth.uid()))
  );
$$;

revoke all on function private.can_view_agora_post(bigint, boolean) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_view_agora_post(bigint, boolean) to authenticated;

-- agora_posts
DROP POLICY IF EXISTS "Allow authenticated read access to active posts" ON public.agora_posts;
DROP POLICY IF EXISTS "Allow user to insert their own post" ON public.agora_posts;
DROP POLICY IF EXISTS "Allow user to update their own post" ON public.agora_posts;
DROP POLICY IF EXISTS "Allow user to delete their own post" ON public.agora_posts;

create policy agora_posts_select_visible
on public.agora_posts
for select
to authenticated
using (private.can_view_agora_post(id, true));

create policy agora_posts_insert_own_active
on public.agora_posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and expires_at > now()
  and expires_at <= now() + interval '24 hours 5 minutes'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'::public.profile_status
  )
);

create policy agora_posts_update_own
on public.agora_posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and expires_at > created_at
  and expires_at <= now() + interval '24 hours 5 minutes'
);

create policy agora_posts_delete_own
on public.agora_posts
for delete
to authenticated
using (user_id = (select auth.uid()));

-- agora_post_likes
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agora_post_likes;
DROP POLICY IF EXISTS "Allow user to insert their own like" ON public.agora_post_likes;
DROP POLICY IF EXISTS "Allow user to delete their own like" ON public.agora_post_likes;

create policy agora_post_likes_select_visible
on public.agora_post_likes
for select
to authenticated
using (private.can_view_agora_post(post_id, false));

create policy agora_post_likes_insert_own_visible
on public.agora_post_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_agora_post(post_id, false)
);

create policy agora_post_likes_delete_own
on public.agora_post_likes
for delete
to authenticated
using (user_id = (select auth.uid()));

-- agora_post_comments
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agora_post_comments;
DROP POLICY IF EXISTS "Allow user to insert their own comment" ON public.agora_post_comments;
DROP POLICY IF EXISTS "Allow user to delete their own comment" ON public.agora_post_comments;

create policy agora_post_comments_select_visible
on public.agora_post_comments
for select
to authenticated
using (private.can_view_agora_post(post_id, false));

create policy agora_post_comments_insert_own_visible
on public.agora_post_comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_agora_post(post_id, false)
);

create policy agora_post_comments_delete_own
on public.agora_post_comments
for delete
to authenticated
using (user_id = (select auth.uid()));

-- agora_comment_likes
DROP POLICY IF EXISTS "Allow authenticated users to view all likes" ON public.agora_comment_likes;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own like" ON public.agora_comment_likes;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own like" ON public.agora_comment_likes;

create policy agora_comment_likes_select_visible
on public.agora_comment_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.agora_post_comments c
    where c.id = comment_id
      and private.can_view_agora_post(c.post_id, false)
  )
);

create policy agora_comment_likes_insert_own_visible
on public.agora_comment_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.agora_post_comments c
    where c.id = comment_id
      and private.can_view_agora_post(c.post_id, false)
  )
);

create policy agora_comment_likes_delete_own
on public.agora_comment_likes
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Safe replacement for the comment detail RPC used by agoraStore.
create or replace function public.get_comments_for_post_with_details(p_post_id bigint)
returns table(
  id bigint,
  post_id bigint,
  user_id uuid,
  content text,
  created_at timestamptz,
  profiles json,
  likes_count bigint,
  user_has_liked boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not private.can_view_agora_post(p_post_id, false) then
    return;
  end if;

  return query
  select c.id,
         c.post_id,
         c.user_id,
         c.content,
         c.created_at,
         json_build_object('username', p.username, 'avatar_url', p.avatar_url),
         count(l.id),
         exists (
           select 1
           from public.agora_comment_likes acl
           where acl.comment_id = c.id
             and acl.user_id = v_actor_id
         )
  from public.agora_post_comments c
  join public.profiles p on p.id = c.user_id
  left join public.agora_comment_likes l on l.comment_id = c.id
  where c.post_id = p_post_id
    and p.status = 'active'::public.profile_status
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = v_actor_id and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = v_actor_id)
    )
  group by c.id, p.id
  order by c.created_at asc;
end;
$$;

revoke all on function public.get_comments_for_post_with_details(bigint) from public, anon;
grant execute on function public.get_comments_for_post_with_details(bigint) to authenticated;

-- Legacy paginated RPC is not used by the current frontend/API and references columns
-- that no longer exist on agora_posts. Keep the function for rollback visibility, but
-- remove it from the client API surface.
revoke execute on function public.get_active_agora_posts_paginated(integer, integer) from public, anon, authenticated;

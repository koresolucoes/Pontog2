create schema if not exists private;

create or replace function private.is_profile_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.status = 'active'::public.profile_status
  );
$$;

revoke all on function private.is_profile_active(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_profile_active(uuid) to authenticated;

-- Agora: keep profiles private while allowing the insert policy to verify account state.
drop policy if exists agora_posts_insert_own_active on public.agora_posts;
create policy agora_posts_insert_own_active
on public.agora_posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and expires_at > now()
  and expires_at <= now() + interval '24 hours 5 minutes'
  and private.is_profile_active((select auth.uid()))
);

-- Favorites: preserve the original authorization semantics without direct profile reads.
drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites"
on public.favorites
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and user_id <> favorite_id
  and private.is_profile_active((select auth.uid()))
  and private.is_profile_active(favorite_id)
  and not exists (
    select 1
    from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = favorite_id)
       or (b.blocker_id = favorite_id and b.blocked_id = (select auth.uid()))
  )
);

-- Reports: the reporter must still be an active account.
drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports"
on public.reports
for insert
to authenticated
with check (
  (select auth.uid()) = reporter_id
  and reporter_id <> reported_id
  and private.is_profile_active((select auth.uid()))
);

-- Connections: both sides must be active and not blocked, without exposing profiles.
drop policy if exists "Users can create safe connections" on public.user_connections;
create policy "Users can create safe connections"
on public.user_connections
for insert
to authenticated
with check (
  (select auth.uid()) = follower_id
  and follower_id <> following_id
  and status = 'pending'::text
  and private.is_profile_active((select auth.uid()))
  and private.is_profile_active(following_id)
  and not exists (
    select 1
    from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = following_id)
       or (b.blocker_id = following_id and b.blocked_id = (select auth.uid()))
  )
);

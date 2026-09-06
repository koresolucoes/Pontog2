-- Step 07A — Community authorization cleanup.
-- Fixes private-community visibility, self-promotion/member-management bypasses,
-- tautological manager checks, and policy drift.

create or replace function public.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.community_members cm
       where cm.community_id = p_community_id
         and cm.user_id = auth.uid()
     );
$$;

create or replace function public.can_view_community(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = p_community_id
      and (
        c.is_private = false
        or c.creator_id = auth.uid()
        or exists (
          select 1
          from public.community_members cm
          where cm.community_id = c.id
            and cm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_manage_community(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null
     and (
       exists (
         select 1
         from public.communities c
         where c.id = p_community_id
           and c.creator_id = auth.uid()
       )
       or exists (
         select 1
         from public.community_members cm
         where cm.community_id = p_community_id
           and cm.user_id = auth.uid()
           and cm.role in ('admin', 'moderator')
       )
     );
$$;

revoke all on function public.is_community_member(uuid) from public, anon, authenticated;
revoke all on function public.can_view_community(uuid) from public, anon, authenticated;
revoke all on function public.can_manage_community(uuid) from public, anon, authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.can_view_community(uuid) to authenticated;
grant execute on function public.can_manage_community(uuid) to authenticated;

-- communities: public discovery remains public, private communities require membership/creator.
drop policy if exists "Criadores podem deletar comunidades" on public.communities;
drop policy if exists "Delete communities" on public.communities;
drop policy if exists "Insert communities" on public.communities;
drop policy if exists "Usuários autenticados podem criar comunidades" on public.communities;
drop policy if exists "Comunidades públicas são visíveis para todos" on public.communities;
drop policy if exists "Select communities" on public.communities;
drop policy if exists "Criadores podem atualizar comunidades" on public.communities;
drop policy if exists "Update communities" on public.communities;

drop policy if exists communities_select_anon_public on public.communities;
drop policy if exists communities_select_authenticated on public.communities;
drop policy if exists communities_insert_creator on public.communities;
drop policy if exists communities_update_creator on public.communities;
drop policy if exists communities_delete_creator on public.communities;

create policy communities_select_anon_public
on public.communities for select to anon
using (is_private = false);

create policy communities_select_authenticated
on public.communities for select to authenticated
using (public.can_view_community(id));

create policy communities_insert_creator
on public.communities for insert to authenticated
with check (creator_id = (select auth.uid()));

create policy communities_update_creator
on public.communities for update to authenticated
using (creator_id = (select auth.uid()))
with check (creator_id = (select auth.uid()));

create policy communities_delete_creator
on public.communities for delete to authenticated
using (creator_id = (select auth.uid()));

-- community_members: no anonymous membership directory; public communities allow self-join.
-- Private communities require a manager to add members. Only managers can update member rows/roles.
drop policy if exists "Delete community_members" on public.community_members;
drop policy if exists "Usuários podem sair ou admins podem remover" on public.community_members;
drop policy if exists "Insert community_members" on public.community_members;
drop policy if exists "Usuários podem entrar em comunidades" on public.community_members;
drop policy if exists "Membros da comunidade são visíveis" on public.community_members;
drop policy if exists "Select community_members" on public.community_members;
drop policy if exists "Admins podem atualizar membros" on public.community_members;
drop policy if exists "Update community_members" on public.community_members;

drop policy if exists community_members_select_visible on public.community_members;
drop policy if exists community_members_insert_scoped on public.community_members;
drop policy if exists community_members_update_manager on public.community_members;
drop policy if exists community_members_delete_scoped on public.community_members;

create policy community_members_select_visible
on public.community_members for select to authenticated
using (public.can_view_community(community_id));

create policy community_members_insert_scoped
on public.community_members for insert to authenticated
with check (
  public.can_manage_community(community_id)
  or (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.is_private = false
    )
  )
);

create policy community_members_update_manager
on public.community_members for update to authenticated
using (public.can_manage_community(community_id))
with check (public.can_manage_community(community_id));

create policy community_members_delete_scoped
on public.community_members for delete to authenticated
using (
  user_id = (select auth.uid())
  or public.can_manage_community(community_id)
);

-- community_posts: public communities remain publicly readable; posting requires membership.
drop policy if exists "Autores ou admins podem deletar postagens" on public.community_posts;
drop policy if exists "Delete community_posts" on public.community_posts;
drop policy if exists "Insert community_posts" on public.community_posts;
drop policy if exists "Membros podem postar" on public.community_posts;
drop policy if exists "Postagens visíveis de acordo com a comunidade" on public.community_posts;
drop policy if exists "Select community_posts" on public.community_posts;
drop policy if exists "Autores podem atualizar postagens" on public.community_posts;
drop policy if exists "Update community_posts" on public.community_posts;

drop policy if exists community_posts_select_anon_public on public.community_posts;
drop policy if exists community_posts_select_authenticated on public.community_posts;
drop policy if exists community_posts_insert_member on public.community_posts;
drop policy if exists community_posts_update_author_or_manager on public.community_posts;
drop policy if exists community_posts_delete_author_or_manager on public.community_posts;

create policy community_posts_select_anon_public
on public.community_posts for select to anon
using (
  exists (
    select 1 from public.communities c
    where c.id = community_posts.community_id
      and c.is_private = false
  )
);

create policy community_posts_select_authenticated
on public.community_posts for select to authenticated
using (public.can_view_community(community_id));

create policy community_posts_insert_member
on public.community_posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (
    public.is_community_member(community_id)
    or public.can_manage_community(community_id)
  )
);

create policy community_posts_update_author_or_manager
on public.community_posts for update to authenticated
using (
  author_id = (select auth.uid())
  or public.can_manage_community(community_id)
)
with check (
  public.can_manage_community(community_id)
  or (
    author_id = (select auth.uid())
    and public.is_community_member(community_id)
  )
);

create policy community_posts_delete_author_or_manager
on public.community_posts for delete to authenticated
using (
  author_id = (select auth.uid())
  or public.can_manage_community(community_id)
);

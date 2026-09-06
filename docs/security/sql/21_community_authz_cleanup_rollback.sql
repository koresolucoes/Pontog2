-- Step 07A rollback — restore the exact pre-cleanup community policies captured on 2026-09-06.

-- Remove canonical policies first.
drop policy if exists communities_select_anon_public on public.communities;
drop policy if exists communities_select_authenticated on public.communities;
drop policy if exists communities_insert_creator on public.communities;
drop policy if exists communities_update_creator on public.communities;
drop policy if exists communities_delete_creator on public.communities;

drop policy if exists community_members_select_visible on public.community_members;
drop policy if exists community_members_insert_scoped on public.community_members;
drop policy if exists community_members_update_manager on public.community_members;
drop policy if exists community_members_delete_scoped on public.community_members;

drop policy if exists community_posts_select_anon_public on public.community_posts;
drop policy if exists community_posts_select_authenticated on public.community_posts;
drop policy if exists community_posts_insert_member on public.community_posts;
drop policy if exists community_posts_update_author_or_manager on public.community_posts;
drop policy if exists community_posts_delete_author_or_manager on public.community_posts;

-- Helpers are only used by the canonical policies.
drop function if exists public.is_community_member(uuid);
drop function if exists public.can_view_community(uuid);
drop function if exists public.can_manage_community(uuid);

-- Restore communities policies.
create policy "Criadores podem deletar comunidades"
on public.communities for delete to public
using (auth.uid() = creator_id);

create policy "Delete communities"
on public.communities for delete to authenticated
using (auth.uid() = creator_id);

create policy "Insert communities"
on public.communities for insert to authenticated
with check (auth.uid() = creator_id);

create policy "Usuários autenticados podem criar comunidades"
on public.communities for insert to public
with check (auth.uid() = creator_id);

create policy "Comunidades públicas são visíveis para todos"
on public.communities for select to public
using (
  (not is_private)
  or (
    auth.uid() in (
      select community_members.user_id
      from public.community_members
      where community_members.community_id = communities.id
    )
  )
);

create policy "Select communities"
on public.communities for select to authenticated
using (true);

create policy "Criadores podem atualizar comunidades"
on public.communities for update to public
using (auth.uid() = creator_id);

create policy "Update communities"
on public.communities for update to authenticated
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

-- Restore community_members policies.
create policy "Delete community_members"
on public.community_members for delete to authenticated
using (
  (auth.uid() = user_id)
  or exists (
    select 1 from public.communities
    where communities.id = community_members.community_id
      and communities.creator_id = auth.uid()
  )
);

create policy "Usuários podem sair ou admins podem remover"
on public.community_members for delete to public
using (
  (auth.uid() = user_id)
  or (
    auth.uid() in (
      select cm.user_id
      from public.community_members cm
      where cm.community_id = cm.community_id
        and cm.role = any (array['admin'::text, 'moderator'::text])
    )
  )
);

create policy "Insert community_members"
on public.community_members for insert to authenticated
with check (
  (auth.uid() = user_id)
  or exists (
    select 1 from public.communities
    where communities.id = community_members.community_id
      and communities.creator_id = auth.uid()
  )
);

create policy "Usuários podem entrar em comunidades"
on public.community_members for insert to public
with check (auth.uid() = user_id);

create policy "Membros da comunidade são visíveis"
on public.community_members for select to public
using (true);

create policy "Select community_members"
on public.community_members for select to authenticated
using (true);

create policy "Admins podem atualizar membros"
on public.community_members for update to public
using (
  auth.uid() in (
    select cm.user_id
    from public.community_members cm
    where cm.community_id = cm.community_id
      and cm.role = any (array['admin'::text, 'moderator'::text])
  )
);

create policy "Update community_members"
on public.community_members for update to authenticated
using (
  (auth.uid() = user_id)
  or exists (
    select 1 from public.communities
    where communities.id = community_members.community_id
      and communities.creator_id = auth.uid()
  )
);

-- Restore community_posts policies.
create policy "Autores ou admins podem deletar postagens"
on public.community_posts for delete to public
using (
  (auth.uid() = author_id)
  or (
    auth.uid() in (
      select cm.user_id
      from public.community_members cm
      where cm.community_id = community_posts.community_id
        and cm.role = any (array['admin'::text, 'moderator'::text])
    )
  )
);

create policy "Delete community_posts"
on public.community_posts for delete to authenticated
using (
  (auth.uid() = author_id)
  or exists (
    select 1 from public.communities c
    where c.id = community_posts.community_id
      and c.creator_id = auth.uid()
  )
);

create policy "Insert community_posts"
on public.community_posts for insert to authenticated
with check (auth.uid() = author_id);

create policy "Membros podem postar"
on public.community_posts for insert to public
with check (
  (auth.uid() = author_id)
  and (
    auth.uid() in (
      select community_members.user_id
      from public.community_members
      where community_members.community_id = community_posts.community_id
    )
  )
);

create policy "Postagens visíveis de acordo com a comunidade"
on public.community_posts for select to public
using (
  community_id in (
    select communities.id from public.communities
    where not communities.is_private
  )
  or (
    auth.uid() in (
      select community_members.user_id
      from public.community_members
      where community_members.community_id = community_posts.community_id
    )
  )
);

create policy "Select community_posts"
on public.community_posts for select to authenticated
using (
  exists (
    select 1 from public.communities c
    where c.id = community_posts.community_id
      and (
        c.is_private = false
        or c.creator_id = auth.uid()
        or exists (
          select 1 from public.community_members cm
          where cm.community_id = c.id
            and cm.user_id = auth.uid()
        )
      )
  )
);

create policy "Autores podem atualizar postagens"
on public.community_posts for update to public
using (auth.uid() = author_id);

create policy "Update community_posts"
on public.community_posts for update to authenticated
using (
  (auth.uid() = author_id)
  or exists (
    select 1 from public.communities c
    where c.id = community_posts.community_id
      and c.creator_id = auth.uid()
  )
);

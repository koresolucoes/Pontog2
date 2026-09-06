-- Step 04B — Private album grants and RLS hardening
-- Removes anon table privileges and closes requester self-grant.

begin;

revoke all privileges on table public.private_albums from anon;
revoke all privileges on table public.private_album_photos from anon;
revoke all privileges on table public.private_album_access from anon;

revoke all privileges on table public.private_albums from authenticated;
revoke all privileges on table public.private_album_photos from authenticated;
revoke all privileges on table public.private_album_access from authenticated;

grant select, insert, update, delete on table public.private_albums to authenticated;
grant select, insert, update, delete on table public.private_album_photos to authenticated;
grant select, insert, update, delete on table public.private_album_access to authenticated;

grant all privileges on table public.private_albums to service_role;
grant all privileges on table public.private_album_photos to service_role;
grant all privileges on table public.private_album_access to service_role;

-- Remove legacy permissive/public-role policies.
drop policy if exists "Enable management for album owners only" on public.private_albums;
drop policy if exists "Enable read access for album owners and granted users" on public.private_albums;
drop policy if exists "Enable management for photo owners only" on public.private_album_photos;
drop policy if exists "Enable read access for photo owners and granted users" on public.private_album_photos;
drop policy if exists "Owners can manage their album access requests" on public.private_album_access;
drop policy if exists "Requesters can view their own album access requests" on public.private_album_access;
drop policy if exists "Users can create album access requests" on public.private_album_access;

-- Albums.
create policy "private_albums_select_authorized"
on public.private_albums
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.private_album_access paa
    where paa.owner_id = private_albums.user_id
      and paa.requester_id = (select auth.uid())
      and paa.status = 'granted'
  )
);

create policy "private_albums_insert_own"
on public.private_albums
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "private_albums_update_own"
on public.private_albums
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "private_albums_delete_own"
on public.private_albums
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Album photos/media references.
create policy "private_album_photos_select_authorized"
on public.private_album_photos
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.private_album_access paa
    where paa.owner_id = private_album_photos.user_id
      and paa.requester_id = (select auth.uid())
      and paa.status = 'granted'
  )
);

create policy "private_album_photos_insert_own"
on public.private_album_photos
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.private_albums pa
    where pa.id = private_album_photos.album_id
      and pa.user_id = (select auth.uid())
  )
);

create policy "private_album_photos_update_own"
on public.private_album_photos
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.private_albums pa
    where pa.id = private_album_photos.album_id
      and pa.user_id = (select auth.uid())
  )
);

create policy "private_album_photos_delete_own"
on public.private_album_photos
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Access rows: both participants may read.
create policy "private_album_access_select_participants"
on public.private_album_access
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or requester_id = (select auth.uid())
);

-- Requester can only create a pending request for somebody else.
create policy "private_album_access_request_pending"
on public.private_album_access
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and owner_id is distinct from (select auth.uid())
  and status = 'pending'
);

-- Owner may preserve the legacy direct fallback, though the canonical grant path is the RPC.
create policy "private_album_access_owner_insert"
on public.private_album_access
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and requester_id is distinct from (select auth.uid())
  and status in ('pending', 'granted', 'denied')
);

create policy "private_album_access_owner_update"
on public.private_album_access
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and requester_id is distinct from (select auth.uid())
  and status in ('pending', 'granted', 'denied')
);

create policy "private_album_access_owner_delete"
on public.private_album_access
for delete
to authenticated
using (owner_id = (select auth.uid()));

commit;

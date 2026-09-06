-- Rollback for Step 04B — restores prior grants/policies.
-- WARNING: restores broad anon table privileges and requester INSERT without status restriction.

begin;

-- Remove hardened policies.
drop policy if exists "private_albums_select_authorized" on public.private_albums;
drop policy if exists "private_albums_insert_own" on public.private_albums;
drop policy if exists "private_albums_update_own" on public.private_albums;
drop policy if exists "private_albums_delete_own" on public.private_albums;

drop policy if exists "private_album_photos_select_authorized" on public.private_album_photos;
drop policy if exists "private_album_photos_insert_own" on public.private_album_photos;
drop policy if exists "private_album_photos_update_own" on public.private_album_photos;
drop policy if exists "private_album_photos_delete_own" on public.private_album_photos;

drop policy if exists "private_album_access_select_participants" on public.private_album_access;
drop policy if exists "private_album_access_request_pending" on public.private_album_access;
drop policy if exists "private_album_access_owner_insert" on public.private_album_access;
drop policy if exists "private_album_access_owner_update" on public.private_album_access;
drop policy if exists "private_album_access_owner_delete" on public.private_album_access;

-- Restore prior table grants.
grant all privileges on table public.private_albums to anon;
grant all privileges on table public.private_album_photos to anon;
grant all privileges on table public.private_album_access to anon;
grant all privileges on table public.private_albums to authenticated;
grant all privileges on table public.private_album_photos to authenticated;
grant all privileges on table public.private_album_access to authenticated;
grant all privileges on table public.private_albums to service_role;
grant all privileges on table public.private_album_photos to service_role;
grant all privileges on table public.private_album_access to service_role;

-- Restore prior policies.
create policy "Enable management for album owners only"
on public.private_albums
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Enable read access for album owners and granted users"
on public.private_albums
for select
to public
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.private_album_access paa
    where paa.owner_id = private_albums.user_id
      and paa.requester_id = auth.uid()
      and paa.status = 'granted'
  )
);

create policy "Enable management for photo owners only"
on public.private_album_photos
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Enable read access for photo owners and granted users"
on public.private_album_photos
for select
to public
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.private_album_access paa
    where paa.owner_id = private_album_photos.user_id
      and paa.requester_id = auth.uid()
      and paa.status = 'granted'
  )
);

create policy "Owners can manage their album access requests"
on public.private_album_access
for all
to public
using (auth.uid() = owner_id);

create policy "Requesters can view their own album access requests"
on public.private_album_access
for select
to public
using (auth.uid() = requester_id);

create policy "Users can create album access requests"
on public.private_album_access
for insert
to public
with check (auth.uid() = requester_id);

commit;

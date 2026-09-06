-- Step 04C — Add private media bucket and authorization policies.
-- Additive only: no existing object is moved and no current client writes here yet.
-- Target path convention: <owner_uuid>/albums/<album_id>/<object_name>

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'private_media',
  'private_media',
  false,
  52428800,
  array['image/*', 'video/*', 'audio/*']::text[]
)
on conflict (id) do nothing;

create policy "private_media_select_authorized"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private_media'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or exists (
      select 1
      from public.private_album_access paa
      where paa.owner_id::text = split_part(storage.objects.name, '/', 1)
        and paa.requester_id = (select auth.uid())
        and paa.status = 'granted'
    )
  )
);

create policy "private_media_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private_media'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "private_media_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private_media'
  and split_part(name, '/', 1) = (select auth.uid())::text
)
with check (
  bucket_id = 'private_media'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "private_media_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private_media'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

commit;

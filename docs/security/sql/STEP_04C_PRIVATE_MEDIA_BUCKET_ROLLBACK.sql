-- Rollback for Step 04C.
-- Safe only while private_media is empty. If objects exist, keep the bucket and migrate data first.

begin;

drop policy if exists "private_media_select_authorized" on storage.objects;
drop policy if exists "private_media_insert_own" on storage.objects;
drop policy if exists "private_media_update_own" on storage.objects;
drop policy if exists "private_media_delete_own" on storage.objects;

delete from storage.buckets b
where b.id = 'private_media'
  and not exists (
    select 1 from storage.objects o where o.bucket_id = b.id
  );

commit;

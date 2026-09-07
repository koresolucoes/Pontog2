-- Rollback for 45_private_album_bucket_forward.sql.
-- Only run if no application code depends on storage_bucket.

alter table public.private_album_photos
  drop constraint if exists private_album_photos_storage_bucket_check;

alter table public.private_album_photos
  drop column if exists storage_bucket;

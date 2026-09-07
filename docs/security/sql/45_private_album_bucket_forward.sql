-- Backend finalization — distinguish legacy public album objects from private media.

alter table public.private_album_photos
  add column if not exists storage_bucket text not null default 'user_uploads';

alter table public.private_album_photos
  drop constraint if exists private_album_photos_storage_bucket_check;

alter table public.private_album_photos
  add constraint private_album_photos_storage_bucket_check
  check (storage_bucket in ('user_uploads', 'private_media'));

comment on column public.private_album_photos.storage_bucket is
  'Physical Supabase Storage bucket. Legacy rows start in user_uploads and are migrated to private_media.';

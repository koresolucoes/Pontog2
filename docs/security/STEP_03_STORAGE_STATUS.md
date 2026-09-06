# Step 03 — Storage Hardening Status

Date: 2026-09-05
Parent: #6 / #1
Architecture: #14

## Confirmed architecture problem

`user_uploads` currently mixes several media classes:

- profile avatar;
- public profile photos;
- profile presentation video;
- private album photos/videos;
- view-once/audio media;
- user venue suggestions;
- legacy Admin News images;
- legacy Admin Venue images.

`getPublicImageUrl()` is hard-wired to `user_uploads`, so relative private-album paths become public URLs. Private-album confidentiality therefore cannot be solved by table RLS alone.

## Production Storage inventory

Buckets:

- `news_images`: public read bucket, image MIME intent.
- `venues`: public read bucket, image MIME intent.
- `user_uploads`: public read bucket containing image/video/audio and mixed purposes.

Existing object sample/aggregate confirms user-owned media plus a small number of ownerless legacy/admin objects.

## Applied to production Supabase

### 03A — Mutation containment
Migration: `security_step_03a_storage_mutation_containment`

- removed anonymous INSERT/UPDATE/DELETE policies from dedicated `news_images` bucket while retaining public SELECT;
- removed anonymous INSERT/UPDATE/DELETE policies from dedicated `venues` bucket while retaining public SELECT;
- removed unrestricted UPDATE/DELETE from `user_uploads`;
- canonical DELETE now requires `authenticated` and `auth.uid() = owner`.

### 03B — INSERT scoping
Migration: `security_step_03b_storage_insert_scoping`

- removed broad `PUBLIC` insert on all of `user_uploads`;
- authenticated uploads are limited to the user's UUID first path segment, plus the current `venues/venue_*` suggestion compatibility path;
- anonymous upload is temporarily limited to legacy Admin prefixes only:
  - `news_images/admin_*`
  - `venues/admin_*`
- temporary anon bridge only allows jpg/jpeg/png/webp/gif extensions.

This bridge exists only because current Admin News/Venues upload directly from the browser using the anon Supabase client.

## Media Engine work added

- server-side signed admin upload intent using Supabase `createSignedUploadUrl()`;
- dedicated bucket routing:
  - News -> `news_images`
  - Venue -> `venues`
- `/api/admin/media-upload` adapter with admin role enforcement;
- image MIME allowlist and randomized server-owned path;
- signed upload tokens are short-lived (Supabase signed upload validity: 2 hours).

## Next rollbackable substeps

### 03C — Migrate Admin writers
1. Admin News requests signed upload intent.
2. Browser uses `uploadToSignedUrl()` to `news_images`.
3. Admin Venues requests signed upload intent.
4. Browser uses `uploadToSignedUrl()` to `venues`.
5. Smoke-test create/edit flows.
6. Remove `legacy_admin_browser_image_insert` policy.

### 03D — Normalize user media paths
- avatar/public profile media -> explicit public media class;
- venue suggestion -> user-owned prefix;
- stop generic upload helpers from hiding media purpose.

### 03E — Private album media split
Use expand -> migrate -> contract:
1. create non-public private-media bucket;
2. new album uploads go to private bucket;
3. reads use signed URLs after album authorization;
4. backfill/move existing album objects in controlled batches;
5. only after verification stop generating public URLs for album media.

This step depends on the album authorization hardening because a private bucket without a trustworthy authorization decision merely moves the vulnerability.

## Rollback

- 03A and 03B each have explicit rollback SQL under `docs/security/sql/`.
- Media Engine/API additions are additive and unused by current UI until 03C; reverting code has no data migration.
- Existing object paths and URLs were not moved or deleted.

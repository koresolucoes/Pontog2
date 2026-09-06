# Step 04 — Privacy Surface Status

Date: 2026-09-05
Parent: #7 / #1
Architecture: #14

## Album authorization checkpoint — applied to production

### 04A — `grant_album_access` RPC
Migration: `security_step_04a_grant_album_access_hardening`

- unauthenticated/null actor explicitly rejected;
- album-not-found explicitly rejected;
- owner comparison uses `IS DISTINCT FROM`;
- target owner self-grant rejected;
- SECURITY DEFINER search_path fixed to `public, pg_temp`;
- EXECUTE revoked from PUBLIC/anon;
- authenticated + service_role preserved.

Verified:
- anon execute=false;
- authenticated execute=true;
- service_role execute=true.

### 04B — private album table grants/RLS
Migration: `security_step_04b_private_album_rls`

- `anon` has zero table privileges on:
  - `private_albums`
  - `private_album_photos`
  - `private_album_access`
- authenticated has only SELECT/INSERT/UPDATE/DELETE, constrained by RLS;
- requester INSERT can create only `status='pending'` for another owner;
- requester can no longer self-create `granted` access;
- owner may grant/update/delete access;
- album/photo ownership is explicit;
- photo INSERT/UPDATE requires the target album to belong to the same authenticated owner;
- granted readers retain SELECT through `private_album_access`.

Pre-migration consistency check:
- 4 albums;
- 4 media rows;
- 15 access rows;
- 12 granted rows;
- 0 owner=requester rows;
- 0 photo/album owner mismatches;
- 0 unexpected access statuses.

### 04C — private media foundation
Migration: `security_step_04c_private_media_bucket`

Created additive bucket:
- id: `private_media`;
- public: false;
- size limit: 50 MiB;
- MIME classes: image/*, video/*, audio/*;
- current object count: 0.

Path convention:
`<owner_uuid>/albums/<album_id>/<object>`

Policies:
- owner may SELECT/INSERT/UPDATE/DELETE own prefix;
- granted requester may SELECT owner prefix;
- no anon policy;
- existing `user_uploads` files are untouched.

## Why existing album media is not moved yet

Current UI calls `getPublicImageUrl()` for album paths and existing media lives in public `user_uploads`. Moving objects before the frontend switches to private reads would break albums.

Migration remains expand -> migrate -> contract:
1. authorization hardened (DONE);
2. private bucket exists (DONE);
3. update new album upload/read path;
4. validate owner + granted-reader flows;
5. migrate historical objects in batches;
6. stop public URL generation for album media;
7. remove legacy public copies only after verification.

## Next privacy block

Profiles currently mix public identity/discovery fields and sensitive/private fields in one row. Next work is to define a safe public projection, migrate discovery/profile consumers, and only then revoke broad direct profile reads.

## Rollback

Forward and rollback SQL for 04A/04B/04C is stored under `docs/security/sql/`.
04C rollback deletes the bucket only while it remains empty; after object migration, data must be migrated out before bucket removal.

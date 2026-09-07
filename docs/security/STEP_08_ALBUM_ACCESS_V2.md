# Step 08 — Private Album Access V2

Status: applied to Supabase production on 2026-09-07.

## Problem fixed

The legacy `private_album_access` model stored only `owner_id + requester_id`. The UI could say that a single album was shared, but the RLS grant actually authorized every private album owned by that profile. Chat expiry and view-once semantics also lived only in message JSON and were not enforced by the database.

## V2 model

`private_album_access` now supports:

- `album_id` — optional. Non-null means one specific album. Null means an explicit collection-wide request/grant.
- `expires_at` — database-enforced expiration.
- `is_view_once` — marks a one-time grant.
- `consumed_at` — records one-time consumption.

Existing access rows were migrated to the sole album of an owner whenever that owner had exactly one album. Owners with no album remain collection-scoped but authorize no album until the collection semantics are explicitly used.

## Access rules

Regular album access is allowed only when the authenticated user is the owner or has a valid grant matching that album (or an explicit collection grant), the grant is not expired and it has not been consumed.

One-time grants are intentionally excluded from direct table SELECT policies. They must be opened through `open_private_album_v2(album_id)`, which validates the grant and consumes it atomically before returning the album media.

## RPC contracts

- `grant_album_access_v2(album_id, target_user_id, expires_at, is_view_once)`
- `open_private_album_v2(album_id)`
- legacy `grant_album_access(album_id, target_user_id)` remains as a permanent album-specific compatibility wrapper.

Execution is granted only to `authenticated` and `service_role`, not `anon`.

## Frontend bridge

The legacy album store is preserved as `albumStoreLegacy.ts`. `albumStore.ts` overrides only the privacy-sensitive `grantAccess` and `fetchAlbumById` operations. `SelectAlbumModal` records the selected access intent so the Chat grant receives the same view-once/expiry semantics shown to the user.

## Validation

Validated inside a rolled-back transaction under the real `authenticated` role:

1. album owner creates a one-hour + view-once grant;
2. target user opens the album successfully;
3. `consumed_at` is written;
4. a second open returns SQLSTATE `42501`;
5. transaction is rolled back, leaving test data unchanged.

This closes the mismatch between the privacy language shown in Chat and the authorization actually enforced by Postgres.

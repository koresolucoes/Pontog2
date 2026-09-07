# Chat + Modal Hotfix Audit

Status: implemented, pending PR gate.

## Scope
- message send/open flows;
- view-once media lifecycle;
- message INSERT authorization;
- modal/bottom-sheet stacking above PulseDock;
- mobile safe-area handling.

## Findings and fixes
1. Recipients of view-once media updated `messages.viewed_at` directly, while the previous RLS only allowed UPDATE by the sender. This could raise `42501`.
   - Added `consume_view_once_message_v1` for atomic recipient consumption.
   - Added a narrowly-scoped recipient UPDATE policy for compatibility with the current client.
   - Added a trigger guard that rejects arbitrary recipient edits and allows only the validated view-once transition/cleanup.
   - Tested with an authenticated sender/recipient transaction under rollback: valid consume succeeds; arbitrary content tamper is blocked.
2. Message INSERT authorization previously depended on profile reads visible to the caller. That would regress when P0-5 removes the broad profile SELECT bridge.
   - Added `can_send_message_v1` SECURITY DEFINER and routed INSERT RLS through that explicit authorization contract.
3. PulseDock uses a root stacking layer while active screens establish their own stacking context. Local modals could therefore appear under the dock even with a high local z-index.
   - `ModalShell` now portals into `document.body` and respects mobile safe areas.
   - Legacy Community post detail and News reader modals are wrapped in body portals without rewriting their feature logic.
4. Vercel runtime errors for `/api/send-push` and `/api/send-generic-push` were checked for the last 24h and no runtime errors were found, so push delivery was not the root cause of the reported message failure.

## Follow-up
Chat photo/audio attachments still use the legacy `user_uploads` path. This is separate from private-album storage and should be migrated as a dedicated media-delivery change instead of being mixed into this hotfix.

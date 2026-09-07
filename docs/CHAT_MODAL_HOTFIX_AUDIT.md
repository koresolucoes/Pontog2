# Chat + Modal Hotfix Audit

Status: in progress.

Scope:
- message send/open flows;
- view-once media lifecycle;
- modal/bottom-sheet stacking above PulseDock;
- safe-area handling on mobile.

Key findings:
1. Recipients of view-once media update `messages.viewed_at` directly, but RLS only allows UPDATE by the sender. This can raise `42501` for recipients.
2. PulseDock uses `z-40`; multiple legacy modals/sheets use inconsistent z-index values, so some can render under the dock.
3. Chat media upload still routes through legacy `user_uploads` helpers for photo/audio; this needs explicit treatment and should not be confused with private-album media.

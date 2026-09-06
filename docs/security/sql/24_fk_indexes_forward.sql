-- Step 07B — additive FK/query indexes for critical launch paths.
-- Tables were measured before rollout; largest in this set was ~80 kB on 2026-09-06.

create index if not exists idx_b2b_transactions_wallet_id
  on public.b2b_transactions (wallet_id);

create index if not exists idx_payments_user_id
  on public.payments (user_id);

create index if not exists idx_private_albums_user_id
  on public.private_albums (user_id);

create index if not exists idx_private_album_photos_album_id
  on public.private_album_photos (album_id);

create index if not exists idx_private_album_photos_user_id
  on public.private_album_photos (user_id);

create index if not exists idx_private_album_access_requester_id
  on public.private_album_access (requester_id);

create index if not exists idx_venue_checkins_user_id
  on public.venue_checkins (user_id);

create index if not exists idx_venue_claims_user_id
  on public.venue_claims (user_id);

create index if not exists idx_admin_audit_logs_admin_id
  on public.admin_audit_logs (admin_id);

create index if not exists idx_communities_creator_id
  on public.communities (creator_id);

create index if not exists idx_community_posts_author_id
  on public.community_posts (author_id);

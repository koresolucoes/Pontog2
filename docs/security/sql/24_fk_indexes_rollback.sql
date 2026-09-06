-- Step 07B rollback — remove only indexes introduced by 24_fk_indexes_forward.sql.

drop index if exists public.idx_b2b_transactions_wallet_id;
drop index if exists public.idx_payments_user_id;
drop index if exists public.idx_private_albums_user_id;
drop index if exists public.idx_private_album_photos_album_id;
drop index if exists public.idx_private_album_photos_user_id;
drop index if exists public.idx_private_album_access_requester_id;
drop index if exists public.idx_venue_checkins_user_id;
drop index if exists public.idx_venue_claims_user_id;
drop index if exists public.idx_admin_audit_logs_admin_id;
drop index if exists public.idx_communities_creator_id;
drop index if exists public.idx_community_posts_author_id;

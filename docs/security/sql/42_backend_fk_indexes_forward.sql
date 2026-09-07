-- Backend finalization — covering indexes for foreign keys reported by Supabase Advisor.
-- Current largest affected table is < 1 MB, so normal CREATE INDEX is low-risk here.

create index if not exists agora_comment_likes_user_id_idx on public.agora_comment_likes(user_id);
create index if not exists agora_post_comments_user_id_idx on public.agora_post_comments(user_id);
create index if not exists agora_post_likes_user_id_idx on public.agora_post_likes(user_id);
create index if not exists agora_posts_venue_id_idx on public.agora_posts(venue_id);
create index if not exists community_comments_author_id_idx on public.community_comments(author_id);
create index if not exists community_join_requests_user_id_idx on public.community_join_requests(user_id);
create index if not exists community_post_likes_user_id_idx on public.community_post_likes(user_id);
create index if not exists community_posts_repost_id_idx on public.community_posts(repost_id);
create index if not exists donations_user_id_idx on public.donations(user_id);
create index if not exists favorites_favorite_id_idx on public.favorites(favorite_id);
create index if not exists news_comment_likes_user_id_idx on public.news_comment_likes(user_id);
create index if not exists news_comments_article_id_idx on public.news_comments(article_id);
create index if not exists news_comments_user_id_idx on public.news_comments(user_id);
create index if not exists payment_effects_actor_user_id_idx on public.payment_effects(actor_user_id);
create index if not exists profile_looking_for_looking_for_id_idx on public.profile_looking_for(looking_for_id);
create index if not exists profile_tribes_tribe_id_idx on public.profile_tribes(tribe_id);
create index if not exists system_settings_updated_by_idx on public.system_settings(updated_by);
create index if not exists venue_bans_user_id_idx on public.venue_bans(user_id);
create index if not exists venue_claims_reviewed_by_idx on public.venue_claims(reviewed_by);
create index if not exists venue_posts_venue_id_idx on public.venue_posts(venue_id);
create index if not exists venue_review_likes_user_id_idx on public.venue_review_likes(user_id);
create index if not exists venue_review_replies_user_id_idx on public.venue_review_replies(user_id);
create index if not exists venue_reviews_user_id_idx on public.venue_reviews(user_id);
create index if not exists venues_owner_id_idx on public.venues(owner_id);
create index if not exists venues_submitted_by_idx on public.venues(submitted_by);
create index if not exists video_likes_user_id_idx on public.video_likes(user_id);
create index if not exists videos_user_id_idx on public.videos(user_id);

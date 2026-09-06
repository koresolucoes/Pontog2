-- Step 07B.2 — remove only constraints proven to duplicate an equivalent constraint.
-- notification_preferences: PK already enforces UNIQUE(user_id, notification_type).
-- video_ratings: video_ratings_video_id_user_id_key remains and enforces the same pair.

alter table public.notification_preferences
  drop constraint if exists notification_preferences_user_id_notification_type_key;

alter table public.video_ratings
  drop constraint if exists unique_user_video_rating;

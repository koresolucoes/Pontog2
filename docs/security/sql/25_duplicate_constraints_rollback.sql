-- Step 07B.2 rollback — recreate the two redundant constraints removed by forward migration.

alter table public.notification_preferences
  add constraint notification_preferences_user_id_notification_type_key
  unique (user_id, notification_type);

alter table public.video_ratings
  add constraint unique_user_video_rating
  unique (video_id, user_id);

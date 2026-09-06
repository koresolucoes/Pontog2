-- Step 07G rollback — restore pre-antifraud view counter and remove only this ledger/index.

create or replace function public.increment_video_views(video_id integer)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.videos
  set views_count = coalesce(views_count, 0) + 1
  where id = video_id;
$$;

revoke all on function public.increment_video_views(integer) from public, anon;
grant execute on function public.increment_video_views(integer) to authenticated;

drop table if exists private.video_view_events;
drop index if exists private.b2b_campaign_metric_events_user_id_idx;

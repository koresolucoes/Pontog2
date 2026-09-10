drop policy if exists moderation_parent_visible_insert on public.agora_post_likes;
create policy moderation_parent_visible_insert on public.agora_post_likes as restrictive for insert to authenticated with check (private.moderation_content_visible('agora_post',post_id::text));

drop policy if exists moderation_parent_visible_insert on public.agora_comment_likes;
create policy moderation_parent_visible_insert on public.agora_comment_likes as restrictive for insert to authenticated with check (exists(select 1 from public.agora_post_comments c where c.id=agora_comment_likes.comment_id and private.moderation_content_visible('agora_comment',c.id::text) and private.moderation_content_visible('agora_post',c.post_id::text)));

drop policy if exists moderation_parent_visible_insert on public.video_likes;
create policy moderation_parent_visible_insert on public.video_likes as restrictive for insert to authenticated with check (private.moderation_content_visible('video',video_id::text));

drop policy if exists moderation_parent_visible_insert on public.video_ratings;
create policy moderation_parent_visible_insert on public.video_ratings as restrictive for insert to authenticated with check (private.moderation_content_visible('video',video_id::text));

drop policy if exists moderation_parent_visible_insert on public.video_comment_likes;
create policy moderation_parent_visible_insert on public.video_comment_likes as restrictive for insert to authenticated with check (exists(select 1 from public.video_comments c where c.id=video_comment_likes.comment_id and private.moderation_content_visible('video_comment',c.id::text) and private.moderation_content_visible('video',c.video_id::text)));

drop policy if exists moderation_parent_visible_insert on public.community_post_likes;
create policy moderation_parent_visible_insert on public.community_post_likes as restrictive for insert to authenticated with check (private.moderation_content_visible('community_post',post_id::text));

drop policy if exists moderation_parent_visible_insert on public.venue_review_likes;
create policy moderation_parent_visible_insert on public.venue_review_likes as restrictive for insert to authenticated with check (private.moderation_content_visible('venue_review',review_id::text));

create or replace function public.increment_video_views(video_id integer)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not private.moderation_content_visible('video',video_id::text) then return; end if;
 update public.videos set views_count=coalesce(views_count,0)+1 where id=video_id;
end;$$;
notify pgrst,'reload schema';
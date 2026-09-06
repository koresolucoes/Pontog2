-- Step 07A.3 — close direct authenticated execution of an orphan SECURITY DEFINER trigger helper.
-- The function is not attached to any trigger and has no repository consumer.

revoke execute on function public.update_video_comments_count() from authenticated;

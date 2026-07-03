CREATE OR REPLACE FUNCTION public.update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_video_likes_insert ON public.video_likes;
CREATE TRIGGER tr_video_likes_insert
AFTER INSERT ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.update_video_likes_count();

DROP TRIGGER IF EXISTS tr_video_likes_delete ON public.video_likes;
CREATE TRIGGER tr_video_likes_delete
AFTER DELETE ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.update_video_likes_count();

CREATE OR REPLACE FUNCTION public.update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos 
    SET ratings_count = COALESCE(ratings_count, 0) + 1,
        rating = ((COALESCE(rating, 5) * COALESCE(ratings_count, 0)) + NEW.rating) / (COALESCE(ratings_count, 0) + 1)
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos 
    SET ratings_count = GREATEST(COALESCE(ratings_count, 0) - 1, 0)
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_video_comments_insert ON public.video_ratings;
CREATE TRIGGER tr_video_comments_insert
AFTER INSERT ON public.video_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_video_comments_count();

DROP TRIGGER IF EXISTS tr_video_comments_delete ON public.video_ratings;
CREATE TRIGGER tr_video_comments_delete
AFTER DELETE ON public.video_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_video_comments_count();

CREATE OR REPLACE FUNCTION increment_video_views(p_video_id bigint)
RETURNS void AS $$
BEGIN
  UPDATE public.videos SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

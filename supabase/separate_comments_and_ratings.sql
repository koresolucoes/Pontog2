-- SQL script to separate Comments and Ratings in Supabase
-- Run this in your Supabase SQL Editor.

-- =========================================================================
-- 1. CLEAN UP & PREPARE FOR MIGRATION
-- =========================================================================

-- Create video_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.video_comments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    video_id bigint REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create video_comment_likes table for high-performance comment liking
CREATE TABLE IF NOT EXISTS public.video_comment_likes (
    comment_id bigint NOT NULL, -- references video_comments.id or video_ratings.id (flexible to support both schemas smoothly)
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);

-- Copy existing comments from video_ratings to the new video_comments table
-- (Only copies rows where comment is not empty)
INSERT INTO public.video_comments (video_id, user_id, comment, created_at)
SELECT video_id, user_id, comment, created_at
FROM public.video_ratings
WHERE comment IS NOT NULL AND comment <> ''
ON CONFLICT DO NOTHING;

-- Clean up video_ratings table:
-- Delete ratings that were just placeholder rows for comments (rating = 0 or NULL)
DELETE FROM public.video_ratings WHERE rating = 0 OR rating IS NULL;

-- Remove any duplicate ratings to allow adding a unique constraint
-- (Keeps only the newest rating per user-video pair)
DELETE FROM public.video_ratings a
USING public.video_ratings b
WHERE a.id < b.id
  AND a.video_id = b.video_id
  AND a.user_id = b.user_id;

-- Drop the old comment column from video_ratings (since we migrated it)
-- To prevent lockups, we'll keep it or drop it cleanly:
ALTER TABLE public.video_ratings DROP COLUMN IF EXISTS comment;

-- Add check constraint to ensure ratings are always between 1 and 5
ALTER TABLE public.video_ratings DROP CONSTRAINT IF EXISTS chk_video_ratings_range;
ALTER TABLE public.video_ratings ADD CONSTRAINT chk_video_ratings_range CHECK (rating >= 1 AND rating <= 5);

-- Add unique constraint so a user can rate each video exactly once
ALTER TABLE public.video_ratings DROP CONSTRAINT IF EXISTS unique_user_video_rating;
ALTER TABLE public.video_ratings ADD CONSTRAINT unique_user_video_rating UNIQUE (video_id, user_id);

-- =========================================================================
-- 2. CREATE PERFORMANCE INDEXES FOR MILLIONS OF USERS
-- =========================================================================

-- Highly optimized indexes for video_comments queries
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON public.video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON public.video_comments(created_at DESC);

-- Highly optimized indexes for video_ratings queries
CREATE INDEX IF NOT EXISTS idx_video_ratings_video_id ON public.video_ratings(video_id);
CREATE INDEX IF NOT EXISTS idx_video_ratings_user_id ON public.video_ratings(user_id);

-- Highly optimized indexes for video_comment_likes queries
CREATE INDEX IF NOT EXISTS idx_video_comment_likes_comment_id ON public.video_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_video_comment_likes_user_id ON public.video_comment_likes(user_id);

-- =========================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on video_comments
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can see comments
DROP POLICY IF EXISTS select_video_comments ON public.video_comments;
CREATE POLICY select_video_comments ON public.video_comments FOR SELECT USING (true);

-- Insert policy: Authenticated users can comment as themselves
DROP POLICY IF EXISTS insert_video_comments ON public.video_comments;
CREATE POLICY insert_video_comments ON public.video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update policy: Users can edit their own comments
DROP POLICY IF EXISTS update_video_comments ON public.video_comments;
CREATE POLICY update_video_comments ON public.video_comments FOR UPDATE USING (auth.uid() = user_id);

-- Delete policy: Users can delete their own comments
DROP POLICY IF EXISTS delete_video_comments ON public.video_comments;
CREATE POLICY delete_video_comments ON public.video_comments FOR DELETE USING (auth.uid() = user_id);


-- Enable RLS on video_ratings
ALTER TABLE public.video_ratings ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can see ratings
DROP POLICY IF EXISTS select_video_ratings ON public.video_ratings;
CREATE POLICY select_video_ratings ON public.video_ratings FOR SELECT USING (true);

-- Insert policy: Authenticated users can rate as themselves
DROP POLICY IF EXISTS insert_video_ratings ON public.video_ratings;
CREATE POLICY insert_video_ratings ON public.video_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update policy: Users can update their own ratings
DROP POLICY IF EXISTS update_video_ratings ON public.video_ratings;
CREATE POLICY update_video_ratings ON public.video_ratings FOR UPDATE USING (auth.uid() = user_id);

-- Delete policy: Users can delete their own ratings
DROP POLICY IF EXISTS delete_video_ratings ON public.video_ratings;
CREATE POLICY delete_video_ratings ON public.video_ratings FOR DELETE USING (auth.uid() = user_id);


-- Enable RLS on video_comment_likes
ALTER TABLE public.video_comment_likes ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can see comment likes
DROP POLICY IF EXISTS select_video_comment_likes ON public.video_comment_likes;
CREATE POLICY select_video_comment_likes ON public.video_comment_likes FOR SELECT USING (true);

-- Insert policy: Authenticated users can like comments as themselves
DROP POLICY IF EXISTS insert_video_comment_likes ON public.video_comment_likes;
CREATE POLICY insert_video_comment_likes ON public.video_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Delete policy: Users can unlike comments
DROP POLICY IF EXISTS delete_video_comment_likes ON public.video_comment_likes;
CREATE POLICY delete_video_comment_likes ON public.video_comment_likes FOR DELETE USING (auth.uid() = user_id);


-- =========================================================================
-- 4. AUTOMATED HIGH-PERFORMANCE TRIGGERS (AGGREGATIONS)
-- =========================================================================

-- Triggers for video_ratings: auto-computes avg rating and total count on 'videos'
CREATE OR REPLACE FUNCTION public.update_video_ratings_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_video_id bigint;
  v_avg_rating numeric;
  v_ratings_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_video_id := OLD.video_id;
  ELSE
    v_video_id := NEW.video_id;
  END IF;

  -- Calculate true average and total count of ratings for this video
  SELECT COALESCE(AVG(rating), 5.0), COUNT(*)
  INTO v_avg_rating, v_ratings_count
  FROM public.video_ratings
  WHERE video_id = v_video_id;

  -- Update the parent video row
  UPDATE public.videos
  SET rating = v_avg_rating,
      ratings_count = v_ratings_count
  WHERE id = v_video_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind ratings trigger to INSERT, UPDATE, and DELETE on video_ratings
DROP TRIGGER IF EXISTS tr_video_ratings_change ON public.video_ratings;
CREATE TRIGGER tr_video_ratings_change
AFTER INSERT OR UPDATE OR DELETE ON public.video_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_video_ratings_stats();

-- Remove old triggers on public.video_ratings if they existed
DROP TRIGGER IF EXISTS tr_video_comments_insert ON public.video_ratings;
DROP TRIGGER IF EXISTS tr_video_comments_delete ON public.video_ratings;
DROP TRIGGER IF EXISTS tr_video_comments_insert ON public.video_comments;
DROP TRIGGER IF EXISTS tr_video_comments_delete ON public.video_comments;

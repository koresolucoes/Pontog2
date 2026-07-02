-- ====================================================================
-- SUPABASE MIGRATION SCRIPT - FIX PRIVATE COMMUNITIES & RLS POLICIES
-- ====================================================================
-- Copy and paste this ENTIRE script inside your Supabase SQL Editor 
-- (found in your Supabase Dashboard -> SQL Editor -> New Query) and run it.
-- ====================================================================

-- Ensure RLS is enabled on all community-related tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 1. CLEAN UP AND SETUP POLICIES FOR 'communities'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read" ON public.communities;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.communities;
DROP POLICY IF EXISTS "Allow creator update" ON public.communities;
DROP POLICY IF EXISTS "Allow creator delete" ON public.communities;
DROP POLICY IF EXISTS "authenticated_insert" ON public.communities;
DROP POLICY IF EXISTS "communities_insert_policy" ON public.communities;
DROP POLICY IF EXISTS "communities_select_policy" ON public.communities;
DROP POLICY IF EXISTS "communities_update_policy" ON public.communities;
DROP POLICY IF EXISTS "communities_delete_policy" ON public.communities;
DROP POLICY IF EXISTS "Select communities" ON public.communities;
DROP POLICY IF EXISTS "Insert communities" ON public.communities;
DROP POLICY IF EXISTS "Update communities" ON public.communities;
DROP POLICY IF EXISTS "Delete communities" ON public.communities;

-- Create policies for 'communities'
-- SELECT: Anyone logged in can discover any community (public or private) so they can read details and apply to join.
CREATE POLICY "Select communities" ON public.communities
    FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated users can create a community (public or private) as long as they are set as the creator.
CREATE POLICY "Insert communities" ON public.communities
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- UPDATE: Only the creator of the community can update its details.
CREATE POLICY "Update communities" ON public.communities
    FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- DELETE: Only the creator of the community can delete it.
CREATE POLICY "Delete communities" ON public.communities
    FOR DELETE TO authenticated USING (auth.uid() = creator_id);


-- --------------------------------------------------------------------
-- 2. CLEAN UP AND SETUP POLICIES FOR 'community_members'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Select community_members" ON public.community_members;
DROP POLICY IF EXISTS "Insert community_members" ON public.community_members;
DROP POLICY IF EXISTS "Update community_members" ON public.community_members;
DROP POLICY IF EXISTS "Delete community_members" ON public.community_members;
DROP POLICY IF EXISTS "member_insert_policy" ON public.community_members;
DROP POLICY IF EXISTS "member_select_policy" ON public.community_members;
DROP POLICY IF EXISTS "member_delete_policy" ON public.community_members;

-- Create policies for 'community_members'
-- SELECT: Anyone logged in can see members of communities.
CREATE POLICY "Select community_members" ON public.community_members
    FOR SELECT TO authenticated USING (true);

-- INSERT: A user can join a community (making a member record for themselves) or a community creator can add members.
CREATE POLICY "Insert community_members" ON public.community_members
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.communities 
            WHERE id = community_id AND creator_id = auth.uid()
        )
    );

-- UPDATE: Community creators or members can update role statuses.
CREATE POLICY "Update community_members" ON public.community_members
    FOR UPDATE TO authenticated USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.communities 
            WHERE id = community_id AND creator_id = auth.uid()
        )
    );

-- DELETE: A user can leave a community, or a community creator/admin can remove/ban a member.
CREATE POLICY "Delete community_members" ON public.community_members
    FOR DELETE TO authenticated USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.communities 
            WHERE id = community_id AND creator_id = auth.uid()
        )
    );


-- --------------------------------------------------------------------
-- 3. CLEAN UP AND SETUP POLICIES FOR 'community_posts'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Select community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "Insert community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "Update community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "Delete community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "posts_select_policy" ON public.community_posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON public.community_posts;

-- Create policies for 'community_posts'
-- SELECT: Users can see posts inside a community if:
--   a) The community is public (is_private = false)
--   b) The user is the creator of the community
--   c) The user is a member of the community
CREATE POLICY "Select community_posts" ON public.community_posts
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = community_id 
            AND (
                c.is_private = false 
                OR c.creator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.community_members cm
                    WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
                )
            )
        )
    );

-- INSERT: Users can create posts if:
--   a) They are writing under their own user ID (author_id = auth.uid())
CREATE POLICY "Insert community_posts" ON public.community_posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- UPDATE: Only the author of the post or the community creator can edit/update posts.
CREATE POLICY "Update community_posts" ON public.community_posts
    FOR UPDATE TO authenticated USING (
        auth.uid() = author_id 
        OR EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = community_id AND c.creator_id = auth.uid()
        )
    );

-- DELETE: Only the author of the post or the community creator can delete posts.
CREATE POLICY "Delete community_posts" ON public.community_posts
    FOR DELETE TO authenticated USING (
        auth.uid() = author_id 
        OR EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = community_id AND c.creator_id = auth.uid()
        )
    );

-- Log completion message
SELECT 'Private communities database schema and RLS policies successfully updated!' AS status;

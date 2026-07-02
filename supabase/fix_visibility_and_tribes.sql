-- ====================================================================
-- SUPABASE MIGRATION SCRIPT - FIX LOCATION AND TRIBE FILTER BUG
-- ====================================================================
-- Copy and paste this ENTIRE script inside your Supabase SQL Editor 
-- (found in your Supabase Dashboard -> SQL Editor -> New Query) and run it.
-- ====================================================================

-- DROP existing functions first to ensure signatures are successfully updated.
DROP FUNCTION IF EXISTS public.get_nearby_profiles(double precision, double precision, integer, double precision);
DROP FUNCTION IF EXISTS public.get_popular_profiles_paginated(double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS public.get_active_agora_posts_paginated(integer, integer);
DROP FUNCTION IF EXISTS public.update_my_location(double precision, double precision);

-- 1. FIX: update_my_location
-- Originally, this function only updated the 'location' (geography) column,
-- leaving 'lat' and 'lng' as NULL. Since queries filtered out profiles where 
-- lat or lng was NULL, users became invisible after updating location.
-- This fixed version updates 'location', 'lat', and 'lng' columns simultaneously.
CREATE OR REPLACE FUNCTION public.update_my_location(new_lat double precision, new_lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    location = ST_SetSRID(ST_MakePoint(new_lng, new_lat), 4326)::geography,
    lat = new_lat,
    lng = new_lng
  WHERE
    id = auth.uid();
END;
$$;

-- 2. BACKFILL: Sync 'lat' and 'lng' columns for all existing profiles
-- This populates 'lat' and 'lng' from the 'location' column for any current users.
UPDATE public.profiles
SET 
  lat = ST_Y(location::geometry),
  lng = ST_X(location::geometry)
WHERE location IS NOT NULL AND (lat IS NULL OR lng IS NULL);

-- 3. Robust 'get_nearby_profiles' using PostGIS ST_Distance
-- This uses PostGIS geographic distance to ensure robust results, and falls back to ST_X/ST_Y if the lat/lng columns are ever empty.
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
    p_lat double precision, 
    p_lng double precision, 
    p_limit integer DEFAULT 50, 
    p_radius_km double precision DEFAULT 50
) RETURNS TABLE(
    id uuid, 
    username text, 
    avatar_url text, 
    date_of_birth date, 
    status_text text, 
    lat double precision, 
    lng double precision, 
    distance_km double precision, 
    is_verified boolean, 
    subscription_tier text,
    tribes text[]
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH current_user_info AS (
        SELECT 
            COALESCE(p_user.visibility, 'todos') AS c_visibility,
            (SELECT array_agg(pt_user.tribe_id) FROM public.profile_tribes pt_user WHERE pt_user.profile_id = auth.uid()) AS c_tribe_ids
        FROM public.profiles p_user 
        WHERE p_user.id = auth.uid()
    )
    SELECT 
        p.id, 
        p.username::text, 
        p.avatar_url::text, 
        p.date_of_birth::date, 
        p.status_text::text, 
        COALESCE(p.lat, ST_Y(p.location::geometry))::double precision AS lat, 
        COALESCE(p.lng, ST_X(p.location::geometry))::double precision AS lng,
        (ST_Distance(p.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0) AS distance_km,
        p.is_verified, 
        p.subscription_tier::text,
        ARRAY(
            SELECT t.name::text 
            FROM public.profile_tribes pt 
            JOIN public.tribes t ON pt.tribe_id = t.id 
            WHERE pt.profile_id = p.id
        )::text[] AS tribes
    FROM public.profiles p
    LEFT JOIN current_user_info cui ON TRUE
    WHERE p.id != auth.uid() 
      AND p.location IS NOT NULL
      AND (
          -- Symmetric and robust visibility check
          (COALESCE(cui.c_visibility, 'todos') = 'todos' OR EXISTS (SELECT 1 FROM public.profile_tribes pt WHERE pt.profile_id = p.id AND pt.tribe_id = ANY(cui.c_tribe_ids)))
          AND
          (COALESCE(p.visibility, 'todos') = 'todos' OR EXISTS (SELECT 1 FROM public.profile_tribes pt WHERE pt.profile_id = p.id AND pt.tribe_id = ANY(cui.c_tribe_ids)))
      )
      AND (ST_Distance(p.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0) <= p_radius_km
    ORDER BY distance_km ASC 
    LIMIT p_limit;
END;
$$;

-- 4. Robust 'get_popular_profiles_paginated' using PostGIS ST_Distance
CREATE OR REPLACE FUNCTION public.get_popular_profiles_paginated(
    p_lat double precision, 
    p_lng double precision, 
    p_limit integer DEFAULT 20, 
    p_offset integer DEFAULT 0
) RETURNS TABLE(
    id uuid, 
    username text, 
    avatar_url text, 
    date_of_birth date, 
    status_text text, 
    lat double precision, 
    lng double precision, 
    distance_km double precision, 
    is_verified boolean, 
    subscription_tier text,
    tribes text[]
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH current_user_info AS (
        SELECT 
            COALESCE(p_user.visibility, 'todos') AS c_visibility,
            (SELECT array_agg(pt_user.tribe_id) FROM public.profile_tribes pt_user WHERE pt_user.profile_id = auth.uid()) AS c_tribe_ids
        FROM public.profiles p_user 
        WHERE p_user.id = auth.uid()
    )
    SELECT 
        p.id, 
        p.username::TEXT, 
        p.avatar_url::TEXT, 
        p.date_of_birth::DATE, 
        p.status_text::TEXT, 
        p.lat, 
        p.lng,
        (6371 * acos(cos(radians(p_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p.lat)))) AS distance_km,
        p.is_verified, 
        p.subscription_tier::TEXT,
        ARRAY(
            SELECT t.name::text 
            FROM public.profile_tribes pt 
            JOIN public.tribes t ON pt.tribe_id = t.id 
            WHERE pt.profile_id = p.id
        )::text[] AS tribes
    FROM public.profiles p
    LEFT JOIN current_user_info cui ON TRUE
    WHERE p.id != auth.uid() 
      AND p.location IS NOT NULL
      AND (
          -- Symmetric and robust visibility check
          (COALESCE(cui.c_visibility, 'todos') = 'todos' OR EXISTS (SELECT 1 FROM public.profile_tribes pt WHERE pt.profile_id = p.id AND pt.tribe_id = ANY(cui.c_tribe_ids)))
          AND
          (COALESCE(p.visibility, 'todos') = 'todos' OR EXISTS (SELECT 1 FROM public.profile_tribes pt WHERE pt.profile_id = p.id AND pt.tribe_id = ANY(cui.c_tribe_ids)))
      )
    ORDER BY p.is_verified DESC, p.updated_at DESC NULLS LAST 
    LIMIT p_limit 
    OFFSET p_offset;
END;
$$;

-- 5. Symmetric and robust 'get_active_agora_posts_paginated'
CREATE OR REPLACE FUNCTION public.get_active_agora_posts_paginated(
    p_page integer DEFAULT 1, 
    p_limit integer DEFAULT 10
) RETURNS TABLE(
    id integer, 
    user_id uuid, 
    photo_url text, 
    status_text text, 
    expires_at timestamp with time zone, 
    created_at timestamp with time zone, 
    username text, 
    avatar_url text, 
    date_of_birth date, 
    likes_count integer, 
    comments_count integer, 
    user_has_liked boolean
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH current_user_info AS (
        SELECT 
            COALESCE(p_user.visibility, 'todos') AS c_visibility,
            (SELECT array_agg(pt_user.tribe_id) FROM public.profile_tribes pt_user WHERE pt_user.profile_id = auth.uid()) AS c_tribe_ids
        FROM public.profiles p_user 
        WHERE p_user.id = auth.uid()
    )
    SELECT 
        ap.id, 
        ap.user_id, 
        ap.photo_url::text, 
        ap.status_text::text, 
        ap.expires_at, 
        ap.created_at,
        p.username::text, 
        p.avatar_url::text, 
        p.date_of_birth::date, 
        ap.likes_count, 
        ap.comments_count,
        EXISTS (SELECT 1 FROM public.agora_post_likes apl WHERE apl.post_id = ap.id AND apl.user_id = auth.uid()) AS user_has_liked
    FROM public.agora_posts ap
    JOIN public.profiles p ON ap.user_id = p.id
    LEFT JOIN current_user_info cui ON TRUE
    WHERE ap.expires_at > NOW()
      AND (
          -- Symmetric and robust visibility check
          (COALESCE(cui.c_visibility, 'todos') = 'todos' OR EXISTS (SELECT 1 FROM public.profile_tribes pt WHERE pt.profile_id = p.id AND pt.tribe_id = ANY(cui.c_tribe_ids)))
          AND
          (COALESCE(p.visibility, 'todos') = 'todos' OR EXISTS (SELECT 1 FROM public.profile_tribes pt WHERE pt.profile_id = p.id AND pt.tribe_id = ANY(cui.c_tribe_ids)))
      )
    ORDER BY ap.created_at DESC 
    LIMIT p_limit 
    OFFSET (p_page - 1) * p_limit;
END;
$$;

-- 6. Guarantee that any NULL visibility values in the profiles table are defaulted to 'todos'
UPDATE public.profiles 
SET visibility = 'todos' 
WHERE visibility IS NULL;

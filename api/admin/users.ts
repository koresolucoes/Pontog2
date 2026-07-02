// api/admin/users.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const verifyAdmin = (req: VercelRequest) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    // This will throw if invalid, which is caught below
    jwt.verify(token, process.env.JWT_SECRET!);
};

// Server-safe function to construct public image URLs
const getPublicImageUrlServer = (supabaseClient: any, path: string | null | undefined): string => {
    const BUCKET_NAME = 'user_uploads';
    if (!path) return 'https://placehold.co/400x400/1f2937/d1d5db/png?text=G'; 
    
    if (path.startsWith('http')) {
        if (path.includes('?t=')) return path;
        return `${path}?t=${new Date().getTime()}`;
    }
    
    const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);

    return `${data.publicUrl}?t=${new Date().getTime()}`;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    verifyAdmin(req);
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any;

    // FIX: Fetch auth users and profiles separately and merge them in code.
    // This bypasses the PostgREST error "Could not find a relationship between 'profiles' and 'users'".
    
    // NOTE: This approach fetches up to 1000 users. For larger user bases, pagination would be required.
    const [{ data: { users: authUsers }, error: authUsersError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from('profiles').select(`*, profile_tribes ( tribes ( name ) )`)
    ]);

    if (authUsersError) throw authUsersError;
    if (profilesError) throw profilesError;

    const authUserMap = new Map<string, any>(authUsers.map((u: any) => [u.id, u]));
        
    const processedData = profiles.map((profile: any) => {
        const authUser = authUserMap.get(profile.id);
        const { profile_tribes, location, ...rest } = profile;
        
        return {
            ...rest,
            email: authUser?.email,
            created_at: authUser?.created_at,
            tribes: profile_tribes.map((pt: any) => pt.tribes.name),
            lat: location?.coordinates?.[1] ?? null,
            lng: location?.coordinates?.[0] ?? null,
            distance_km: null, // Distance is not relevant in the admin panel
            avatar_url: getPublicImageUrlServer(supabaseAdmin, profile.avatar_url),
            public_photos: (profile.public_photos || []).map((p: string) => getPublicImageUrlServer(supabaseAdmin, p)),
        }
    }).sort((a: any, b: any) => {
        // Sort by creation date descending, handling cases where it might be null
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    });

    res.status(200).json(processedData);

  } catch (error: any) {
    console.error(`Error in /api/admin/users: ${error.message}`);
    // Distinguish between auth errors and server errors for better client-side handling.
    if (error.message === 'Not authenticated' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Authentication failed' });
    }
    // For Supabase errors or other issues, send a 500
    return res.status(500).json({ error: error.message || 'A server error occurred.' });
  }
}
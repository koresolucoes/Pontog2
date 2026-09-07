// api/admin/users.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const verifyAdmin = (req: VercelRequest) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    jwt.verify(token, process.env.JWT_SECRET!);
};

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

    const [
      { data: { users: authUsers }, error: authUsersError },
      { data: profiles, error: profilesError },
      { data: privateProfiles, error: privateProfilesError },
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from('profiles').select(`*, profile_tribes ( tribes ( name ) )`),
      supabaseAdmin.from('profile_private').select('*'),
    ]);

    if (authUsersError) throw authUsersError;
    if (profilesError) throw profilesError;
    if (privateProfilesError) throw privateProfilesError;

    const authUserMap = new Map<string, any>(authUsers.map((u: any) => [u.id, u]));
    const privateProfileMap = new Map<string, any>((privateProfiles || []).map((p: any) => [p.profile_id, p]));

    const processedData = (profiles || []).map((profile: any) => {
        const authUser = authUserMap.get(profile.id);
        const privateProfile = privateProfileMap.get(profile.id) || {};
        const { profile_tribes, ...rest } = profile;
        const {
          profile_id: _profileId,
          updated_at: _privateUpdatedAt,
          location: privateLocation,
          ...privateRest
        } = privateProfile;

        return {
            ...rest,
            ...privateRest,
            email: authUser?.email,
            created_at: authUser?.created_at,
            tribes: (profile_tribes || []).map((pt: any) => pt.tribes?.name).filter(Boolean),
            lat: privateProfile.lat ?? privateLocation?.coordinates?.[1] ?? null,
            lng: privateProfile.lng ?? privateLocation?.coordinates?.[0] ?? null,
            distance_km: null,
            avatar_url: getPublicImageUrlServer(supabaseAdmin, profile.avatar_url),
            public_photos: (profile.public_photos || []).map((p: string) => getPublicImageUrlServer(supabaseAdmin, p)),
        };
    }).sort((a: any, b: any) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.status(200).json(processedData);

  } catch (error: any) {
    console.error(`Error in /api/admin/users: ${error.message}`);
    if (error.message === 'Not authenticated' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Authentication failed' });
    }
    return res.status(500).json({ error: error.message || 'A server error occurred.' });
  }
}
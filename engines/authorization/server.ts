import { createClient } from '@supabase/supabase-js';

export interface ServerUserIdentity {
  id: string;
  email?: string;
}

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Server configuration missing: ${name}`);
  return value;
};

export const createServerAuthorizationClient = () => createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
) as any;

export const authenticateServerUser = async (
  authHeader: string | string[] | undefined,
  client: any,
): Promise<ServerUserIdentity> => {
  const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!rawHeader?.startsWith('Bearer ')) throw new Error('Authentication required.');

  const token = rawHeader.slice('Bearer '.length).trim();
  if (!token) throw new Error('Authentication required.');

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error('Authentication required.');

  return { id: data.user.id, email: data.user.email || undefined };
};

export const requireVenueOwner = async (
  client: any,
  actorUserId: string,
  venueId: string,
): Promise<{ id: string; owner_id: string; name?: string }> => {
  const { data: venue, error } = await client
    .from('venues')
    .select('id, owner_id, name')
    .eq('id', venueId)
    .single();

  if (error || !venue) throw new Error('Venue not found.');
  if (venue.owner_id !== actorUserId) throw new Error('Venue does not belong to the authenticated user.');

  return venue;
};

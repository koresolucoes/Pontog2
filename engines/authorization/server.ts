import { createClient } from '@supabase/supabase-js';

export interface ServerUserIdentity {
  id: string;
  email?: string;
}

export interface AuthenticateServerUserOptions {
  /**
   * Keep true for normal application operations. Privacy/account-deletion
   * endpoints may explicitly opt out so a restricted user can still exercise
   * deletion rights while presenting a valid Supabase identity.
   */
  requireActive?: boolean;
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

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

const readVerifiedSessionId = (token: string): string => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) throw new Error('missing payload');
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as Record<string, unknown>;
    const sessionId = typeof payload.session_id === 'string' ? payload.session_id : '';
    if (!UUID.test(sessionId)) throw new Error('missing session id');
    return sessionId;
  } catch {
    throw new Error('Authentication required.');
  }
};

const requireOperationalSession = async (client: any, userId: string, token: string): Promise<void> => {
  // getUser(token) is called before this function, so the JWT has already been
  // verified by Supabase Auth. We only read its verified session_id claim here.
  const sessionId = readVerifiedSessionId(token);
  const { data: allowed, error } = await client.rpc('pg_server_session_allowed', {
    p_user_id: userId,
    p_session_id: sessionId,
  });

  if (error || allowed !== true) {
    throw new Error('Authentication required. Account or session inactive.');
  }
};

export const authenticateServerUser = async (
  authHeader: string | string[] | undefined,
  client: any,
  options: AuthenticateServerUserOptions = {},
): Promise<ServerUserIdentity> => {
  const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!rawHeader?.startsWith('Bearer ')) throw new Error('Authentication required.');

  const token = rawHeader.slice('Bearer '.length).trim();
  if (!token) throw new Error('Authentication required.');

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error('Authentication required.');

  if (options.requireActive !== false) {
    await requireOperationalSession(client, data.user.id, token);
  }

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

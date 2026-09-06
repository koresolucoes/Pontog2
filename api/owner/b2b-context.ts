import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
  requireVenueOwner,
} from '../../engines/authorization/server';

const queryValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const venueId = queryValue(req.query.venueId as string | string[] | undefined);
    if (!venueId) return res.status(400).json({ error: 'venueId é obrigatório.' });

    const client = createServerAuthorizationClient();
    const user = await authenticateServerUser(req.headers.authorization, client);
    await requireVenueOwner(client, user.id, venueId);

    const { data: wallet, error: walletError } = await client.rpc('ensure_b2b_wallet', {
      p_actor_user_id: user.id,
      p_venue_id: venueId,
    });
    if (walletError || !wallet?.id) throw walletError || new Error('Wallet could not be resolved.');

    const [{ data: campaigns, error: campaignError }, { data: transactions, error: transactionError }] = await Promise.all([
      client
        .from('b2b_campaigns')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false }),
      client
        .from('b2b_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (campaignError) throw campaignError;
    if (transactionError) throw transactionError;

    return res.status(200).json({
      wallet,
      campaigns: campaigns || [],
      transactions: transactions || [],
    });
  } catch (error: any) {
    const message = error?.message || 'Falha ao carregar dados B2B.';
    if (/authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (/venue not found/i.test(message)) return res.status(404).json({ error: 'Local não encontrado.' });
    if (/does not belong|not owned/i.test(message)) return res.status(403).json({ error: 'Você não possui este local.' });
    console.error('Owner B2B context failed:', error);
    return res.status(500).json({ error: 'Não foi possível carregar a carteira e as campanhas.' });
  }
}

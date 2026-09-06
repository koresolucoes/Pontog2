import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface PaymentRuntimeConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  mercadoPagoAccessToken: string;
  mercadoPagoWebhookSecret: string;
  publicBaseUrl: string;
}

export interface AuthenticatedPaymentUser {
  id: string;
  email?: string;
}

export interface MercadoPagoPaymentDetails {
  id: string | number;
  status?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string | null;
}

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Payment configuration missing: ${name}`);
  return value;
};

const normalizePublicBaseUrl = (raw: string): string => {
  const parsed = new URL(raw);
  const isLocalDev = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !isLocalDev) {
    throw new Error('Payment public base URL must use HTTPS.');
  }
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
};

const getPlatformProductionUrl = (): string | undefined => {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!host) return undefined;
  return host.includes('://') ? host : `https://${host}`;
};

export const getPaymentRuntimeConfig = (): PaymentRuntimeConfig => {
  const configuredBaseUrl = process.env.PAYMENTS_PUBLIC_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || getPlatformProductionUrl();

  if (!configuredBaseUrl) {
    throw new Error(
      'Payment configuration missing: PAYMENTS_PUBLIC_BASE_URL, NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL',
    );
  }

  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    mercadoPagoAccessToken: requireEnv('MERCADOPAGO_ACCESS_TOKEN'),
    mercadoPagoWebhookSecret: requireEnv('MERCADOPAGO_WEBHOOK_SECRET'),
    publicBaseUrl: normalizePublicBaseUrl(configuredBaseUrl),
  };
};

export const createPaymentAdminClient = (config: PaymentRuntimeConfig) => createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
) as any;

export const authenticatePaymentUser = async (
  authHeader: string | string[] | undefined,
  client: any,
): Promise<AuthenticatedPaymentUser> => {
  const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!rawHeader?.startsWith('Bearer ')) {
    throw new Error('Authentication required.');
  }

  const token = rawHeader.slice('Bearer '.length).trim();
  if (!token) throw new Error('Authentication required.');

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error('Authentication required.');

  return { id: data.user.id, email: data.user.email || undefined };
};

export const assertWalletOwnership = async (
  client: any,
  userId: string,
  walletId: string,
): Promise<{ id: string; venue_id: string; currency: string }> => {
  const { data: wallet, error: walletError } = await client
    .from('b2b_wallets')
    .select('id, venue_id, currency')
    .eq('id', walletId)
    .single();

  if (walletError || !wallet) throw new Error('Wallet not found.');

  const { data: venue, error: venueError } = await client
    .from('venues')
    .select('id, owner_id')
    .eq('id', wallet.venue_id)
    .maybeSingle();

  if (venueError || !venue) throw new Error('Wallet venue not found.');
  if (venue.owner_id !== userId) {
    throw new Error('Wallet does not belong to the authenticated user.');
  }

  return wallet;
};

export const buildPaymentUrls = (
  config: PaymentRuntimeConfig,
  successQuery: string,
  returnPath = '/',
): { success: string; failure: string; pending: string; notification: string } => {
  const normalizedPath = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  const withPaymentStatus = (status: string) => {
    const url = new URL(normalizedPath, `${config.publicBaseUrl}/`);
    url.searchParams.set('payment', status);
    return url.toString();
  };

  return {
    success: withPaymentStatus(successQuery),
    failure: withPaymentStatus('failure'),
    pending: withPaymentStatus('pending'),
    notification: new URL('/api/mercadopago-webhook', `${config.publicBaseUrl}/`).toString(),
  };
};

export const createMercadoPagoPreference = async (
  config: PaymentRuntimeConfig,
  preference: Record<string, unknown>,
  idempotencyKey: string,
): Promise<{ init_point: string; id?: string }> => {
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.mercadoPagoAccessToken}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(preference),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Mercado Pago preference creation failed.', response.status, detail.slice(0, 500));
    throw new Error('Could not create Mercado Pago preference.');
  }

  const data = await response.json() as { init_point?: string; id?: string };
  if (!data.init_point) throw new Error('Mercado Pago preference did not return init_point.');
  return { init_point: data.init_point, id: data.id };
};

export const verifyMercadoPagoSignature = (input: {
  signatureHeader: string | string[] | undefined;
  requestIdHeader: string | string[] | undefined;
  dataId: string | string[] | undefined;
  bodyDataId?: unknown;
  secret: string;
}): boolean => {
  const signature = Array.isArray(input.signatureHeader) ? input.signatureHeader[0] : input.signatureHeader;
  const requestId = Array.isArray(input.requestIdHeader) ? input.requestIdHeader[0] : input.requestIdHeader;
  const queryDataId = Array.isArray(input.dataId) ? input.dataId[0] : input.dataId;

  if (!signature || !requestId || !queryDataId) return false;
  if (input.bodyDataId != null && String(input.bodyDataId) !== String(queryDataId)) return false;

  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return acc;
    acc[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
    return acc;
  }, {});

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash || !/^[a-fA-F0-9]{64}$/.test(receivedHash)) return false;

  const manifest = `id:${queryDataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto.createHmac('sha256', input.secret).update(manifest).digest('hex');

  const received = Buffer.from(receivedHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

export const fetchMercadoPagoPayment = async (
  config: PaymentRuntimeConfig,
  paymentId: string,
): Promise<MercadoPagoPaymentDetails> => {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${config.mercadoPagoAccessToken}` },
  });

  if (!response.ok) {
    console.error('Mercado Pago payment lookup failed.', response.status);
    throw new Error('Could not fetch payment details from Mercado Pago.');
  }

  return await response.json() as MercadoPagoPaymentDetails;
};

const requireProviderAmount = (payment: MercadoPagoPaymentDetails): number => {
  const amount = Number(payment.transaction_amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid provider payment amount.');
  return amount;
};

const requireCurrency = (payment: MercadoPagoPaymentDetails): string => {
  const currency = String(payment.currency_id || '').toUpperCase();
  if (!currency) throw new Error('Provider payment currency missing.');
  return currency;
};

export const settleMercadoPagoPayment = async (
  client: any,
  payment: MercadoPagoPaymentDetails,
): Promise<Record<string, unknown>> => {
  const providerPaymentId = String(payment.id || '').trim();
  const externalReference = String(payment.external_reference || '').trim();
  const amount = requireProviderAmount(payment);
  const currency = requireCurrency(payment);

  if (!providerPaymentId || !externalReference) {
    throw new Error('Payment reference is incomplete.');
  }

  if (externalReference.startsWith('DONATION|')) {
    const donationId = Number(externalReference.split('|')[1]);
    if (!Number.isSafeInteger(donationId) || donationId <= 0) throw new Error('Invalid donation reference.');

    const { data, error } = await client.rpc('settle_donation_payment', {
      p_provider: 'mercadopago',
      p_provider_payment_id: providerPaymentId,
      p_donation_id: donationId,
      p_amount: amount,
      p_currency: currency,
    });
    if (error) throw error;
    return data || { status: 'processed' };
  }

  if (externalReference.startsWith('wallet_topup|')) {
    const [, walletId, actorUserId] = externalReference.split('|');
    if (!walletId || !actorUserId) throw new Error('Invalid wallet top-up reference.');

    const { data, error } = await client.rpc('settle_wallet_topup', {
      p_provider: 'mercadopago',
      p_provider_payment_id: providerPaymentId,
      p_wallet_id: walletId,
      p_actor_user_id: actorUserId,
      p_amount: amount,
      p_currency: currency,
    });
    if (error) throw error;
    return data || { status: 'processed' };
  }

  const [userId, planId, extra] = externalReference.split('|');
  if (!userId || !planId || extra) throw new Error('Invalid subscription reference.');

  const { data, error } = await client.rpc('settle_subscription_payment', {
    p_provider: 'mercadopago',
    p_provider_payment_id: providerPaymentId,
    p_user_id: userId,
    p_plan_id: planId,
    p_amount: amount,
    p_currency: currency,
  });
  if (error) throw error;
  return data || { status: 'processed' };
};

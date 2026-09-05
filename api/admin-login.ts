// api/admin-login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { getAdminAccounts, recordAuditLog, getSupabaseClient } from './admin/_utils.js';
import { verifyTOTP } from './admin/_totp.js';
import {
  checkAdminLoginRateLimit,
  clearAdminLoginFailures,
  createAdminLoginRateKey,
  getAdminJwtSecret,
  getLegacyAdminApiKey,
  recordAdminLoginFailure,
  secureSecretEquals,
} from '../engines/security/admin-security.server.js';

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] || 'unknown';
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim() || 'unknown';
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { email, password, apiKey, tempToken, mfaCode } = req.body ?? {};

  let jwtSecret: string;
  try {
    jwtSecret = getAdminJwtSecret();
  } catch (error) {
    console.error('Admin authentication is not configured.', error);
    return res.status(500).json({ error: 'Configuration error.' });
  }

  const identifier = typeof email === 'string' && email.trim()
    ? email
    : apiKey
      ? 'legacy-api-key'
      : tempToken
        ? 'mfa'
        : 'unknown';
  const rateKey = createAdminLoginRateKey(getClientIp(req), identifier);
  const rateDecision = checkAdminLoginRateLimit(rateKey);
  if (!rateDecision.allowed) {
    res.setHeader('Retry-After', String(rateDecision.retryAfterSeconds ?? 60));
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  }

  // 1. Multi-Factor (MFA) verification with temporary token.
  if (tempToken && mfaCode) {
    try {
      const decoded = jwt.verify(tempToken, jwtSecret) as any;
      if (decoded.purpose !== 'mfa_pending' || !decoded.email) {
        recordAdminLoginFailure(rateKey);
        return res.status(401).json({ error: 'Sessão MFA expirada ou inválida.' });
      }

      const supabaseAdmin = getSupabaseClient();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase integration is not configured.' });
      }

      const { data: dbAdmin, error: dbError } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('email', decoded.email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (dbError || !dbAdmin) {
        recordAdminLoginFailure(rateKey);
        return res.status(401).json({ error: 'Credenciais administrativas inválidas.' });
      }

      if (!dbAdmin.mfa_secret) {
        return res.status(400).json({ error: 'Autenticação em dois fatores não está habilitada para esta conta.' });
      }

      const isValidMfa = verifyTOTP(mfaCode, dbAdmin.mfa_secret);
      if (!isValidMfa) {
        recordAdminLoginFailure(rateKey);
        await recordAuditLog(
          req,
          { email: dbAdmin.email, name: dbAdmin.name, role: dbAdmin.role },
          'MFA_FAILED',
          dbAdmin.email,
          'Tentativa de login falhou: Código de 2FA incorreto.'
        );
        return res.status(401).json({ error: 'Código de autenticação em dois fatores inválido.' });
      }

      const adminUser = {
        email: dbAdmin.email,
        role: dbAdmin.role as 'owner' | 'moderator' | 'support' | 'financial',
        name: dbAdmin.name
      };

      const token = jwt.sign(adminUser, jwtSecret, { expiresIn: '8h' });
      clearAdminLoginFailures(rateKey);

      await recordAuditLog(
        req,
        adminUser,
        'LOGIN_MFA_SUCCESS',
        adminUser.email,
        `Login MFA concluído com sucesso via banco de dados por ${adminUser.name} (${adminUser.role}).`
      );

      return res.status(200).json({ token, adminUser });
    } catch {
      recordAdminLoginFailure(rateKey);
      return res.status(401).json({ error: 'Sessão temporária inválida ou expirada. Tente novamente.' });
    }
  }

  // 2. Legacy API-key login is enabled only when ADMIN_API_KEY is explicitly configured.
  if (apiKey) {
    const adminApiKey = getLegacyAdminApiKey();
    if (adminApiKey && secureSecretEquals(apiKey, adminApiKey)) {
      const legacyAdmin = {
        email: 'owner@pontog.com',
        role: 'owner' as const,
        name: 'Administrador Geral (Owner)',
      };

      const token = jwt.sign(legacyAdmin, jwtSecret, { expiresIn: '8h' });
      clearAdminLoginFailures(rateKey);

      await recordAuditLog(req, legacyAdmin, 'LOGIN', 'system', 'Login de admin efetuado com chave de acesso legada explicitamente configurada.');
      return res.status(200).json({ token, adminUser: legacyAdmin });
    }

    recordAdminLoginFailure(rateKey);
    return res.status(401).json({ error: 'Credenciais administrativas inválidas.' });
  }

  // 3. Email/password login.
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  // Prefer database-backed admin accounts.
  try {
    const supabaseAdmin = getSupabaseClient();
    if (supabaseAdmin) {
      const { data: dbAdmin, error: dbError } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (!dbError && dbAdmin && secureSecretEquals(password, dbAdmin.password_hash)) {
        if (dbAdmin.mfa_secret) {
          const pendingToken = jwt.sign(
            { email: dbAdmin.email, purpose: 'mfa_pending' },
            jwtSecret,
            { expiresIn: '5m' }
          );

          return res.status(200).json({
            mfaRequired: true,
            tempToken: pendingToken,
            message: 'Código de autenticação em dois fatores requerido.'
          });
        }

        const adminUser = {
          email: dbAdmin.email,
          role: dbAdmin.role as 'owner' | 'moderator' | 'support' | 'financial',
          name: dbAdmin.name
        };

        const token = jwt.sign(adminUser, jwtSecret, { expiresIn: '8h' });
        clearAdminLoginFailures(rateKey);

        await recordAuditLog(req, adminUser, 'LOGIN', adminUser.email, `Login realizado com sucesso via banco de dados por ${adminUser.name} (${adminUser.role}).`);
        return res.status(200).json({ token, adminUser });
      }
    }
  } catch (err) {
    console.warn('Could not query admins table; checking explicitly configured ADMIN_ACCOUNTS.', err);
  }

  // 4. Optional compatibility path: ADMIN_ACCOUNTS must be explicitly configured.
  let accounts;
  try {
    accounts = getAdminAccounts();
  } catch (error) {
    console.error('ADMIN_ACCOUNTS configuration is invalid.', error);
    return res.status(500).json({ error: 'Configuration error.' });
  }

  const admin = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());
  if (admin && secureSecretEquals(password, admin.password_hash)) {
    const adminUser = { email: admin.email, role: admin.role, name: admin.name };
    const token = jwt.sign(adminUser, jwtSecret, { expiresIn: '8h' });
    clearAdminLoginFailures(rateKey);

    await recordAuditLog(req, adminUser, 'LOGIN', adminUser.email, `Login realizado com sucesso por ${adminUser.name} (${adminUser.role}) [ADMIN_ACCOUNTS].`);
    return res.status(200).json({ token, adminUser });
  }

  recordAdminLoginFailure(rateKey);
  await recordAuditLog(
    req,
    { email, name: 'Tentativa Falha', role: 'guest' },
    'LOGIN_FAILED',
    email,
    `Tentativa inválida de login com e-mail: ${email}`
  );
  return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
}

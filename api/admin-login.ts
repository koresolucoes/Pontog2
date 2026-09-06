import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { getAdminAccounts, recordAuditLog, getSupabaseClient, type AdminRole } from './admin/_utils.js';
import { verifyTOTP } from './admin/_totp.js';

interface AdminIdentity {
  email: string;
  role: AdminRole;
  name: string;
}

function issueAdminToken(adminUser: AdminIdentity, jwtSecret: string) {
  return jwt.sign(adminUser, jwtSecret, { expiresIn: '8h' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { email, password, apiKey, tempToken, mfaCode } = req.body || {};
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT Secret not set in environment variables.');
    return res.status(500).json({ error: 'Configuration error.' });
  }

  // MFA completion uses a short-lived token that can only finish authentication.
  if (tempToken && mfaCode) {
    try {
      const decoded = jwt.verify(tempToken, jwtSecret) as any;
      if (decoded?.purpose !== 'mfa_pending' || typeof decoded?.email !== 'string') {
        return res.status(401).json({ error: 'Sessão MFA expirada ou inválida.' });
      }

      const supabaseAdmin = getSupabaseClient();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase integration is not configured.' });
      }

      const { data: dbAdmin, error: dbError } = await supabaseAdmin
        .from('admins')
        .select('email, name, role, mfa_secret, is_active')
        .eq('email', decoded.email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (dbError || !dbAdmin || !dbAdmin.mfa_secret) {
        return res.status(401).json({ error: 'Administrador não encontrado, desativado ou sem MFA.' });
      }

      if (!verifyTOTP(String(mfaCode), dbAdmin.mfa_secret)) {
        await recordAuditLog(
          req,
          { email: dbAdmin.email, name: dbAdmin.name, role: dbAdmin.role },
          'MFA_FAILED',
          dbAdmin.email,
          'Tentativa de login falhou: código de 2FA incorreto.',
        );
        return res.status(401).json({ error: 'Código de autenticação em dois fatores inválido.' });
      }

      const adminUser: AdminIdentity = {
        email: dbAdmin.email,
        role: dbAdmin.role as AdminRole,
        name: dbAdmin.name,
      };
      const token = issueAdminToken(adminUser, jwtSecret);

      await recordAuditLog(
        req,
        adminUser,
        'LOGIN_MFA_SUCCESS',
        adminUser.email,
        `Login MFA concluído por ${adminUser.name} (${adminUser.role}).`,
      );

      return res.status(200).json({ token, adminUser });
    } catch (err) {
      return res.status(401).json({ error: 'Sessão temporária inválida ou expirada. Tente novamente.' });
    }
  }

  // Legacy API-key login remains available only when an explicit secret exists.
  // There is no built-in/default key and therefore no fail-open owner account.
  if (apiKey) {
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      return res.status(401).json({ error: 'Login por chave administrativa não está habilitado.' });
    }
    if (String(apiKey) !== adminApiKey) {
      return res.status(401).json({ error: 'Chave de acesso inválida.' });
    }

    const legacyAdmin: AdminIdentity = {
      email: 'owner@pontog.com',
      role: 'owner',
      name: 'Administrador Geral (Owner)',
    };
    const token = issueAdminToken(legacyAdmin, jwtSecret);
    await recordAuditLog(req, legacyAdmin, 'LOGIN_LEGACY_KEY', 'system', 'Login de admin efetuado com chave legada explicitamente configurada.');
    return res.status(200).json({ token, adminUser: legacyAdmin });
  }

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const normalizedEmail = email.toLowerCase();

  // Primary source: server-only admins table.
  try {
    const supabaseAdmin = getSupabaseClient();
    if (supabaseAdmin) {
      const { data: dbAdmin, error: dbError } = await supabaseAdmin
        .from('admins')
        .select('email, password_hash, name, role, mfa_secret, is_active')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .single();

      if (!dbError && dbAdmin && dbAdmin.password_hash === password) {
        if (dbAdmin.mfa_secret) {
          const pendingToken = jwt.sign(
            { email: dbAdmin.email, purpose: 'mfa_pending' },
            jwtSecret,
            { expiresIn: '5m' },
          );
          return res.status(200).json({
            mfaRequired: true,
            tempToken: pendingToken,
            message: 'Código de autenticação em dois fatores requerido.',
          });
        }

        const adminUser: AdminIdentity = {
          email: dbAdmin.email,
          role: dbAdmin.role as AdminRole,
          name: dbAdmin.name,
        };
        const token = issueAdminToken(adminUser, jwtSecret);
        await recordAuditLog(req, adminUser, 'LOGIN', adminUser.email, `Login realizado por ${adminUser.name} (${adminUser.role}).`);
        return res.status(200).json({ token, adminUser });
      }
    }
  } catch (err) {
    console.warn('Admin database lookup failed; checking explicitly configured static accounts only.');
  }

  // Optional static accounts are accepted only from ADMIN_ACCOUNTS.
  const admin = getAdminAccounts().find((account) => account.email.toLowerCase() === normalizedEmail);
  if (admin && admin.password_hash === password) {
    const adminUser: AdminIdentity = { email: admin.email, role: admin.role, name: admin.name };
    const token = issueAdminToken(adminUser, jwtSecret);
    await recordAuditLog(req, adminUser, 'LOGIN_STATIC_ENV', adminUser.email, `Login via ADMIN_ACCOUNTS por ${adminUser.name} (${adminUser.role}).`);
    return res.status(200).json({ token, adminUser });
  }

  await recordAuditLog(
    req,
    { email: normalizedEmail, name: 'Tentativa Falha', role: 'guest' },
    'LOGIN_FAILED',
    normalizedEmail,
    'Tentativa inválida de login administrativo.',
  );
  return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
}

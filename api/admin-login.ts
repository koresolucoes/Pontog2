// api/admin-login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { getAdminAccounts, recordAuditLog, getSupabaseClient } from './admin/_utils.js';
import { verifyTOTP } from './admin/_totp.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { email, password, apiKey, tempToken, mfaCode } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT Secret not set in environment variables.');
    return res.status(500).json({ error: 'Configuration error.' });
  }

  // 1. Support Multi-Factor (MFA) Verification with Temp Token
  if (tempToken && mfaCode) {
    try {
      const decoded = jwt.verify(tempToken, jwtSecret) as any;
      if (decoded.purpose !== 'mfa_pending' || !decoded.email) {
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
        return res.status(401).json({ error: 'Administrador não encontrado ou desativado.' });
      }

      if (!dbAdmin.mfa_secret) {
        return res.status(400).json({ error: 'Autenticação em dois fatores não está habilitada para esta conta.' });
      }

      const isValidMfa = verifyTOTP(mfaCode, dbAdmin.mfa_secret);
      if (!isValidMfa) {
        // Record failed attempt
        await recordAuditLog(
          req,
          { email: dbAdmin.email, name: dbAdmin.name, role: dbAdmin.role },
          'MFA_FAILED',
          dbAdmin.email,
          'Tentativa de login falhou: Código de 2FA incorreto.'
        );
        return res.status(401).json({ error: 'Código de autenticação em dois fatores inválido.' });
      }

      // Successful MFA Login
      const adminUser = {
        email: dbAdmin.email,
        role: dbAdmin.role as 'owner' | 'moderator' | 'support' | 'financial',
        name: dbAdmin.name
      };

      const token = jwt.sign(
        adminUser, 
        jwtSecret, 
        { expiresIn: '8h' }
      );

      await recordAuditLog(
        req,
        adminUser,
        'LOGIN_MFA_SUCCESS',
        adminUser.email,
        `Login MFA concluído com sucesso via banco de dados por ${adminUser.name} (${adminUser.role}).`
      );

      return res.status(200).json({
        token,
        adminUser
      });

    } catch (err: any) {
      return res.status(401).json({ error: 'Sessão temporária inválida ou expirada. Tente novamente.' });
    }
  }

  // 2. Support legacy apiKey login
  if (apiKey) {
    const adminApiKey = process.env.ADMIN_API_KEY || 'pontog_admin';
    if (apiKey === adminApiKey) {
      const legacyAdmin = {
        email: 'owner@pontog.com',
        role: 'owner' as const,
        name: 'Administrador Geral (Owner)',
      };
      
      const token = jwt.sign(
        { 
          email: legacyAdmin.email, 
          role: legacyAdmin.role,
          name: legacyAdmin.name 
        }, 
        jwtSecret, 
        { expiresIn: '8h' }
      );

      // Record audit log
      await recordAuditLog(req, legacyAdmin, 'LOGIN', 'system', 'Login de admin efetuado com chave de acesso legada.');

      return res.status(200).json({ 
        token,
        adminUser: legacyAdmin
      });
    } else {
      return res.status(401).json({ error: 'Chave de acesso inválida.' });
    }
  }

  // 3. Support email/password login
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  // Try checking the database `admins` table first
  try {
    const supabaseAdmin = getSupabaseClient();
    if (supabaseAdmin) {
      const { data: dbAdmin, error: dbError } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (!dbError && dbAdmin) {
        if (dbAdmin.password_hash === password) {
          // If MFA is enabled (mfa_secret exists), don't return the real token yet!
          if (dbAdmin.mfa_secret) {
            const tempToken = jwt.sign(
              { email: dbAdmin.email, purpose: 'mfa_pending' },
              jwtSecret,
              { expiresIn: '5m' } // 5 minutes validity
            );

            return res.status(200).json({
              mfaRequired: true,
              tempToken,
              message: 'Código de autenticação em dois fatores requerido.'
            });
          }

          const adminUser = {
            email: dbAdmin.email,
            role: dbAdmin.role as 'owner' | 'moderator' | 'support' | 'financial',
            name: dbAdmin.name
          };

          const token = jwt.sign(
            adminUser, 
            jwtSecret, 
            { expiresIn: '8h' }
          );

          // Record audit log
          await recordAuditLog(req, adminUser, 'LOGIN', adminUser.email, `Login realizado com sucesso via banco de dados por ${adminUser.name} (${adminUser.role}).`);

          return res.status(200).json({ 
            token,
            adminUser
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not query admins table (might be missing in DB, falling back to static/env accounts).', err);
  }

  // 4. Fallback to static accounts in ADMIN_ACCOUNTS or hardcoded default
  const accounts = getAdminAccounts();
  const admin = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());

  if (admin && admin.password_hash === password) {
    const adminUser = {
      email: admin.email,
      role: admin.role,
      name: admin.name
    };

    const token = jwt.sign(
      adminUser, 
      jwtSecret, 
      { expiresIn: '8h' }
    );

    // Record audit log
    await recordAuditLog(req, adminUser, 'LOGIN', adminUser.email, `Login realizado com sucesso por ${adminUser.name} (${adminUser.role}) [Fallback Estático].`);

    return res.status(200).json({ 
      token,
      adminUser
    });
  } else {
    // Record audit log for failed attempts
    await recordAuditLog(
      req, 
      { email: email, name: 'Tentativa Falha', role: 'guest' }, 
      'LOGIN_FAILED', 
      email, 
      `Tentativa inválida de login com e-mail: ${email}`
    );
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
}


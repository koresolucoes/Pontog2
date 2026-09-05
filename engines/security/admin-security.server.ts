import { createHash, timingSafeEqual } from 'node:crypto';

export type AdminRole = 'owner' | 'moderator' | 'support' | 'financial';

export interface ConfiguredAdminAccount {
  email: string;
  password_hash: string;
  role: AdminRole;
  name: string;
}

export interface AdminLoginRateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

interface LoginAttemptState {
  failures: number;
  windowStartedAt: number;
  blockedUntil?: number;
}

const ADMIN_ROLES: readonly AdminRole[] = ['owner', 'moderator', 'support', 'financial'];
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginAttempts = new Map<string, LoginAttemptState>();

export class AdminSecurityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminSecurityConfigurationError';
  }
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole);
}

export function getAdminJwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) {
    throw new AdminSecurityConfigurationError('JWT_SECRET is required for admin authentication.');
  }
  return value;
}

export function getLegacyAdminApiKey(): string | null {
  const value = process.env.ADMIN_API_KEY?.trim();
  return value || null;
}

export function getConfiguredAdminAccounts(): ConfiguredAdminAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS?.trim();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AdminSecurityConfigurationError('ADMIN_ACCOUNTS must be valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new AdminSecurityConfigurationError('ADMIN_ACCOUNTS must be an array.');
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AdminSecurityConfigurationError(`ADMIN_ACCOUNTS[${index}] is invalid.`);
    }

    const account = item as Record<string, unknown>;
    const email = typeof account.email === 'string' ? account.email.trim().toLowerCase() : '';
    const passwordHash = typeof account.password_hash === 'string' ? account.password_hash : '';
    const name = typeof account.name === 'string' ? account.name.trim() : '';
    const role = account.role;

    if (!email || !passwordHash || !name || !isAdminRole(role)) {
      throw new AdminSecurityConfigurationError(`ADMIN_ACCOUNTS[${index}] is missing required fields.`);
    }

    return {
      email,
      password_hash: passwordHash,
      role,
      name,
    };
  });
}

export function secureSecretEquals(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string' || !provided || !expected) return false;
  const providedDigest = createHash('sha256').update(provided, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function createAdminLoginRateKey(ip: string, identifier: string): string {
  return createHash('sha256')
    .update(`${ip.trim()}|${identifier.trim().toLowerCase()}`, 'utf8')
    .digest('hex');
}

export function checkAdminLoginRateLimit(key: string, now = Date.now()): AdminLoginRateLimitDecision {
  const state = loginAttempts.get(key);
  if (!state) return { allowed: true };

  if (state.blockedUntil && state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - now) / 1000)),
    };
  }

  if (now - state.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
  }

  return { allowed: true };
}

export function recordAdminLoginFailure(key: string, now = Date.now()): void {
  const current = loginAttempts.get(key);
  const state = !current || now - current.windowStartedAt >= LOGIN_WINDOW_MS
    ? { failures: 0, windowStartedAt: now }
    : current;

  state.failures += 1;
  if (state.failures >= LOGIN_MAX_FAILURES) {
    state.blockedUntil = now + LOGIN_BLOCK_MS;
  }

  loginAttempts.set(key, state);
  pruneLoginAttempts(now);
}

export function clearAdminLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

function pruneLoginAttempts(now: number): void {
  if (loginAttempts.size < 2000) return;

  for (const [key, state] of loginAttempts) {
    const expiresAt = Math.max(
      state.windowStartedAt + LOGIN_WINDOW_MS,
      state.blockedUntil ?? 0,
    );
    if (expiresAt <= now) loginAttempts.delete(key);
  }
}

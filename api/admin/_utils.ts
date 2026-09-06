// api/admin/_utils.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';

export function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    try {
        return createClient(url, key);
    } catch (e) {
        return null;
    }
}

export interface AuditLog {
    id: string;
    admin_email: string;
    admin_name: string;
    role: string;
    action: string;
    target_id: string;
    details: string;
    ip_address: string;
    created_at: string;
}

const MEMORY_AUDIT_LOGS: AuditLog[] = [];
const MEMORY_SETTINGS: Record<string, any> = {
    maintenance_mode: false,
    ad_interval_feed: 5,
    ad_interval_inbox: 10,
    travel_mode_price: 19.90,
    allow_free_travel_weekend: true,
};

export type AdminRole = 'owner' | 'moderator' | 'support' | 'financial';

export interface AdminAccount {
    email: string;
    password_hash: string;
    role: AdminRole;
    name: string;
}

const ADMIN_ROLES = new Set<AdminRole>(['owner', 'moderator', 'support', 'financial']);

function isAdminRole(value: unknown): value is AdminRole {
    return typeof value === 'string' && ADMIN_ROLES.has(value as AdminRole);
}

// Static administrator accounts are opt-in only. There is intentionally no
// predictable default credential if ADMIN_ACCOUNTS is missing or malformed.
export function getAdminAccounts(): AdminAccount[] {
    const accountsEnv = process.env.ADMIN_ACCOUNTS;
    if (!accountsEnv) return [];

    try {
        const parsed = JSON.parse(accountsEnv);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((account: any): account is AdminAccount => (
            account
            && typeof account.email === 'string'
            && typeof account.password_hash === 'string'
            && account.password_hash.length > 0
            && typeof account.name === 'string'
            && isAdminRole(account.role)
        ));
    } catch (e) {
        console.error('Failed to parse ADMIN_ACCOUNTS env var. Static admin login is disabled.', e);
        return [];
    }
}

// Verify an admin token and fail closed unless it carries a complete,
// recognized administrative identity. MFA-pending tokens are never admin tokens.
export function verifyAdminAndGetRole(req: VercelRequest) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT Secret not configured in environment.');
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        if (
            decoded?.purpose
            || typeof decoded?.email !== 'string'
            || typeof decoded?.name !== 'string'
            || !isAdminRole(decoded?.role)
        ) {
            throw new Error('Incomplete admin identity');
        }

        return {
            email: decoded.email,
            role: decoded.role as AdminRole,
            name: decoded.name,
        };
    } catch (e: any) {
        throw new Error('Invalid or expired token');
    }
}

export function enforceRoles(req: VercelRequest, allowedRoles: AdminRole[]) {
    const admin = verifyAdminAndGetRole(req);
    if (!allowedRoles.includes(admin.role)) {
        throw new Error(`Forbidden: Role ${admin.role} does not have access to this operation.`);
    }
    return admin;
}

export async function getAuditLogs(req: VercelRequest): Promise<AuditLog[]> {
    const supabaseAdmin = getSupabaseClient();
    if (!supabaseAdmin) {
        return [...MEMORY_AUDIT_LOGS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.warn('Could not fetch audit logs from DB table. Falling back to memory logs.', err.message);
        return [...MEMORY_AUDIT_LOGS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
}

export async function recordAuditLog(
    req: VercelRequest,
    admin: { email: string; name: string; role: string },
    action: string,
    targetId: string,
    details: string
) {
    let ipAddress = '127.0.0.1';
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (Array.isArray(xForwardedFor)) {
        ipAddress = xForwardedFor[0] || '127.0.0.1';
    } else if (typeof xForwardedFor === 'string') {
        ipAddress = xForwardedFor.split(',')[0].trim();
    } else if (req.socket?.remoteAddress) {
        ipAddress = req.socket.remoteAddress;
    }

    const logEntry: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        admin_email: admin.email,
        admin_name: admin.name,
        role: admin.role,
        action,
        target_id: targetId,
        details,
        ip_address: ipAddress,
        created_at: new Date().toISOString(),
    };

    MEMORY_AUDIT_LOGS.push(logEntry);
    if (MEMORY_AUDIT_LOGS.length > 50) {
        MEMORY_AUDIT_LOGS.shift();
    }

    const supabaseAdmin = getSupabaseClient();
    if (supabaseAdmin) {
        try {
            const { error } = await supabaseAdmin
                .from('admin_audit_logs')
                .insert([{
                    id: logEntry.id,
                    admin_email: logEntry.admin_email,
                    admin_name: logEntry.admin_name,
                    role: logEntry.role,
                    action,
                    target_id: logEntry.target_id,
                    details: logEntry.details,
                    ip_address: logEntry.ip_address,
                    created_at: logEntry.created_at
                }]);
            if (error) throw error;
            console.log(`[AUDIT LOG] Log saved to DB successfully: ${action}`);
        } catch (err: any) {
            console.log(`[AUDIT LOG] Saved to memory: ${logEntry.admin_email} -> ${action}`);
        }
    } else {
        console.log(`[AUDIT LOG] Saved to memory: ${logEntry.admin_email} -> ${action}`);
    }
}

export async function getSystemSettings(): Promise<Record<string, any>> {
    const supabaseAdmin = getSupabaseClient();
    if (!supabaseAdmin) return MEMORY_SETTINGS;

    try {
        const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('*');

        if (error) throw error;

        const settings: Record<string, any> = { ...MEMORY_SETTINGS };
        if (data) {
            data.forEach((row: any) => {
                settings[row.key] = row.value;
            });
        }
        return settings;
    } catch (err) {
        return MEMORY_SETTINGS;
    }
}

export async function updateSystemSetting(key: string, value: any, adminEmail: string) {
    MEMORY_SETTINGS[key] = value;

    const supabaseAdmin = getSupabaseClient();
    if (supabaseAdmin) {
        try {
            const { error } = await supabaseAdmin
                .from('system_settings')
                .upsert({
                    key,
                    value,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        } catch (err) {
            console.warn(`Could not persist setting '${key}' in Supabase. Saved in memory only.`);
        }
    }
}

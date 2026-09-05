// api/admin/_utils.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import {
    getAdminJwtSecret,
    getConfiguredAdminAccounts,
    isAdminRole,
    type AdminRole,
} from '../../engines/security/admin-security.server.js';

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

// In-memory audit logs cache for warm serverless sessions if DB table doesn't exist yet
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

export interface AdminAccount {
    email: string;
    password_hash: string;
    role: AdminRole;
    name: string;
}

// Explicitly configured administrators only. There are no generated/default credentials.
export function getAdminAccounts(): AdminAccount[] {
    return getConfiguredAdminAccounts();
}

// Verify Admin token and return payload. Missing/unknown claims fail closed.
export function verifyAdminAndGetRole(req: VercelRequest) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');

    const jwtSecret = getAdminJwtSecret();

    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded || typeof decoded !== 'object') {
            throw new Error('Invalid token payload');
        }

        const email = typeof decoded.email === 'string' ? decoded.email : '';
        const name = typeof decoded.name === 'string' ? decoded.name : '';
        const role = decoded.role;

        if (!email || !name || !isAdminRole(role)) {
            throw new Error('Invalid admin claims');
        }

        return { email, role, name };
    } catch {
        throw new Error('Invalid or expired token');
    }
}

// Check role permissions against a list of allowed roles
export function enforceRoles(req: VercelRequest, allowedRoles: AdminRole[]) {
    const admin = verifyAdminAndGetRole(req);
    if (!allowedRoles.includes(admin.role)) {
        throw new Error(`Forbidden: Role ${admin.role} does not have access to this operation.`);
    }
    return admin;
}

// Get recent audit logs
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
        console.warn('Could not fetch audit logs from DB table (might be missing). Falling back to memory logs.', err.message);
        return [...MEMORY_AUDIT_LOGS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
}

// Record an audit log
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
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
            console.log(`[AUDIT LOG] Saved to memory (DB table missing): ${logEntry.admin_email} -> ${action}: ${details}`);
        }
    } else {
        console.log(`[AUDIT LOG] Saved to memory (Supabase not configured): ${logEntry.admin_email} -> ${action}: ${details}`);
    }
}

// System Settings Helper (dynamic config)
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
            console.warn(`Could not persist setting '${key}' in Supabase (table missing). Saved in memory only.`);
        }
    }
}

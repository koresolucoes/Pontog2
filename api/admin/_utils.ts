// api/admin/_utils.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

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
    password_hash: string; // Plaintext or hashes
    role: 'owner' | 'moderator' | 'support' | 'financial';
    name: string;
}

// Get all configured administrators
export function getAdminAccounts(): AdminAccount[] {
    const accountsEnv = process.env.ADMIN_ACCOUNTS;
    if (accountsEnv) {
        try {
            return JSON.parse(accountsEnv);
        } catch (e) {
            console.error('Failed to parse ADMIN_ACCOUNTS env var', e);
        }
    }

    // Default Fallback using ADMIN_API_KEY
    const baseKey = process.env.ADMIN_API_KEY || 'pontog_admin';
    return [
        {
            email: 'owner@pontog.com',
            password_hash: baseKey,
            role: 'owner',
            name: 'Administrador Geral (Owner)',
        },
        {
            email: 'moderator@pontog.com',
            password_hash: `${baseKey}_mod`,
            role: 'moderator',
            name: 'Moderação Ponto G',
        },
        {
            email: 'support@pontog.com',
            password_hash: `${baseKey}_support`,
            role: 'support',
            name: 'Suporte Técnico Ponto G',
        },
        {
            email: 'financial@pontog.com',
            password_hash: `${baseKey}_finance`,
            role: 'financial',
            name: 'Financeiro Ponto G',
        }
    ];
}

// Verify Admin token and return payload
export function verifyAdminAndGetRole(req: VercelRequest) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT Secret not configured in environment.');
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        return {
            email: decoded.email || 'legacy-admin@pontog.com',
            role: decoded.role || 'owner',
            name: decoded.name || 'Admin Legado',
        };
    } catch (e: any) {
        throw new Error('Invalid or expired token');
    }
}

// Check role permissions against a list of allowed roles
export function enforceRoles(req: VercelRequest, allowedRoles: ('owner' | 'moderator' | 'support' | 'financial')[]) {
    const admin = verifyAdminAndGetRole(req);
    if (!allowedRoles.includes(admin.role as any)) {
        throw new Error(`Forbidden: Role ${admin.role} does not have access to this operation.`);
    }
    return admin;
}

// Get recent audit logs
export async function getAuditLogs(req: VercelRequest): Promise<AuditLog[]> {
    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
        // Fallback to memory logs (sorted descending)
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
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
    const logEntry: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        admin_email: admin.email,
        admin_name: admin.name,
        role: admin.role,
        action,
        target_id: targetId,
        details,
        ip_address: ipAddress.split(',')[0].trim(),
        created_at: new Date().toISOString(),
    };

    // Save to memory cache (limit to 50 items)
    MEMORY_AUDIT_LOGS.push(logEntry);
    if (MEMORY_AUDIT_LOGS.length > 50) {
        MEMORY_AUDIT_LOGS.shift();
    }

    // Try to save to Supabase
    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { error } = await supabaseAdmin
            .from('admin_audit_logs')
            .insert([{
                id: logEntry.id,
                admin_email: logEntry.admin_email,
                admin_name: logEntry.admin_name,
                role: logEntry.role,
                action: logEntry.action,
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
}

// System Settings Helper (dynamic config)
export async function getSystemSettings(): Promise<Record<string, any>> {
    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
        // Table doesn't exist yet, return memory settings
        return MEMORY_SETTINGS;
    }
}

export async function updateSystemSetting(key: string, value: any, adminEmail: string) {
    MEMORY_SETTINGS[key] = value;

    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

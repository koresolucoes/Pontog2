// api/admin/stats.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles } from './_utils.js';
import { subDays, format, isAfter, parseISO } from 'date-fns';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // All admins are allowed to retrieve dashboard stats
    enforceRoles(req, ['owner', 'moderator', 'support', 'financial']);
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any;

    const [{ data: allProfiles, error: profilesError }, { data: authUsersData, error: authUsersError }] = await Promise.all([
      supabaseAdmin.from('profiles').select(`id, subscription_tier, subscription_expires_at`),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }) 
    ]);
    
    let validProfiles = allProfiles || [];
    if (profilesError) {
      console.warn("Profiles error (missing cols):", profilesError);
    }

    if (authUsersError) throw authUsersError;

    const totalUsers = validProfiles.length > 0 ? validProfiles.length : (authUsersData.users?.length || 0);

    const activeSubscriptions = validProfiles.filter((p: any) => 
        p.subscription_tier === 'plus' &&
        p.subscription_expires_at &&
        new Date(p.subscription_expires_at) > new Date()
    ).length;
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailySignups = authUsersData.users.filter((user: { created_at: string }) => 
        new Date(user.created_at) > twentyFourHoursAgo
    ).length;

    const { data: totalRevenueData, error: revenueError } = await supabaseAdmin
        .from('payments')
        .select('amount, status, created_at')
        .eq('status', 'approved');
        
    let validRevenueData = totalRevenueData || [];
    if (revenueError) {
      console.warn("Payments error (missing table):", revenueError);
    }
    const totalRevenue = validRevenueData.reduce((sum: number, item: any) => sum + item.amount, 0);

    // --- TIME SERIES GENERATION (7 Days) ---
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
            dateStr: format(date, 'yyyy-MM-dd'),
            label: format(date, 'dd/MM'),
            signups: 0,
            revenue: 0
        };
    });

    // Populate signups
    authUsersData.users.forEach((user: { created_at: string }) => {
        const userDate = user.created_at ? format(parseISO(user.created_at), 'yyyy-MM-dd') : null;
        const dayMatch = last7Days.find(d => d.dateStr === userDate);
        if (dayMatch) {
            dayMatch.signups += 1;
        }
    });

    // Populate revenues
    validRevenueData.forEach((pay: { amount: number, created_at: string }) => {
        const payDate = pay.created_at ? format(parseISO(pay.created_at), 'yyyy-MM-dd') : null;
        const dayMatch = last7Days.find(d => d.dateStr === payDate);
        if (dayMatch) {
            dayMatch.revenue += pay.amount;
        }
    });

    res.status(200).json({
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        dailySignups,
        timeSeries: last7Days
    });

  } catch (error: any) {
    console.error(`Error in /api/admin/stats: ${error.message}`);
    if (error.message === 'Not authenticated' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
       return res.status(401).json({ error: 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Erro no servidor' });
  }
}

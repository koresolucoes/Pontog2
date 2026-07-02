// api/admin/stats.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const verifyAdmin = (req: VercelRequest) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    jwt.verify(token, process.env.JWT_SECRET!);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    verifyAdmin(req);
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any;

    // FIX: Fetch profiles and auth users separately to avoid the schema cache issue with joins
    const [{ data: allProfiles, error: profilesError }, { data: authUsersData, error: authUsersError }] = await Promise.all([
      supabaseAdmin.from('profiles').select(`id, subscription_tier, subscription_expires_at`),
      // NOTE: This fetches up to 1000 users. For larger user bases, pagination would be required.
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }) 
    ]);
    
    if (profilesError) throw profilesError;
    if (authUsersError) throw authUsersError;

    const totalUsers = allProfiles.length;

    const activeSubscriptions = allProfiles.filter((p: any) => 
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
        .select('amount')
        .eq('status', 'approved');
        
    if (revenueError) throw revenueError;
    const totalRevenue = totalRevenueData.reduce((sum: number, item: any) => sum + item.amount, 0);
        
    res.status(200).json({
        totalUsers: totalUsers,
        activeSubscriptions: activeSubscriptions,
        totalRevenue: totalRevenue,
        dailySignups: dailySignups
    });

  } catch (error: any) {
    console.error(`Error in /api/admin/stats: ${error.message}`);
    if (error.message === 'Not authenticated' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
       return res.status(401).json({ error: 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Erro no servidor' });
  }
}
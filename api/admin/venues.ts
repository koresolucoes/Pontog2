// api/admin/venues.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';
import { add } from 'date-fns';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    switch (req.method) {
        case 'GET':
            // All admins can view venues
            enforceRoles(req, ['owner', 'moderator', 'support', 'financial']);
            const { data: get_data, error: get_error } = await supabaseAdmin
                .from('venues')
                .select('*')
                .order('created_at', { ascending: false });
            if (get_error) throw get_error;
            return res.status(200).json(get_data);

        case 'POST': {
            // Only Owner and Moderator can create venues
            const admin = enforceRoles(req, ['owner', 'moderator']);
            const { id: _id, created_at: _cat, submitted_by: _sub, ...newVenueData } = req.body;
            
            const postPayload = {
                ...newVenueData,
                lat: parseFloat(newVenueData.lat),
                lng: parseFloat(newVenueData.lng),
                tags: Array.isArray(newVenueData.tags) ? newVenueData.tags : [],
                is_verified: true,
                source_type: 'admin'
            };

            const { data: post_data, error: post_error } = await supabaseAdmin
                .from('venues')
                .insert([postPayload])
                .select();
            if (post_error) throw post_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'CREATE_VENUE', 
              post_data[0]?.id || 'unknown', 
              `Criou novo local (guia): "${postPayload.name}" em ${postPayload.address}`
            );
            return res.status(201).json(post_data[0]);
        }

        case 'PUT': {
            // Only Owner and Moderator can edit venues
            const admin = enforceRoles(req, ['owner', 'moderator']);
            const { id: put_id } = req.query;
            const { id: _pid, created_at: _pcat, submitted_by: _psub, ...updates } = req.body;

            // Check if we are approving/verifying a venue submitted by a user
            if (updates.is_verified === true) {
                const { data: currentVenue } = await supabaseAdmin
                    .from('venues')
                    .select('submitted_by, is_verified, name')
                    .eq('id', put_id as string)
                    .single();
                
                if (currentVenue && currentVenue.submitted_by && !currentVenue.is_verified) {
                    const userId = currentVenue.submitted_by;
                    console.log(`[GAMIFICATION] Venue approved! Processing reward for user ${userId}`);

                    try {
                        const { data: userProfile } = await supabaseAdmin
                            .from('profiles')
                            .select('subscription_tier, subscription_expires_at')
                            .eq('id', userId)
                            .single();

                        if (userProfile) {
                            const now = new Date();
                            let currentExpiresAt = userProfile.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : null;
                            let newExpiresAt: Date;

                            if (userProfile.subscription_tier === 'plus' && currentExpiresAt && currentExpiresAt > now) {
                                newExpiresAt = add(currentExpiresAt, { days: 3 });
                            } else {
                                newExpiresAt = add(now, { days: 3 });
                            }

                            await supabaseAdmin
                                .from('profiles')
                                .update({
                                    subscription_tier: 'plus',
                                    subscription_expires_at: newExpiresAt.toISOString()
                                })
                                .eq('id', userId);

                            await supabaseAdmin.from('payments').insert({
                                mercadopago_id: `reward_venue_${put_id}_${Date.now()}`,
                                user_id: userId,
                                plan_id: 'reward_venue_3days',
                                amount: 0.00,
                                status: 'approved',
                                created_at: new Date().toISOString()
                            });
                            
                            await recordAuditLog(
                              req, 
                              admin, 
                              'APPROVE_VENUE_REWARD', 
                              put_id as string, 
                              `Aprovou local "${currentVenue.name}" sugerido pelo usuário ID ${userId} e concedeu 3 dias de Plus grátis.`
                            );
                        }
                    } catch (rewardError) {
                        console.error("[GAMIFICATION] Error granting reward:", rewardError);
                    }
                }
            }

            const putPayload = {
                ...updates,
                lat: updates.lat ? parseFloat(updates.lat) : undefined,
                lng: updates.lng ? parseFloat(updates.lng) : undefined,
                tags: updates.tags ? (Array.isArray(updates.tags) ? updates.tags : []) : undefined
            };

            const { data: put_data, error: put_error } = await supabaseAdmin
                .from('venues')
                .update(putPayload)
                .eq('id', put_id as string)
                .select();
            if (put_error) throw put_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'UPDATE_VENUE', 
              put_id as string, 
              `Atualizou informações do local ID: ${put_id} ("${put_data[0]?.name || 'unknown'}")`
            );
            return res.status(200).json(put_data[0]);
        }
        
        case 'DELETE': {
            // Only Owner and Moderator can delete venues
            const admin = enforceRoles(req, ['owner', 'moderator']);
            const { id: del_id } = req.query;

            const { data: venue } = await supabaseAdmin
              .from('venues')
              .select('name')
              .eq('id', del_id as string)
              .single();

            const { error: del_error } = await supabaseAdmin
                .from('venues')
                .delete()
                .eq('id', del_id as string);
            if (del_error) throw del_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'DELETE_VENUE', 
              del_id as string, 
              `Excluiu o local: "${venue?.name || del_id}"`
            );
            return res.status(200).json({ success: true });
        }
        
        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            return res.status(405).end('Method Not Allowed');
    }

  } catch (error: any) {
    console.error(`Error in /api/admin/venues: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ 
        error: error.message || 'Server error',
        details: error.details || error.hint || JSON.stringify(error) 
    });
  }
}

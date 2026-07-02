
// api/admin/venues.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { add } from 'date-fns';

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
    );
    
    switch (req.method) {
        case 'GET':
            const { data: get_data, error: get_error } = await supabaseAdmin
                .from('venues')
                .select('*')
                .order('created_at', { ascending: false });
            if (get_error) throw get_error;
            return res.status(200).json(get_data);

        case 'POST':
            // Criação manual pelo admin
            const { id: _id, created_at: _cat, submitted_by: _sub, ...newVenueData } = req.body;
            
            // Ensure types are correct to prevent 500 DB errors
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
            return res.status(201).json(post_data[0]);

        case 'PUT':
            const { id: put_id } = req.query;
            const { id: _pid, created_at: _pcat, submitted_by: _psub, ...updates } = req.body;

            // Check if we are approving a venue
            if (updates.is_verified === true) {
                const { data: currentVenue } = await supabaseAdmin
                    .from('venues')
                    .select('submitted_by, is_verified, name')
                    .eq('id', put_id as string)
                    .single();
                
                // Só concede prêmio se tinha um autor e ainda não estava verificado
                if (currentVenue && currentVenue.submitted_by && !currentVenue.is_verified) {
                    const userId = currentVenue.submitted_by;
                    console.log(`[GAMIFICATION] Venue approved! Processing reward for user ${userId}`);

                    try {
                        // 1. Buscar perfil atual para lógica de acumulação
                        const { data: userProfile } = await supabaseAdmin
                            .from('profiles')
                            .select('subscription_tier, subscription_expires_at')
                            .eq('id', userId)
                            .single();

                        if (userProfile) {
                            const now = new Date();
                            let currentExpiresAt = userProfile.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : null;
                            let newExpiresAt: Date;

                            // Lógica Acumulativa:
                            // Se já é Plus E a data de expiração é futura, adiciona 3 dias ao final da vigência.
                            // Caso contrário (Free ou Plus vencido), adiciona 3 dias a partir de agora.
                            if (userProfile.subscription_tier === 'plus' && currentExpiresAt && currentExpiresAt > now) {
                                newExpiresAt = add(currentExpiresAt, { days: 3 });
                            } else {
                                newExpiresAt = add(now, { days: 3 });
                            }

                            // 2. Atualizar perfil do usuário
                            await supabaseAdmin
                                .from('profiles')
                                .update({
                                    subscription_tier: 'plus',
                                    subscription_expires_at: newExpiresAt.toISOString()
                                })
                                .eq('id', userId);

                            // 3. Criar registro histórico de "pagamento" (recompensa)
                            await supabaseAdmin.from('payments').insert({
                                mercadopago_id: `reward_venue_${put_id}_${Date.now()}`,
                                user_id: userId,
                                plan_id: 'reward_venue_3days',
                                amount: 0.00,
                                status: 'approved',
                                created_at: new Date().toISOString()
                            });
                            
                            console.log(`[GAMIFICATION] Reward granted. New expiry: ${newExpiresAt.toISOString()}`);
                        }
                    } catch (rewardError) {
                        console.error("[GAMIFICATION] Error granting reward:", rewardError);
                        // Não interrompe o fluxo principal de salvar o local, apenas loga o erro
                    }
                }
            }

            // Ensure types are correct
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
            return res.status(200).json(put_data[0]);
        
        case 'DELETE':
            const { id: del_id } = req.query;
            const { error: del_error } = await supabaseAdmin
                .from('venues')
                .delete()
                .eq('id', del_id as string);
            if (del_error) throw del_error;
            return res.status(200).json({ success: true });
        
        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            return res.status(405).end('Method Not Allowed');
    }

  } catch (error: any) {
    console.error(`Error in /api/admin/venues: ${error.message}`);
    res.status(error.message === 'Not authenticated' ? 401 : 500).json({ 
        error: error.message || 'Server error',
        details: error.details || error.hint || JSON.stringify(error) 
    });
  }
}

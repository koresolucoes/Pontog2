// stores/adStore.ts
import { create } from 'zustand';
import { Ad, TemporaryPerk } from '../types';
import { add } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// Mock data as fallback
const MOCK_ADS: Ad[] = [
    {
        id: 1,
        ad_type: 'feed',
        title: 'Nova Balada Under',
        description: 'Música, gente e drinks. A noite perfeita te espera. Siga-nos!',
        image_url: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
        cta_text: 'Saiba Mais',
        cta_url: 'https://example.com',
    },
    {
        id: 2,
        ad_type: 'inbox',
        title: 'PrEP e Saúde em Dia',
        description: 'Cuide-se! Informações e suporte sobre saúde sexual. Discreto e seguro.',
        image_url: 'https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&cs=tinysrgb&w=600',
        cta_text: 'Ver Agora',
        cta_url: 'https://example.com',
    }
];

interface AdState {
  feedAds: Ad[];
  bannerAds: Ad[];
  inboxAd: Ad | null;
  temporaryPerks: TemporaryPerk[];
  activePinoDouradoVenueIds: string[];
  fetchAds: () => Promise<void>;
  grantTemporaryPerk: (perk: TemporaryPerk['perk'], durationHours: number) => void;
  hasPerk: (perk: TemporaryPerk['perk']) => boolean;
  trackView: (campaignId: string | number) => Promise<void>;
  trackClick: (campaignId: string | number) => Promise<void>;
}

export const useAdStore = create<AdState>((set, get) => ({
    feedAds: [],
    bannerAds: [],
    inboxAd: null,
    temporaryPerks: [],
    activePinoDouradoVenueIds: [],
    fetchAds: async () => {
        try {
            const { data, error } = await supabase
                .from('b2b_campaigns')
                .select('*')
                .eq('status', 'approved');

            let feedAds: Ad[] = [];
            let bannerAds: Ad[] = [];
            let inboxAd: Ad | null = null;
            let pinoVenueIds: string[] = [];

            if (!error && data) {
                const dynamicFeedAds: Ad[] = [];
                const dynamicInboxAds: Ad[] = [];

                data.forEach((camp: any) => {
                    const isExpired = camp.duration_hours && camp.created_at ? new Date(camp.created_at).getTime() + (camp.duration_hours * 60 * 60 * 1000) < Date.now() : false;
                    
                    if (isExpired) return;

                    const defaultImage = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600';
                    const imageUrl = camp.image_url ? camp.image_url : defaultImage;

                    if (camp.placement === 'map' || camp.title === 'Destaque: Pino Dourado') {
                        pinoVenueIds.push(camp.venue_id);
                    } 
                    if (camp.placement === 'feed' || camp.placement === 'push' || camp.title === 'Destaque: Banner no Feed') {
                        dynamicFeedAds.push({
                            id: camp.id,
                            ad_type: 'feed',
                            title: camp.title || '🌟 Patrocinado',
                            description: camp.message,
                            image_url: imageUrl,
                            cta_text: 'Saiba Mais',
                            cta_url: camp.venue_id ? `/venue/${camp.venue_id}` : '#',
                            venue_id: camp.venue_id
                        });
                    }
                    if (camp.placement === 'messages' || camp.placement === 'push' || camp.range_meters === 0) {
                        dynamicInboxAds.push({
                            id: camp.id,
                            ad_type: 'inbox',
                            title: camp.title || 'Destaque Local',
                            description: camp.message,
                            image_url: imageUrl,
                            cta_text: 'Ver Agora',
                            cta_url: camp.venue_id ? `/venue/${camp.venue_id}` : '#',
                            venue_id: camp.venue_id
                        });
                    }
                });

                if (dynamicFeedAds.length > 0) {
                    feedAds = dynamicFeedAds;
                    // Se a pessoa comprou banner, usamos o primeiro como banner no topo
                    const banners = dynamicFeedAds.filter(ad => ad.title === 'Destaque: Banner no Feed' || ad.title.toLowerCase().includes('banner'));
                    if (banners.length > 0) {
                        bannerAds = banners;
                    } else {
                        // Se não tem banner específico, usa o feedAd mais recente no banner
                        bannerAds = [dynamicFeedAds[0]];
                    }
                } else {
                    feedAds = MOCK_ADS.filter(ad => ad.ad_type === 'feed');
                    bannerAds = MOCK_ADS.filter(ad => ad.ad_type === 'banner');
                }
                
                if (dynamicInboxAds.length > 0) {
                    inboxAd = dynamicInboxAds[0];
                } else {
                    inboxAd = MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
                }
            } else {
                feedAds = MOCK_ADS.filter(ad => ad.ad_type === 'feed');
                bannerAds = MOCK_ADS.filter(ad => ad.ad_type === 'banner');
                inboxAd = MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
            }

            set({ feedAds, bannerAds, inboxAd, activePinoDouradoVenueIds: pinoVenueIds });
        } catch (err) {
            console.error("Error fetching ads:", err);
            // fallback to mock
            const feedAds = MOCK_ADS.filter(ad => ad.ad_type === 'feed');
            const bannerAds = MOCK_ADS.filter(ad => ad.ad_type === 'banner');
            const inboxAd = MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
            set({ feedAds, bannerAds, inboxAd, activePinoDouradoVenueIds: [] });
        }
    },

    grantTemporaryPerk: (perk, durationHours) => {
        const expires_at = add(new Date(), { hours: durationHours }).toISOString();
        const newPerk: TemporaryPerk = { perk, expires_at };
        
        set(state => {
            const otherPerks = state.temporaryPerks.filter(p => p.perk !== perk);
            return { temporaryPerks: [...otherPerks, newPerk] };
        });
        
        toast.success(`Benefício desbloqueado por ${durationHours} hora(s)!`);
    },

    hasPerk: (perk) => {
        const existingPerk = get().temporaryPerks.find(p => p.perk === perk);
        if (existingPerk) {
            if (new Date(existingPerk.expires_at) > new Date()) {
                return true;
            } else {
                set(state => ({
                    temporaryPerks: state.temporaryPerks.filter(p => p.perk !== perk)
                }));
                return false;
            }
        }
        return false;
    },

    trackView: async (campaignId: string | number) => {
        try {
            // Verify campaignId is valid number/string to avoid errors
            if (!campaignId || typeof campaignId === 'string' && campaignId.startsWith('mock_') || typeof campaignId === 'number' && campaignId < 10) return;
            
            // Try to increment views_count directly on supabase
            const { data: current } = await supabase
                .from('b2b_campaigns')
                .select('views_count')
                .eq('id', campaignId)
                .single();

            if (current) {
                const nextViews = (current.views_count || 0) + 1;
                await supabase
                    .from('b2b_campaigns')
                    .update({ views_count: nextViews })
                    .eq('id', campaignId);
            }
        } catch (err) {
            console.error("Error tracking ad view:", err);
        }
    },

    trackClick: async (campaignId: string | number) => {
        try {
            if (!campaignId || typeof campaignId === 'string' && campaignId.startsWith('mock_') || typeof campaignId === 'number' && campaignId < 10) return;
            
            const { data: current } = await supabase
                .from('b2b_campaigns')
                .select('clicks_count')
                .eq('id', campaignId)
                .single();

            if (current) {
                const nextClicks = (current.clicks_count || 0) + 1;
                await supabase
                    .from('b2b_campaigns')
                    .update({ clicks_count: nextClicks })
                    .eq('id', campaignId);
            }
        } catch (err) {
            console.error("Error tracking ad click:", err);
        }
    }
}));
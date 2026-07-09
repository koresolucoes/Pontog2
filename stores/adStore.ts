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

            let feedAds: Ad[] = MOCK_ADS.filter(ad => ad.ad_type === 'feed');
            let bannerAds: Ad[] = MOCK_ADS.filter(ad => ad.ad_type === 'banner');
            let inboxAd: Ad | null = MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
            let pinoVenueIds: string[] = [];

            if (!error && data) {
                const dynamicFeedAds: Ad[] = [];
                const dynamicInboxAds: Ad[] = [];

                data.forEach((camp: any) => {
                    if (camp.title === 'Destaque: Pino Dourado') {
                        pinoVenueIds.push(camp.venue_id);
                    } else if (camp.title === 'Destaque: Banner no Feed' || camp.range_meters === 0) {
                        // Include feed banner
                        dynamicFeedAds.push({
                            id: camp.id,
                            ad_type: 'feed',
                            title: '🌟 Patrocinado',
                            description: camp.message,
                            image_url: camp.image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
                            cta_text: 'Saiba Mais',
                            cta_url: '#',
                        });
                        dynamicInboxAds.push({
                            id: camp.id,
                            ad_type: 'inbox',
                            title: 'Destaque Local',
                            description: camp.message,
                            image_url: camp.image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
                            cta_text: 'Ver Agora',
                            cta_url: '#',
                        });
                    }
                });

                if (dynamicFeedAds.length > 0) {
                    feedAds = [...dynamicFeedAds, ...feedAds];
                }
                if (dynamicInboxAds.length > 0) {
                    inboxAd = dynamicInboxAds[0];
                }
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
    }
}));
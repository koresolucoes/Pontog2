// stores/adStore.ts
import { create } from 'zustand';
import { Ad, TemporaryPerk } from '../types';
import { add } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const PREP_GOV_URL = 'https://www.gov.br/aids/pt-br/assuntos/prep-profilaxia-pre-exposicao';

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
        cta_url: PREP_GOV_URL,
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

const isPersistedCampaignId = (campaignId: string | number): campaignId is string =>
    typeof campaignId === 'string' && !!campaignId && !campaignId.startsWith('mock_');

const incrementCampaignMetric = async (campaignId: string | number, metric: 'view' | 'click') => {
    if (!isPersistedCampaignId(campaignId)) return;

    const { error } = await supabase.rpc('increment_b2b_campaign_metric', {
        p_campaign_id: campaignId,
        p_metric: metric,
    });

    if (error) throw error;
};

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
            const pinoVenueIds: string[] = [];

            if (!error && data) {
                const dynamicFeedAds: Ad[] = [];
                const dynamicBannerAds: Ad[] = [];
                const dynamicInboxAds: Ad[] = [];

                data.forEach((camp: any) => {
                    const isExpired = camp.duration_hours && camp.created_at
                        ? new Date(camp.created_at).getTime() + (camp.duration_hours * 60 * 60 * 1000) < Date.now()
                        : false;

                    if (isExpired) return;
                    if (camp.title === 'Destaque: Pino Dourado' || camp.title === 'Destaque: Banner no Feed') return;

                    const defaultImage = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600';
                    const imageUrl = camp.image_url || defaultImage;
                    const customCtaText = camp.cta_text || (camp.placement === 'messages' ? 'Ver Agora' : 'Saiba Mais');
                    let customCtaUrl = camp.cta_url || (camp.venue_id ? `/venue/${camp.venue_id}` : '#');

                    const isPrepRelated = (camp.title && camp.title.toLowerCase().includes('prep'))
                        || (camp.message && camp.message.toLowerCase().includes('prep'));
                    if (isPrepRelated && (!camp.cta_url || camp.cta_url === '#' || camp.cta_url.includes('example.com'))) {
                        customCtaUrl = PREP_GOV_URL;
                    }

                    const mappedAd: Ad = {
                        id: camp.id,
                        ad_type: camp.placement === 'messages' ? 'inbox' : camp.placement === 'banner' ? 'banner' : 'feed',
                        title: camp.title || '🌟 Patrocinado',
                        description: camp.message || '',
                        image_url: imageUrl,
                        cta_text: customCtaText,
                        cta_url: customCtaUrl,
                        venue_id: camp.venue_id
                    };

                    if (camp.placement === 'map' || camp.title === 'Destaque: Pino Dourado') {
                        pinoVenueIds.push(camp.venue_id);
                    }
                    if (camp.placement === 'feed' || camp.placement === 'push' || camp.title === 'Destaque: Banner no Feed' || !camp.placement) {
                        dynamicFeedAds.push(mappedAd);
                    }
                    if (camp.placement === 'banner' || camp.title === 'Destaque: Banner no Feed') {
                        dynamicBannerAds.push(mappedAd);
                    }
                    if (camp.placement === 'messages' || camp.placement === 'push') {
                        dynamicInboxAds.push(mappedAd);
                    }
                });

                feedAds = dynamicFeedAds.length > 0 ? dynamicFeedAds : MOCK_ADS.filter(ad => ad.ad_type === 'feed');
                bannerAds = dynamicBannerAds.length > 0
                    ? dynamicBannerAds
                    : dynamicFeedAds.length > 0
                        ? [dynamicFeedAds[0]]
                        : MOCK_ADS.filter(ad => ad.ad_type === 'banner');
                inboxAd = dynamicInboxAds.length > 0
                    ? dynamicInboxAds[0]
                    : MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
            } else {
                feedAds = MOCK_ADS.filter(ad => ad.ad_type === 'feed');
                bannerAds = MOCK_ADS.filter(ad => ad.ad_type === 'banner');
                inboxAd = MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
            }

            set({ feedAds, bannerAds, inboxAd, activePinoDouradoVenueIds: pinoVenueIds });
        } catch (err) {
            console.error('Error fetching ads:', err);
            set({
                feedAds: MOCK_ADS.filter(ad => ad.ad_type === 'feed'),
                bannerAds: MOCK_ADS.filter(ad => ad.ad_type === 'banner'),
                inboxAd: MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null,
                activePinoDouradoVenueIds: []
            });
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
            if (new Date(existingPerk.expires_at) > new Date()) return true;

            set(state => ({
                temporaryPerks: state.temporaryPerks.filter(p => p.perk !== perk)
            }));
        }
        return false;
    },

    trackView: async (campaignId: string | number) => {
        try {
            await incrementCampaignMetric(campaignId, 'view');
        } catch (err) {
            console.error('Error tracking ad view:', err);
        }
    },

    trackClick: async (campaignId: string | number) => {
        try {
            await incrementCampaignMetric(campaignId, 'click');
        } catch (err) {
            console.error('Error tracking ad click:', err);
        }
    }
}));

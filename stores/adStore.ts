// stores/adStore.ts
import { create } from 'zustand';
import { Ad, TemporaryPerk } from '../types';
import { add } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

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
    typeof campaignId === 'string' && !!campaignId;

const incrementCampaignMetric = async (campaignId: string | number, metric: 'view' | 'click') => {
    if (!isPersistedCampaignId(campaignId)) return;

    const { error } = await supabase.rpc('increment_b2b_campaign_metric', {
        p_campaign_id: campaignId,
        p_metric: metric,
    });

    if (error) throw error;
};

const isCampaignLive = (campaign: any, now: number) => {
    const startsAt = campaign.starts_at ? new Date(campaign.starts_at).getTime() : new Date(campaign.created_at).getTime();
    const endsAt = campaign.ends_at
        ? new Date(campaign.ends_at).getTime()
        : campaign.duration_hours && campaign.created_at
            ? new Date(campaign.created_at).getTime() + (campaign.duration_hours * 60 * 60 * 1000)
            : Number.POSITIVE_INFINITY;
    return Number.isFinite(startsAt) && startsAt <= now && endsAt > now;
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
                .select('id,venue_id,title,message,image_url,cta_text,cta_url,status,placement,duration_hours,created_at,starts_at,ends_at,campaign_origin')
                .eq('status', 'approved');

            if (error) throw error;

            const feedAds: Ad[] = [];
            const bannerAds: Ad[] = [];
            const inboxAds: Ad[] = [];
            const pinoVenueIds: string[] = [];
            const now = Date.now();

            (data || []).forEach((camp: any) => {
                if (!isCampaignLive(camp, now)) return;

                const mappedAd: Ad = {
                    id: camp.id,
                    ad_type: camp.placement === 'messages' ? 'inbox' : camp.placement === 'banner' ? 'banner' : 'feed',
                    title: camp.title,
                    description: camp.message || '',
                    image_url: camp.image_url || '',
                    cta_text: camp.cta_text || 'Saiba Mais',
                    cta_url: camp.cta_url || (camp.venue_id ? `/venue/${camp.venue_id}` : ''),
                    venue_id: camp.venue_id || undefined,
                };

                switch (camp.placement) {
                    case 'map':
                        if (camp.venue_id) pinoVenueIds.push(String(camp.venue_id));
                        break;
                    case 'messages':
                        inboxAds.push(mappedAd);
                        break;
                    case 'banner':
                        bannerAds.push(mappedAd);
                        break;
                    case 'push':
                    case 'feed':
                    default:
                        feedAds.push(mappedAd);
                        break;
                }
            });

            set({
                feedAds,
                bannerAds,
                inboxAd: inboxAds[0] || null,
                activePinoDouradoVenueIds: pinoVenueIds,
            });
        } catch (err) {
            console.error('Error fetching ads:', err);
            set({ feedAds: [], bannerAds: [], inboxAd: null, activePinoDouradoVenueIds: [] });
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

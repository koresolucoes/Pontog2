// stores/adStore.ts
import { create } from 'zustand';
import { Ad, TemporaryPerk } from '../types';
import { add } from 'date-fns';
import toast from 'react-hot-toast';

// Mock data, as we cannot create a new DB table
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
    },
    {
        id: 3,
        ad_type: 'feed',
        title: 'Bear Pride Week',
        description: 'O maior encontro de ursos da cidade. Não perca!',
        image_url: 'https://images.pexels.com/photos/1485637/pexels-photo-1485637.jpeg?auto=compress&cs=tinysrgb&w=600',
        cta_text: 'Ingressos',
        cta_url: 'https://example.com',
    },
    {
        id: 4,
        ad_type: 'banner',
        title: 'Festival de Cinema Queer',
        description: 'Os melhores filmes LGBTQIA+ do ano, em cartaz esta semana.',
        image_url: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        cta_text: 'Ver Programação',
        cta_url: 'https://example.com',
    },
    {
        id: 5,
        ad_type: 'feed',
        title: 'Barbearia Le Mustache',
        description: 'Estilo e cuidado para o homem moderno. Agende seu horário.',
        image_url: 'https://images.pexels.com/photos/3998414/pexels-photo-3998414.jpeg?auto=compress&cs=tinysrgb&w=600',
        cta_text: 'Agendar',
        cta_url: 'https://example.com',
    }
];

interface AdState {
  feedAds: Ad[];
  bannerAds: Ad[];
  inboxAd: Ad | null;
  temporaryPerks: TemporaryPerk[];
  fetchAds: () => void;
  grantTemporaryPerk: (perk: TemporaryPerk['perk'], durationHours: number) => void;
  hasPerk: (perk: TemporaryPerk['perk']) => boolean;
}

export const useAdStore = create<AdState>((set, get) => ({
    feedAds: [],
    bannerAds: [],
    inboxAd: null,
    temporaryPerks: [],
    fetchAds: () => {
        // In a real app, this would be a network request.
        // Here we just pull from the mock data.
        const feedAds = MOCK_ADS.filter(ad => ad.ad_type === 'feed');
        const bannerAds = MOCK_ADS.filter(ad => ad.ad_type === 'banner');
        const inboxAd = MOCK_ADS.find(ad => ad.ad_type === 'inbox') || null;
        set({ feedAds, bannerAds, inboxAd });
    },

    grantTemporaryPerk: (perk, durationHours) => {
        const expires_at = add(new Date(), { hours: durationHours }).toISOString();
        const newPerk: TemporaryPerk = { perk, expires_at };
        
        set(state => {
            // Remove any existing perk of the same type and add the new one
            const otherPerks = state.temporaryPerks.filter(p => p.perk !== perk);
            return { temporaryPerks: [...otherPerks, newPerk] };
        });
        
        toast.success(`Benefício desbloqueado por ${durationHours} hora(s)!`);
    },

    hasPerk: (perk) => {
        const existingPerk = get().temporaryPerks.find(p => p.perk === perk);
        if (existingPerk) {
            // Check if it's expired
            if (new Date(existingPerk.expires_at) > new Date()) {
                return true;
            } else {
                // Clean up expired perk
                set(state => ({
                    temporaryPerks: state.temporaryPerks.filter(p => p.perk !== perk)
                }));
                return false;
            }
        }
        return false;
    }
}));
import React from 'react';
import { Ad } from '../types';
import { ExternalLink, MapPin, Tag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../stores/uiStore';
import { useMapStore } from '../stores/mapStore';

interface AdDetailModalProps {
  ad: Ad;
  onClose: () => void;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({ ad, onClose }) => {
  const { t } = useTranslation();
  const setSelectedVenue = useMapStore(state => state.setSelectedVenue);
  const venues = useMapStore(state => state.venues);

  const handleOpenLink = () => {
    if (ad.cta_url && ad.cta_url !== '#') {
      window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewVenue = () => {
    if (ad.venue_id) {
        const venue = venues.find(v => v.id === ad.venue_id);
        if (venue) {
            setSelectedVenue(venue);
            onClose();
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in"
      >
        <div className="relative aspect-[4/3]">
          <img 
            src={ad.image_url} 
            alt={ad.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute top-4 left-4 bg-primary-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
            {t('feed.sponsored', { defaultValue: 'Patrocinado' })}
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">{ad.title}</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            {ad.description}
          </p>

          <div className="space-y-3">
            {ad.cta_url && ad.cta_url !== '#' && !ad.cta_url.startsWith('/venue') && (
              <button 
                onClick={handleOpenLink}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl transition-all"
              >
                <Tag size={18} />
                <span>Resgatar Cupom / Oferta</span>
              </button>
            )}

            {ad.venue_id && (
              <button 
                onClick={handleViewVenue}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all border border-white/10"
              >
                <MapPin size={18} />
                <span>Ver Perfil do Local</span>
              </button>
            )}

            {(ad.cta_url && ad.cta_url !== '#' && !ad.cta_url.startsWith('/venue')) && (
               <button 
                onClick={handleOpenLink}
                className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all border border-white/10"
              >
                <ExternalLink size={18} />
                <span>{ad.cta_text || 'Visitar Site'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

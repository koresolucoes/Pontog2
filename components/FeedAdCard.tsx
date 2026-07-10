import React, { useState, useEffect } from 'react';
import { Ad } from '../types';
import { useTranslation } from 'react-i18next';
import { AdDetailModal } from './AdDetailModal';
import { useAdStore } from '../stores/adStore';

interface FeedAdCardProps {
  ad: Ad;
}

export const FeedAdCard: React.FC<FeedAdCardProps> = ({ ad }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const trackView = useAdStore(state => state.trackView);

  useEffect(() => {
    if (ad && ad.id) {
      trackView(ad.id);
    }
  }, [ad?.id]);

  const handleClick = () => {
    setShowModal(true);
  };

  return (
    <>
        <div 
            className="relative aspect-square cursor-pointer group overflow-hidden bg-slate-900 border-2 border-slate-700"
            onClick={handleClick}
        >
          <img loading="lazy" src={ad.image_url} alt={ad.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="absolute top-2 left-2 bg-slate-900/70 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
            {t('feed.sponsored', { defaultValue: 'Patrocinado' })}
          </div>
          <div className="absolute bottom-2 left-2 right-2 text-white">
            <h3 className="font-bold text-sm truncate">{ad.title}</h3>
            <p className="text-xs text-slate-300 truncate">{ad.description}</p>
          </div>
        </div>

        {showModal && (
            <AdDetailModal ad={ad} onClose={() => setShowModal(false)} />
        )}
    </>
  );
};
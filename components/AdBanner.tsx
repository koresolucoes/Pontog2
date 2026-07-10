import React, { useEffect } from 'react';
import { Ad } from '../types';
import { useAdStore } from '../stores/adStore';

interface AdBannerProps {
  ad: Ad;
}

export const AdBanner: React.FC<AdBannerProps> = ({ ad }) => {
  const trackView = useAdStore(state => state.trackView);
  const trackClick = useAdStore(state => state.trackClick);

  useEffect(() => {
    if (ad && ad.id) {
      trackView(ad.id);
    }
  }, [ad?.id]);

  const handleClick = () => {
    if (ad && ad.id) {
      trackClick(ad.id);
    }
    window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="col-span-full relative aspect-[2/1] sm:aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] cursor-pointer group overflow-hidden bg-slate-900"
      onClick={handleClick}
    >
      <img 
        src={ad.image_url} 
        alt={ad.title} 
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent flex flex-col justify-center p-4 sm:p-8">
        <div className="w-full md:w-1/2">
            <span className="bg-slate-900/70 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 inline-block">
                Patrocinado
            </span>
            <h3 className="font-bold text-lg sm:text-2xl text-white drop-shadow-lg">{ad.title}</h3>
            <p className="text-sm text-slate-200 mt-1 drop-shadow-lg hidden sm:block">{ad.description}</p>
            <button className="mt-4 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 text-sm">
                {ad.cta_text}
            </button>
        </div>
      </div>
    </div>
  );
};
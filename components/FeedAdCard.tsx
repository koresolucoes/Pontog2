import React from 'react';
import { Ad } from '../types';
import { useTranslation } from 'react-i18next';

interface FeedAdCardProps {
  ad: Ad;
}

export const FeedAdCard: React.FC<FeedAdCardProps> = ({ ad }) => {
  const { t } = useTranslation();
  const handleClick = () => {
    window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  };

  return (
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
  );
};
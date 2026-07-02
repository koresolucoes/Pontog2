import React from 'react';
import { useTranslation } from 'react-i18next';

interface UnlockFeatureModalProps {
  title: string;
  description: string;
  onClose: () => void;
  onUpgrade: () => void;
  onWatchAd: () => void;
}

export const UnlockFeatureModal: React.FC<UnlockFeatureModalProps> = ({ title, description, onClose, onUpgrade, onWatchAd }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in-up border border-white/10 relative overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-600"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-600/20 rounded-full blur-3xl"></div>

        <div className="relative">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-5 border border-white/10">
                <span className="material-symbols-rounded filled text-3xl text-primary-500">lock</span>
            </div>
            
            <h3 className="text-xl font-black text-white font-outfit">{title}</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">{description}</p>
            
            <div className="mt-8 flex flex-col gap-3">
            <button
                onClick={onUpgrade}
                className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-primary-900/20 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
                <span className="material-symbols-rounded filled text-lg">auto_awesome</span>
                {t('unlock.subscribe', { defaultValue: 'Assinar Plus' })}
            </button>
            
            <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('unlock.or_free', { defaultValue: 'Ou grátis' })}</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
                onClick={onWatchAd}
                className="w-full bg-slate-700 text-slate-200 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-600 hover:text-white transition-colors flex items-center justify-center gap-2 border border-white/5"
            >
                <span className="material-symbols-rounded text-lg">play_circle</span>
                {t('unlock.watch_ad', { defaultValue: 'Ver Anúncio (1h grátis)' })}
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};
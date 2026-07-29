import React, { useState, useEffect } from 'react';
import { AdSenseUnit } from './AdSenseUnit';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface RewardAdModalProps {
  onClose: () => void;
  onReward: () => void;
}

export const RewardAdModal: React.FC<RewardAdModalProps> = ({ onClose, onReward }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(30);
  const isFinished = countdown === 0;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleReward = () => {
    onReward();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] animate-fade-in p-4">
      <div className="relative w-full max-w-md aspect-video bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white p-4 overflow-hidden border border-white/10 shadow-2xl">
        
        <div className="absolute inset-0 bg-slate-800">
          <AdSenseUnit
              client="ca-pub-9015745232467355"
              slot="4962199596" // Using banner slot as requested for interstitial
              format="auto"
              responsive={true}
              className="w-full h-full flex items-center justify-center"
          />
        </div>

        {/* Overlay with countdown */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10">
            <p className="text-slate-300 text-sm uppercase tracking-widest font-bold mb-2">{t('reward_ad.title', { defaultValue: 'Anúncio Premiado' })}</p>
            <div className="relative">
                <span className="material-symbols-rounded text-6xl text-primary-600 animate-pulse">timer</span>
            </div>
            <p className="text-5xl font-black my-4 tabular-nums font-outfit bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                {`00:${countdown.toString().padStart(2, '0')}`}
            </p>
            <p className="text-slate-400 text-xs">{t('reward_ad.subtitle', { defaultValue: 'Assista até o final para desbloquear.' })}</p>
        </div>


        <div className="absolute bottom-6 left-6 right-6 z-20">
          <button
            onClick={handleReward}
            disabled={!isFinished}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-green-900/30 disabled:opacity-0 disabled:translate-y-4 transform duration-500 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded filled">lock_open</span>
            {t('reward_ad.redeem', { defaultValue: 'Resgatar Recompensa' })}
          </button>
        </div>
        
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-200 bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/20 z-20 transition-all border border-white/10"
            disabled={!isFinished}
            style={{ opacity: isFinished ? 1 : 0, pointerEvents: isFinished ? 'auto' : 'none' }}
        >
          <span className="material-symbols-rounded text-xl block">close</span>
        </button>
      </div>
    </div>
  );
};
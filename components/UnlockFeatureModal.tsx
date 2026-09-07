import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

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
    <ModalShell
      onClose={onClose}
      size="sm"
      icon="auto_awesome"
      eyebrow="Ponto G Plus"
      title={title}
      description={description}
    >
      <div className="rounded-[22px] border border-primary-500/18 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-primary-300"><span className="material-symbols-rounded filled">shield_lock</span></span>
          <div><p className="text-sm font-black text-white">Você decide como desbloquear</p><p className="mt-1 text-xs leading-relaxed text-white/45">Assine para ter acesso contínuo ou use a opção gratuita quando disponível.</p></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Button variant="primary" size="lg" fullWidth icon="auto_awesome" onClick={onUpgrade}>{t('unlock.subscribe', { defaultValue: 'Conhecer o Plus' })}</Button>
        <Button variant="secondary" fullWidth icon="play_circle" onClick={onWatchAd}>{t('unlock.watch_ad', { defaultValue: 'Liberar por 1 hora' })}</Button>
      </div>
      <button onClick={onClose} className="mt-3 h-10 w-full text-xs font-bold text-white/30 transition hover:text-white/55">Agora não</button>
    </ModalShell>
  );
};

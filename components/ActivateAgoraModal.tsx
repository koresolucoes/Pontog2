import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAgoraStore } from '../stores/agoraStore';
import { ModalShell } from './ui/ModalShell';

interface ActivateAgoraModalProps {
  onClose: () => void;
}

export const ActivateAgoraModal: React.FC<ActivateAgoraModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { activateAgoraMode, isActivating } = useAgoraStore();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('agora.image_too_large', { defaultValue: 'A imagem não pode ter mais de 5MB.' }));
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      toast.error(t('agora.select_photo', { defaultValue: 'Escolha uma foto para aparecer no Agora.' }));
      return;
    }
    if (await activateAgoraMode(photoFile, statusText.trim())) onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      eyebrow="Disponível por 60 minutos"
      title="Entrar no Agora"
      description="Mostre que você está disponível neste momento. Sua publicação some automaticamente ao final do período."
      icon="local_fire_department"
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isActivating || !photoFile}
          className="pg-btn pg-btn-primary w-full"
        >
          {isActivating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              Publicando…
            </>
          ) : (
            <>
              <span className="material-symbols-rounded filled !text-[19px]">local_fire_department</span>
              Ficar disponível agora
            </>
          )}
        </button>
      }
    >
      <div className="space-y-5">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {photoPreview ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-white/[0.08] bg-black">
            <img src={photoPreview} alt="Prévia da publicação" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="pg-btn pg-btn-secondary !min-h-[42px] !rounded-full !px-4 !text-xs">
                <span className="material-symbols-rounded !text-[17px]">photo_camera</span>
                Trocar foto
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-white/[0.14] bg-white/[0.025] px-8 text-center transition-colors hover:bg-white/[0.045]"
          >
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--pg-primary-soft)] text-[var(--pg-primary)]">
              <span className="material-symbols-rounded text-[30px]">add_a_photo</span>
            </span>
            <span className="text-base font-extrabold text-white">Escolher foto</span>
            <span className="mt-2 max-w-[240px] text-xs leading-relaxed text-white/42">Use uma foto recente que represente como você quer aparecer agora.</span>
          </button>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="status_text" className="pg-eyebrow">O que você procura?</label>
            <span className="font-space text-[11px] font-bold tabular-nums text-white/32">{statusText.length}/60</span>
          </div>
          <textarea
            id="status_text"
            value={statusText}
            onChange={(event) => setStatusText(event.target.value)}
            rows={3}
            maxLength={60}
            placeholder="Ex.: um drink, companhia, conversar…"
            className="pg-field resize-none !rounded-[20px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="pg-surface p-3 text-center">
            <span className="material-symbols-rounded text-[19px] text-white/62">schedule</span>
            <p className="mt-1 text-[11px] font-bold text-white/58">60 min</p>
          </div>
          <div className="pg-surface p-3 text-center">
            <span className="material-symbols-rounded text-[19px] text-white/62">near_me</span>
            <p className="mt-1 text-[11px] font-bold text-white/58">Próximos</p>
          </div>
          <div className="pg-surface p-3 text-center">
            <span className="material-symbols-rounded text-[19px] text-white/62">delete_sweep</span>
            <p className="mt-1 text-[11px] font-bold text-white/58">Expira só</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

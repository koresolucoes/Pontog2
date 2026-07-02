import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAgoraStore } from '../stores/agoraStore';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(t('agora.image_too_large', { defaultValue: 'A imagem não pode ter mais de 5MB.' }));
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      toast.error(t('agora.select_photo', { defaultValue: 'Por favor, selecione uma foto.' }));
      return;
    }
    await activateAgoraMode(photoFile, statusText);
    onClose();
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] animate-fade-in p-0 sm:p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md mx-auto animate-slide-in-up flex flex-col max-h-[90vh] border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-red-900/20 to-transparent rounded-t-3xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-rounded filled text-2xl text-red-500 animate-pulse-fire">local_fire_department</span>
            {t('agora.activate_title', { defaultValue: 'Ativar Modo Agora' })}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          {photoPreview ? (
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden group shadow-lg border border-white/10">
              <img loading="lazy" src={photoPreview} alt={t('agora.preview', { defaultValue: 'Pré-visualização' })} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold py-2 px-4 rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-rounded">edit</span>
                    {t('agora.change_photo', { defaultValue: 'Trocar Foto' })}
                  </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-red-500 hover:text-red-500 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-red-500/10 flex items-center justify-center mb-3 transition-colors">
                  <span className="material-symbols-rounded text-4xl group-hover:scale-110 transition-transform">add_a_photo</span>
              </div>
              <span className="text-sm font-bold uppercase tracking-wide">{t('agora.choose_photo', { defaultValue: 'Escolher Foto' })}</span>
            </button>
          )}

          <div>
            <label htmlFor="status_text" className="block text-xs font-bold text-slate-400 uppercase ml-1 mb-2">
              {t('agora.what_are_you_looking_for', { defaultValue: 'O que você busca?' })}
            </label>
            <textarea
              id="status_text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              rows={2}
              maxLength={60}
              placeholder={t('agora.placeholder', { defaultValue: 'Ex: Alguém pra tomar uma agora...' })}
              className="w-full bg-slate-800/50 rounded-xl py-3 px-4 text-white text-lg font-medium placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 border border-white/5 resize-none"
            />
             <p className="text-right text-xs text-slate-500 mt-1 font-mono">{statusText.length}/60</p>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex-shrink-0 bg-slate-800/30 rounded-b-3xl">
          <button 
            onClick={handleSubmit} 
            disabled={isActivating || !photoFile} 
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-red-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            {isActivating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t('agora.activating', { defaultValue: 'Ativando...' })}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-rounded filled">local_fire_department</span>
                <span>{t('agora.publish_1h', { defaultValue: 'Publicar por 1 Hora' })}</span>
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-500 mt-3">
              {t('agora.disclaimer', { defaultValue: 'Sua foto ficará visível na aba Agora por 60 minutos.' })}
          </p>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
};
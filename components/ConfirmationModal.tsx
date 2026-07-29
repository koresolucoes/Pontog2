import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText
}) => {
  useHardwareBack(isOpen, onCancel);
  const { t } = useTranslation();
  if (!isOpen) return null;

  const confirmLabel = confirmText || t('common.ok', { defaultValue: 'OK' });
  const cancelLabel = cancelText || t('common.cancel', { defaultValue: 'Cancelar' });

  return (
    <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center z-[200] animate-fade-in p-4" onClick={onCancel}>
      <div 
        className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in-up border border-white/10 relative overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-secondary-600"></div>

        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-500/10 mb-5 border border-primary-500/20">
          <span className="material-symbols-rounded text-3xl text-primary-500 filled">warning</span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2 font-outfit">{title}</h3>
        
        <div className="mb-8">
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="w-full justify-center rounded-xl px-4 py-3 bg-slate-700 text-sm font-bold text-slate-200 hover:bg-slate-600 hover:text-white transition-colors border border-white/5"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="w-full justify-center rounded-xl px-4 py-3 bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-900/30 transition-all"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

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
  cancelText,
}) => {
  const { t } = useTranslation();
  const confirmLabel = confirmText || t('common.ok', { defaultValue: 'Confirmar' });
  const cancelLabel = cancelText || t('common.cancel', { defaultValue: 'Cancelar' });

  return (
    <ModalShell
      open={isOpen}
      onClose={onCancel}
      size="sm"
      tone="warning"
      icon="priority_high"
      eyebrow="Confirmação"
      title={title}
      description={message}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="light" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      }
    >
      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/45">
        Essa ação só será aplicada depois da sua confirmação.
      </div>
    </ModalShell>
  );
};

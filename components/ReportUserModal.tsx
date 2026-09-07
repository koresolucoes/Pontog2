import React, { useState } from 'react';
import { User } from '../types';
import { useUserActionsStore, reportReasons } from '../stores/userActionsStore';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

interface ReportUserModalProps {
  user: User;
  onClose: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({ user, onClose }) => {
  const { t } = useTranslation();
  const { reportUser } = useUserActionsStore();
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t('report.select_reason', { defaultValue: 'Escolha um motivo para continuar.' }));
      return;
    }
    setLoading(true);
    const success = await reportUser(user.id, reason, comments);
    setLoading(false);
    if (success) onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      tone="danger"
      icon="flag"
      eyebrow="Segurança"
      title={t('report.title', { defaultValue: 'Denunciar perfil' })}
      description={`A denúncia é confidencial. ${user.display_name || user.username} não verá quem enviou.`}
      footer={
        <div className="grid grid-cols-[.8fr_1.2fr] gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancelar' })}</Button>
          <Button variant="danger" onClick={handleSubmit} loading={loading} disabled={!reason}>{t('report.send', { defaultValue: 'Enviar denúncia' })}</Button>
        </div>
      }
    >
      <div>
        <p className="pg-eyebrow mb-3">O que aconteceu?</p>
        <div className="space-y-2">
          {reportReasons.map((item) => {
            const selected = reason === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setReason(item.key)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-[18px] border px-3.5 text-left transition active:scale-[0.99] ${selected ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/[0.07] bg-white/[0.03] text-white/65 hover:bg-white/[0.055]'}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-red-400' : 'border-white/20'}`}>
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-red-400" />}
                </span>
                <span className="text-sm font-bold">{t(`report.reasons.${item.key}`, { defaultValue: item.label })}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="report-comments" className="pg-eyebrow">Detalhes</label>
          <span className="text-[11px] font-semibold text-white/25">opcional · {comments.length}/2000</span>
        </div>
        <textarea
          id="report-comments"
          value={comments}
          onChange={(event) => setComments(event.target.value.slice(0, 2000))}
          rows={4}
          className="pg-field resize-none"
          placeholder={t('report.details_placeholder', { defaultValue: 'Conte brevemente o que aconteceu…' })}
        />
      </div>
    </ModalShell>
  );
};

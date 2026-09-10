import React, { useState } from 'react';
import { User } from '../types';
import { reportReasons, useUserActionsStore } from '../stores/userActionsStore';
import { socialActions } from '../modules/social/public';
import { attachReportChatEvidence, uploadReportEvidence, validateReportEvidence } from '../lib/reportEvidence';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { ChatEvidencePicker } from './ChatEvidencePicker';
import toast from 'react-hot-toast';

interface ReportUserModalProps {
  user: User;
  onClose: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({ user, onClose }) => {
  const { t } = useTranslation();
  const blockUser = useUserActionsStore((state) => state.blockUser);
  const hideProfile = useUserActionsStore((state) => state.hideProfile);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [chatMessageIds, setChatMessageIds] = useState<number[]>([]);
  const [chatPickerOpen, setChatPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState<'block' | 'hide' | null>(null);

  const displayName = user.display_name || user.username || 'esta pessoa';

  const chooseFiles = (list: FileList | null) => {
    const next = Array.from(list || []).slice(0, 3);
    const error = validateReportEvidence(next);
    if (error) { toast.error(error); return; }
    setFiles(next);
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t('report.select_reason', { defaultValue: 'Escolha um motivo para continuar.' }));
      return;
    }
    setLoading(true);
    try {
      const reportId = await socialActions.reportUser(user.id, reason, comments || null);
      const attachmentErrors: string[] = [];
      if (chatMessageIds.length) {
        try { await attachReportChatEvidence(reportId, chatMessageIds); }
        catch (e) { console.error('Error attaching chat evidence:', e); attachmentErrors.push('mensagens da conversa'); }
      }
      if (files.length) {
        try { await uploadReportEvidence(reportId, files); }
        catch (e) { console.error('Error uploading report evidence:', e); attachmentErrors.push('imagens externas'); }
      }
      if (attachmentErrors.length) toast.error(`A denúncia foi enviada, mas não foi possível anexar: ${attachmentErrors.join(' e ')}.`);
      else toast.success(chatMessageIds.length || files.length ? 'Denúncia e provas enviadas para análise.' : 'Denúncia enviada. Nossa equipe irá analisar.');
      setSubmitted(true);
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('already_reported')) toast.error('Você já denunciou este perfil.');
      else toast.error('Ocorreu um erro ao enviar a denúncia.');
      console.error('Error reporting user:', error);
    } finally { setLoading(false); }
  };

  const handleBlock = async () => {
    setSafetyBusy('block');
    try { await blockUser({ id: user.id, username: displayName }); onClose(); }
    finally { setSafetyBusy(null); }
  };

  const handleHide = async () => {
    setSafetyBusy('hide');
    try { await hideProfile({ id: user.id, username: displayName }); onClose(); }
    finally { setSafetyBusy(null); }
  };

  if (submitted) {
    return (
      <ModalShell
        onClose={onClose}
        size="md"
        icon="verified_user"
        eyebrow="Denúncia enviada"
        title="Quer fazer mais alguma coisa?"
        description={`A denúncia contra ${displayName} já está registrada. Essas ações são opcionais e afetam apenas a sua experiência.`}
        footer={<Button variant="secondary" fullWidth onClick={onClose}>Concluir</Button>}
      >
        <div className="space-y-3">
          <button type="button" disabled={!!safetyBusy} onClick={handleBlock} className="flex w-full items-center gap-3 rounded-[20px] border border-red-500/20 bg-red-500/[0.07] p-4 text-left transition hover:bg-red-500/[0.11] disabled:opacity-50">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-red-500/12 text-red-300"><span className="material-symbols-rounded">block</span></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-white">Bloquear pessoa</strong><span className="mt-1 block text-xs leading-relaxed text-white/42">Impede novas interações e remove a pessoa da sua experiência.</span></span>
            {safetyBusy === 'block' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <span className="material-symbols-rounded text-white/25">chevron_right</span>}
          </button>

          <button type="button" disabled={!!safetyBusy} onClick={handleHide} className="flex w-full items-center gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 text-left transition hover:bg-white/[0.06] disabled:opacity-50">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white/[0.055] text-white/55"><span className="material-symbols-rounded">visibility_off</span></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-white">Ocultar da grade</strong><span className="mt-1 block text-xs leading-relaxed text-white/42">Não bloqueia a pessoa, mas ela deixa de aparecer em Próximos e Populares para você.</span></span>
            {safetyBusy === 'hide' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <span className="material-symbols-rounded text-white/25">chevron_right</span>}
          </button>

          <p className="px-1 pt-1 text-[11px] leading-relaxed text-white/28">Você poderá desfazer um bloqueio ou perfil oculto depois nas configurações de privacidade.</p>
        </div>
      </ModalShell>
    );
  }

  return (
    <>
      <ModalShell
        onClose={onClose}
        size="md"
        tone="danger"
        icon="flag"
        eyebrow="Segurança"
        title={t('report.title', { defaultValue: 'Denunciar perfil' })}
        description={`A denúncia é confidencial. ${displayName} não verá quem enviou.`}
        footer={<div className="grid grid-cols-[.8fr_1.2fr] gap-2"><Button variant="secondary" onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancelar' })}</Button><Button variant="danger" onClick={handleSubmit} loading={loading} disabled={!reason}>{t('report.send', { defaultValue: 'Enviar denúncia' })}</Button></div>}
      >
        <div>
          <p className="pg-eyebrow mb-3">O que aconteceu?</p>
          <div className="space-y-2">{reportReasons.map((item) => {
            const selected = reason === item.key;
            return <button key={item.key} type="button" onClick={() => setReason(item.key)} className={`flex min-h-[52px] w-full items-center gap-3 rounded-[18px] border px-3.5 text-left transition active:scale-[0.99] ${selected ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/[0.07] bg-white/[0.03] text-white/65 hover:bg-white/[0.055]'}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-red-400' : 'border-white/20'}`}>{selected && <span className="h-2.5 w-2.5 rounded-full bg-red-400" />}</span>
              <span className="text-sm font-bold">{t(`report.reasons.${item.key}`, { defaultValue: item.label })}</span>
            </button>;
          })}</div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between"><label htmlFor="report-comments" className="pg-eyebrow">Detalhes</label><span className="text-[11px] font-semibold text-white/25">opcional · {comments.length}/2000</span></div>
          <textarea id="report-comments" value={comments} onChange={(event) => setComments(event.target.value.slice(0, 2000))} rows={4} className="pg-field resize-none" placeholder={t('report.details_placeholder', { defaultValue: 'Conte brevemente o que aconteceu…' })} />
        </div>

        <div className="mt-5 rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="pg-eyebrow">Provas da conversa</p>
          <p className="mt-1 text-xs leading-relaxed text-white/42">Selecione até 12 mensagens específicas da conversa com esta pessoa. Só esse trecho será enviado à equipe; o restante do chat continua privado.</p>
          <button type="button" onClick={() => setChatPickerOpen(true)} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.035] text-xs font-bold text-white/65 hover:bg-white/[0.055]"><span className="material-symbols-rounded !text-[18px]">forum</span>{chatMessageIds.length ? `${chatMessageIds.length} mensagens selecionadas` : 'Selecionar mensagens da conversa'}</button>
        </div>

        <div className="mt-3 rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="pg-eyebrow">Outras provas</p>
          <p className="mt-1 text-xs leading-relaxed text-white/42">Anexe até 3 imagens JPG, PNG ou WebP de até 5 MB. Os arquivos ficam privados e só são usados na análise.</p>
          <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-white/15 bg-black/15 text-xs font-bold text-white/60 hover:bg-white/[0.04]">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => chooseFiles(e.target.files)} />
            {files.length ? `${files.length} ${files.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}` : 'Selecionar imagens'}
          </label>
          {files.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-[12px] border border-white/10 bg-black/30"><img src={URL.createObjectURL(file)} alt="Prova selecionada" className="h-20 w-full object-cover" /><button type="button" onClick={() => setFiles(v => v.filter((_, i) => i !== index))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white">×</button></div>)}</div>}
        </div>
      </ModalShell>

      {chatPickerOpen && <ChatEvidencePicker reportedUserId={user.id} selectedIds={chatMessageIds} onChange={setChatMessageIds} onClose={() => setChatPickerOpen(false)} />}
    </>
  );
};

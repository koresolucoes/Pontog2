import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { socialActions, type ReportableContentType } from '../modules/social/public';
import { reportReasons } from '../stores/userActionsStore';
import { uploadReportEvidence, validateReportEvidence } from '../lib/reportEvidence';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

type Props = {
  targetType: ReportableContentType;
  targetId: string | number;
  targetLabel?: string;
  onClose: () => void;
};

export const ReportContentModal: React.FC<Props> = ({ targetType, targetId, targetLabel = 'este conteúdo', onClose }) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const chooseFiles = (list: FileList | null) => {
    const next = Array.from(list || []).slice(0, 3);
    const error = validateReportEvidence(next);
    if (error) { toast.error(error); return; }
    setFiles(next);
  };

  const submit = async () => {
    if (!reason || loading) return;
    setLoading(true);
    try {
      const reportId = await socialActions.reportContent(targetType, String(targetId), reason, comments || null);
      await uploadReportEvidence(reportId, files);
      toast.success(files.length ? 'Denúncia e provas enviadas para análise.' : 'Denúncia enviada para análise.');
      onClose();
    } catch (error: any) {
      const message = String(error?.message || '');
      if (error?.code === '23505' || message.includes('already_reported')) toast.error('Você já denunciou este conteúdo.');
      else if (message.includes('target_not_found_or_not_visible')) toast.error('Este conteúdo não está mais disponível.');
      else toast.error('Não foi possível enviar a denúncia. Tente novamente.');
    } finally { setLoading(false); }
  };

  return <ModalShell
    onClose={onClose}
    size="md"
    tone="danger"
    icon="flag"
    eyebrow="Segurança"
    title="Denunciar conteúdo"
    description={`Conte o que aconteceu com ${targetLabel}. O Ponto G também preserva um snapshot do conteúdo para análise.`}
    footer={<div className="grid grid-cols-[.8fr_1.2fr] gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" loading={loading} disabled={!reason} onClick={submit}>Enviar denúncia</Button></div>}
  >
    <div>
      <p className="pg-eyebrow mb-3">O que aconteceu?</p>
      <div className="space-y-2">{reportReasons.map(item => {
        const selected = reason === item.key;
        return <button key={item.key} type="button" onClick={() => setReason(item.key)} className={`flex min-h-[50px] w-full items-center gap-3 rounded-[18px] border px-3.5 text-left transition ${selected ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/[0.07] bg-white/[0.03] text-white/65 hover:bg-white/[0.055]'}`}>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-red-400' : 'border-white/20'}`}>{selected && <span className="h-2.5 w-2.5 rounded-full bg-red-400" />}</span>
          <span className="text-sm font-bold">{item.label}</span>
        </button>;
      })}</div>
    </div>

    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between"><label htmlFor="report-content-comments" className="pg-eyebrow">Detalhes</label><span className="text-[11px] font-semibold text-white/25">opcional · {comments.length}/2000</span></div>
      <textarea id="report-content-comments" value={comments} onChange={e => setComments(e.target.value.slice(0, 2000))} rows={4} className="pg-field resize-none" placeholder="Explique brevemente o que aconteceu…" />
    </div>

    <div className="mt-5 rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="pg-eyebrow">Provas opcionais</p><p className="mt-1 text-xs leading-relaxed text-white/42">Até 3 imagens JPG, PNG ou WebP, 5 MB cada. Elas ficam privadas e são usadas apenas na análise.</p></div><span className="material-symbols-rounded text-white/28">attach_file</span></div>
      <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-white/15 bg-black/15 text-xs font-bold text-white/60 hover:bg-white/[0.04]">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => chooseFiles(e.target.files)} />
        {files.length ? `${files.length} ${files.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}` : 'Selecionar imagens'}
      </label>
      {files.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-[12px] border border-white/10 bg-black/30"><img src={URL.createObjectURL(file)} alt="Prova selecionada" className="h-20 w-full object-cover" /><button type="button" onClick={() => setFiles(v => v.filter((_, i) => i !== index))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white">×</button></div>)}</div>}
    </div>
  </ModalShell>;
};

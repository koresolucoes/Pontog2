import React, { useEffect, useMemo, useState } from 'react';
import { getPublicImageUrl } from '../lib/supabase';
import { getReportChatCandidates, MAX_REPORT_CHAT_MESSAGES, type ReportChatCandidate } from '../lib/reportEvidence';
import { useAuthStore } from '../stores/authStore';

interface ChatEvidencePickerProps {
  reportedUserId: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onClose: () => void;
}

const parseKind = (message: ReportChatCandidate) => {
  if (message.image_url) return message.is_view_once ? 'Foto 1x' : 'Imagem';
  if (!message.content) return 'Mensagem';
  try {
    const parsed = JSON.parse(message.content);
    if (parsed?.type === 'audio') return message.is_view_once ? 'Áudio 1x' : 'Áudio';
    if (parsed?.type === 'album') return 'Álbum privado';
    if (parsed?.type === 'location') return 'Localização';
  } catch {}
  return 'Texto';
};

const previewText = (message: ReportChatCandidate) => {
  if (!message.content) return message.image_url ? 'Imagem enviada na conversa' : 'Mensagem sem texto';
  try {
    const parsed = JSON.parse(message.content);
    if (parsed?.type === 'audio') return 'Mensagem de áudio';
    if (parsed?.type === 'album') return parsed.albumName ? `Álbum: ${parsed.albumName}` : 'Álbum privado compartilhado';
    if (parsed?.type === 'location') return 'Localização compartilhada';
  } catch {}
  return message.content.length > 180 ? `${message.content.slice(0, 180)}…` : message.content;
};

export const ChatEvidencePicker: React.FC<ChatEvidencePickerProps> = ({ reportedUserId, selectedIds, onChange, onClose }) => {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [items, setItems] = useState<ReportChatCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getReportChatCandidates(reportedUserId)
      .then((rows) => { if (active) setItems(rows); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar a conversa.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reportedUserId]);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (id: number) => {
    if (selected.has(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    if (selectedIds.length >= MAX_REPORT_CHAT_MESSAGES) return;
    onChange([...selectedIds, id]);
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/72 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <section className="flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] border border-white/[0.08] bg-[#101015] shadow-2xl sm:rounded-[30px]" onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5">
          <div><p className="pg-eyebrow">Prova da conversa</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">Selecionar mensagens</h2><p className="mt-1 max-w-md text-xs leading-relaxed text-white/42">Escolha somente o trecho necessário para explicar a denúncia. A equipe verá apenas as mensagens selecionadas, não a conversa inteira.</p></div>
          <button type="button" onClick={onClose} className="pg-icon-btn shrink-0"><span className="material-symbols-rounded">close</span></button>
        </header>

        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs text-white/42"><span>{selectedIds.length} de {MAX_REPORT_CHAT_MESSAGES} selecionadas</span>{selectedIds.length > 0 && <button type="button" onClick={() => onChange([])} className="font-bold text-white/65">Limpar</button>}</div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex min-h-40 items-center justify-center text-sm text-white/40">Carregando conversa…</div> : error ? <div className="rounded-[20px] border border-red-500/15 bg-red-500/[0.06] p-4 text-sm text-red-200/75">{error}</div> : items.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><span className="material-symbols-rounded text-4xl text-white/18">forum</span><strong className="mt-3 text-sm text-white/62">Nenhuma conversa encontrada</strong><p className="mt-1 max-w-xs text-xs leading-relaxed text-white/32">Você ainda pode anexar imagens externas e escrever os detalhes da denúncia.</p></div> : <div className="space-y-2">
            {items.map((message) => {
              const checked = selected.has(message.id);
              const mine = message.sender_id === currentUserId;
              return <button key={message.id} type="button" onClick={() => toggle(message.id)} className={`flex w-full items-start gap-3 rounded-[18px] border p-3 text-left transition ${checked ? 'border-primary-500/35 bg-primary-500/[0.09]' : 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.045]'}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-primary-400 bg-primary-500 text-white' : 'border-white/18'}`}>{checked && <span className="material-symbols-rounded !text-[15px]">check</span>}</span>
                {message.image_url && !message.is_view_once && <img src={getPublicImageUrl(message.image_url)} alt="Mídia da conversa" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><strong className="text-xs text-white/75">{mine ? 'Você' : 'Outra pessoa'} · {parseKind(message)}</strong><span className="shrink-0 text-[10px] text-white/25">{new Date(message.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span></span><span className="mt-1 block break-words text-xs leading-relaxed text-white/42">{previewText(message)}</span>{message.is_view_once && <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-200/60"><span className="material-symbols-rounded !text-[13px]">visibility_off</span>Conteúdo 1x selecionado será preservado apenas para análise de segurança.</span>}</span>
              </button>;
            })}
          </div>}
        </div>

        <footer className="border-t border-white/[0.07] p-4"><button type="button" onClick={onClose} className="pg-btn pg-btn-primary w-full">Usar {selectedIds.length ? `${selectedIds.length} mensagens` : 'sem mensagens'}</button></footer>
      </section>
    </div>
  );
};

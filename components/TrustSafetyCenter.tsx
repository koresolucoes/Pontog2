import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { trustSafety, type AccountAppeal, type SupportMessage, type SupportTicket } from '../lib/trustSafety';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

type Props = { onClose: () => void; initialTab?: 'support' | 'appeal' };
const statusLabel: Record<string,string> = { new:'Novo', in_progress:'Em atendimento', waiting_user:'Aguardando você', resolved:'Resolvido', closed:'Fechado', pending:'Enviado', in_review:'Em análise', approved:'Aprovado', rejected:'Negado' };
const dt = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

export const TrustSafetyCenter: React.FC<Props> = ({ onClose, initialTab = 'support' }) => {
  const user = useAuthStore(s => s.user);
  const restricted = user?.status === 'suspended' || user?.status === 'banned';
  const [tab,setTab] = useState<'support'|'appeal'>(initialTab === 'appeal' && restricted ? 'appeal' : 'support');
  const [tickets,setTickets] = useState<SupportTicket[]>([]); const [appeals,setAppeals] = useState<AccountAppeal[]>([]);
  const [selected,setSelected] = useState<SupportTicket|null>(null); const [messages,setMessages] = useState<SupportMessage[]>([]);
  const [loading,setLoading] = useState(true); const [busy,setBusy] = useState(false);
  const [subject,setSubject] = useState(''); const [category,setCategory] = useState('other'); const [firstMessage,setFirstMessage] = useState(''); const [reply,setReply] = useState('');
  const [appealReason,setAppealReason] = useState('Revisão da decisão'); const [appealDetails,setAppealDetails] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [nextTickets,nextAppeals] = await Promise.all([trustSafety.getTickets(), restricted ? trustSafety.getAppeals() : Promise.resolve([])]);
      setTickets(nextTickets); setAppeals(nextAppeals);
      if (selected) {
        const current = nextTickets.find(t => t.id === selected.id) ?? null;
        setSelected(current);
        if (current) setMessages(await trustSafety.getMessages(current.id));
      }
    } catch (error) { console.error('Trust & Safety center load failed', error); }
    finally { setLoading(false); }
  }, [user?.id, restricted, selected?.id]);

  useEffect(() => { void load(); }, [user?.id]);
  useEffect(() => user ? trustSafety.subscribe(user.id, () => { void load(); }) : undefined, [user?.id, load]);

  const openTicket = async (ticket: SupportTicket) => { setSelected(ticket); setMessages([]); try { setMessages(await trustSafety.getMessages(ticket.id)); } catch { toast.error('Não foi possível carregar esta conversa.'); } };
  const createTicket = async () => {
    if (subject.trim().length < 3 || !firstMessage.trim()) { toast.error('Preencha o assunto e a mensagem.'); return; }
    setBusy(true);
    try { const created = await trustSafety.createTicket(subject.trim(),category,firstMessage.trim()); toast.success(`Atendimento #${created.ticket_number} aberto.`); setSubject('');setFirstMessage(''); await load(); const next=(await trustSafety.getTickets()).find(t=>t.id===created.ticket_id); if(next) await openTicket(next); }
    catch (e:any) { toast.error(String(e?.message||'').includes('too_many_open_tickets')?'Você já tem vários atendimentos em aberto.':'Não foi possível abrir o atendimento.'); }
    finally { setBusy(false); }
  };
  const sendReply = async () => {
    if (!selected || !reply.trim()) return; setBusy(true);
    try { await trustSafety.sendMessage(selected.id,reply.trim()); setReply(''); setMessages(await trustSafety.getMessages(selected.id)); }
    catch { toast.error('Não foi possível enviar a mensagem.'); } finally { setBusy(false); }
  };
  const submitAppeal = async () => {
    if (!restricted || appealDetails.trim().length < 10) { toast.error('Explique em pelo menos 10 caracteres por que a decisão deve ser revista.'); return; }
    setBusy(true);
    try { await trustSafety.submitAppeal(appealReason.trim(),appealDetails.trim()); setAppealDetails(''); toast.success('Recurso enviado para análise.'); setAppeals(await trustSafety.getAppeals()); }
    catch (e:any) { const msg=String(e?.message||''); toast.error(msg.includes('appeal_already_open')?'Você já possui um recurso em análise.':msg.includes('appeal_rate_limited')?'Aguarde antes de enviar outro recurso.':'Não foi possível enviar o recurso.'); }
    finally { setBusy(false); }
  };

  const openAppeal = useMemo(() => appeals.find(a => a.status==='pending'||a.status==='in_review'),[appeals]);

  return <ModalShell onClose={onClose} size="lg" eyebrow="Ponto G" title="Ajuda e segurança" description="Fale com nossa equipe e acompanhe seus atendimentos sem sair do app." icon="support_agent">
    <div className="mb-4 flex gap-2 rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-1.5">
      <button type="button" onClick={()=>setTab('support')} className={`pg-btn flex-1 !min-h-[40px] !rounded-[13px] !text-xs ${tab==='support'?'pg-btn-primary':'pg-btn-ghost'}`}>Atendimento</button>
      {restricted && <button type="button" onClick={()=>setTab('appeal')} className={`pg-btn flex-1 !min-h-[40px] !rounded-[13px] !text-xs ${tab==='appeal'?'pg-btn-primary':'pg-btn-ghost'}`}>Recurso</button>}
    </div>

    {tab==='support' && <div className="space-y-5">
      {selected ? <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><button type="button" onClick={()=>setSelected(null)} className="text-xs font-black text-primary-300">← Atendimentos</button><span className="pg-chip !min-h-[28px] !text-[10px]">#{selected.number} · {statusLabel[selected.status]}</span></div>
        <div><h3 className="font-bricolage text-lg font-black text-white">{selected.subject}</h3><p className="mt-1 text-xs text-white/38">Última atividade {dt(selected.last_message_at)}</p></div>
        <div className="max-h-[44vh] space-y-2 overflow-y-auto pr-1 no-scrollbar">{messages.length===0?<p className="rounded-[18px] bg-white/[0.025] p-4 text-sm text-white/40">Ainda sem mensagens.</p>:messages.map(m=><div key={m.id} className={`flex ${m.author_type==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[84%] rounded-[18px] px-3.5 py-3 text-sm leading-relaxed ${m.author_type==='user'?'bg-primary-500 text-white rounded-br-md':'border border-white/[0.07] bg-white/[0.04] text-white/72 rounded-bl-md'}`}><p>{m.body}</p><small className={`mt-1.5 block text-[9px] ${m.author_type==='user'?'text-white/60':'text-white/25'}`}>{m.author_type==='admin'?'Equipe Ponto G':'Você'} · {dt(m.created_at)}</small></div></div>)}</div>
        {selected.status!=='closed' && <div className="flex items-end gap-2"><textarea value={reply} onChange={e=>setReply(e.target.value.slice(0,10000))} rows={2} className="pg-field flex-1 resize-none" placeholder="Escreva sua mensagem…"/><Button variant="primary" loading={busy} disabled={!reply.trim()} onClick={sendReply}>Enviar</Button></div>}
      </section> : <>
        <section><p className="pg-eyebrow mb-2">Seus atendimentos</p>{loading?<div className="h-20 animate-pulse rounded-[18px] bg-white/[0.03]"/>:tickets.length===0?<p className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-white/45">Você ainda não abriu nenhum atendimento.</p>:<div className="space-y-2">{tickets.slice(0,20).map(t=><button key={t.id} type="button" onClick={()=>void openTicket(t)} className="flex w-full items-center gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded">forum</span></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{t.subject}</strong><small className="text-[10px] text-white/32">#{t.number} · {statusLabel[t.status]} · {dt(t.last_message_at)}</small></span><span className="material-symbols-rounded text-white/25">chevron_right</span></button>)}</div>}</section>
        <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4"><p className="pg-eyebrow">Novo atendimento</p><div className="mt-3 grid gap-3"><input className="pg-field" value={subject} maxLength={180} onChange={e=>setSubject(e.target.value)} placeholder="Assunto"/><select className="pg-field" value={category} onChange={e=>setCategory(e.target.value)}><option value="account">Conta</option><option value="safety">Segurança</option><option value="billing">Pagamento</option><option value="partner">Parceiros</option><option value="bug">Problema no app</option><option value="other">Outro</option></select><textarea className="pg-field resize-none" rows={4} maxLength={10000} value={firstMessage} onChange={e=>setFirstMessage(e.target.value)} placeholder="Como podemos ajudar?"/><Button variant="primary" fullWidth loading={busy} onClick={createTicket}>Abrir atendimento</Button></div></section>
      </>}
    </div>}

    {tab==='appeal' && restricted && <div className="space-y-4">
      <div className="rounded-[20px] border border-amber-500/15 bg-amber-500/[0.06] p-4"><strong className="text-sm text-amber-100">Revisão de decisão</strong><p className="mt-1 text-xs leading-relaxed text-amber-100/55">Seu recurso será analisado por uma pessoa da equipe. Enviar um recurso não restaura automaticamente o acesso.</p></div>
      {openAppeal ? <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><strong className="text-sm text-white">Recurso em andamento</strong><span className="pg-chip !min-h-[28px] !text-[10px]">{statusLabel[openAppeal.status]}</span></div><p className="mt-2 text-sm text-white/55">{openAppeal.details}</p><small className="mt-3 block text-[10px] text-white/28">Enviado em {dt(openAppeal.created_at)}</small></div> : <div className="space-y-3"><input className="pg-field" value={appealReason} maxLength={120} onChange={e=>setAppealReason(e.target.value)} placeholder="Motivo do recurso"/><textarea className="pg-field resize-none" rows={6} maxLength={4000} value={appealDetails} onChange={e=>setAppealDetails(e.target.value)} placeholder="Explique por que você acredita que a decisão deve ser revista…"/><Button variant="primary" fullWidth loading={busy} onClick={submitAppeal}>Enviar recurso</Button></div>}
      {appeals.filter(a=>a.status==='approved'||a.status==='rejected').length>0 && <section><p className="pg-eyebrow mb-2">Histórico</p><div className="space-y-2">{appeals.filter(a=>a.status==='approved'||a.status==='rejected').slice(0,5).map(a=><div key={a.id} className="rounded-[16px] border border-white/[0.06] p-3"><div className="flex justify-between gap-2"><strong className="text-xs text-white">{statusLabel[a.status]}</strong><small className="text-[10px] text-white/28">{dt(a.reviewed_at||a.updated_at)}</small></div>{a.resolution_reason&&<p className="mt-2 text-xs leading-relaxed text-white/45">{a.resolution_reason}</p>}</div>)}</div></section>}
    </div>}
  </ModalShell>;
};

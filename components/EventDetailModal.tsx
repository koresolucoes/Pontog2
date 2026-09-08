import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useEventStore, type EventFeedItem, type EventAttendanceStatus } from '../stores/eventStore';
import { ModalShell } from './ui/ModalShell';

interface EventDetailModalProps {
  event: EventFeedItem;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  party: 'Festa',
  karaoke: 'Karaokê',
  show: 'Show',
  drag: 'Drag',
  meetup: 'Encontro',
  festival: 'Festival',
  special_night: 'Noite especial',
  cultural: 'Cultural',
  other: 'Evento',
};

const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(date));

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event: initialEvent, onClose }) => {
  const user = useAuthStore((state) => state.user);
  const publishAgoraCheckin = useAgoraStore((state) => state.publishAgoraCheckin);
  const events = useEventStore((state) => state.events);
  const attendeesByEvent = useEventStore((state) => state.attendees);
  const myAttendance = useEventStore((state) => state.myAttendance);
  const actionBusy = useEventStore((state) => state.actionBusy);
  const fetchAttendees = useEventStore((state) => state.fetchAttendees);
  const hydrateMyAttendance = useEventStore((state) => state.hydrateMyAttendance);
  const setAttendance = useEventStore((state) => state.setAttendance);
  const setEventCheckin = useEventStore((state) => state.setEventCheckin);

  const event = events.find((item) => item.id === initialEvent.id) || initialEvent;
  const attendees = attendeesByEvent[event.id] || [];
  const attendance = myAttendance[event.id] ?? null;
  const [checkedIn, setCheckedIn] = useState(false);
  const [loadingPresence, setLoadingPresence] = useState(true);

  const endAt = useMemo(() => new Date(event.end_time || new Date(new Date(event.start_time).getTime() + 6 * 3600000).toISOString()), [event.end_time, event.start_time]);
  const checkinWindowOpen = useMemo(() => {
    const now = Date.now();
    return now >= new Date(event.start_time).getTime() - 2 * 3600000 && now <= endAt.getTime() + 2 * 3600000;
  }, [event.start_time, endAt]);
  const isLive = Date.now() >= new Date(event.start_time).getTime() && Date.now() <= endAt.getTime();

  const refreshOwnPresence = async () => {
    if (!user) { setCheckedIn(false); setLoadingPresence(false); return; }
    const { data } = await supabase
      .from('event_checkins')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .is('checked_out_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();
    setCheckedIn(Boolean(data));
    setLoadingPresence(false);
  };

  useEffect(() => {
    void Promise.all([
      fetchAttendees(event.id),
      hydrateMyAttendance([event.id]),
      refreshOwnPresence(),
    ]);
  }, [event.id, user?.id]);

  const handleAttendance = async (status: EventAttendanceStatus) => {
    if (!user) return toast.error('Entre para acompanhar este evento.');
    const next = attendance === status ? null : status;
    const ok = await setAttendance(event.id, next);
    if (ok) toast.success(next === 'going' ? 'Marcado: você vai.' : next === 'interested' ? 'Evento salvo nos seus interesses.' : 'Interesse removido.');
    else toast.error('Não foi possível atualizar sua presença.');
  };

  const handleCheckin = async () => {
    if (!user) return toast.error('Entre para fazer check-in.');
    if (!checkedIn && !checkinWindowOpen) return toast.error('O check-in abre 2 horas antes do evento.');
    const wasCheckedIn = checkedIn;
    const ok = await setEventCheckin(event.id, !wasCheckedIn);
    if (!ok) return toast.error('Não foi possível atualizar o check-in.');
    setCheckedIn(!wasCheckedIn);
    toast.success(wasCheckedIn ? 'Check-in encerrado.' : 'Você está no evento agora.');
    if (!wasCheckedIn) {
      void publishAgoraCheckin(event.title, event.cover_image_url || '');
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await useAuthStore.getState().fetchProfile(authUser);
  };

  const route = () => {
    if (event.lat == null || event.lng == null) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`, '_blank', 'noopener,noreferrer');
  };

  const share = async () => {
    const text = `${event.title} — ${event.location_name || event.venue_name || 'Belo Horizonte'} — ${formatDate(event.start_time)}`;
    if (navigator.share) await navigator.share({ title: event.title, text, url: event.source_url || window.location.href }).catch(() => undefined);
    else { await navigator.clipboard.writeText(text); toast.success('Evento copiado.'); }
  };

  return (
    <ModalShell open onClose={onClose} size="lg">
      <div className="relative overflow-hidden rounded-[26px] bg-[#08080b]">
        <section className="relative min-h-[270px] overflow-hidden bg-[#111116]">
          {event.cover_image_url ? <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 h-full w-full object-cover" /> : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,12,105,.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,.18),transparent_42%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-[#08080b]" />
          <button onClick={onClose} className="pg-icon-btn absolute right-4 top-4 z-20 !bg-black/45 backdrop-blur-xl" aria-label="Fechar"><span className="material-symbols-rounded">close</span></button>
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`pg-chip ${isLive ? 'pg-chip-active' : ''}`}>{isLive ? '● Acontecendo agora' : CATEGORY_LABELS[event.category] || 'Evento'}</span>
              {event.tags.slice(0, 2).map((tag) => <span key={tag} className="pg-chip">{tag}</span>)}
            </div>
            <h1 className="pg-title text-[31px] leading-[.98] text-white sm:text-[38px]">{event.title}</h1>
            <p className="mt-3 text-sm font-semibold text-white/58">{formatDate(event.start_time)}{event.end_time ? ` → ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.end_time))}` : ''}</p>
            <p className="mt-1 text-sm text-white/42">{event.location_name || event.venue_name}</p>
          </div>
        </section>

        <div className="space-y-5 px-4 pb-6 pt-4 sm:px-6">
          <div className="grid grid-cols-3 gap-2">
            <button disabled={actionBusy} onClick={() => handleAttendance('interested')} className={`pg-btn !px-2 !text-xs ${attendance === 'interested' ? 'pg-btn-primary' : 'pg-btn-secondary'}`}><span className="material-symbols-rounded !text-[18px]">star</span>Interesse</button>
            <button disabled={actionBusy} onClick={() => handleAttendance('going')} className={`pg-btn !px-2 !text-xs ${attendance === 'going' ? 'pg-btn-primary' : 'pg-btn-secondary'}`}><span className="material-symbols-rounded !text-[18px]">event_available</span>Vou</button>
            <button disabled={actionBusy || loadingPresence || (!checkedIn && !checkinWindowOpen)} onClick={handleCheckin} className={`pg-btn !px-2 !text-xs ${checkedIn ? 'pg-btn-primary' : 'pg-btn-secondary'} disabled:opacity-35`}><span className="material-symbols-rounded !text-[18px]">location_on</span>{checkedIn ? 'Estou aqui' : 'Check-in'}</button>
          </div>

          <section className="grid grid-cols-3 gap-2">
            <div className="pg-surface p-3 text-center"><strong className="block text-lg font-black text-white">{event.interested_count}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-white/35">interessados</span></div>
            <div className="pg-surface p-3 text-center"><strong className="block text-lg font-black text-white">{event.going_count}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-white/35">vão</span></div>
            <div className="pg-surface p-3 text-center"><strong className="block text-lg font-black text-[var(--pg-online)]">{event.here_now_count}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-white/35">aqui agora</span></div>
          </section>

          <section className="pg-surface p-4">
            <div className="flex items-center justify-between"><div><p className="pg-eyebrow">Pessoas</p><h3 className="mt-1 text-sm font-black text-white">Quem marcou presença</h3></div><span className="material-symbols-rounded text-[var(--pg-primary)]">groups</span></div>
            {attendees.length ? (
              <div className="mt-4 space-y-3">
                <div className="flex -space-x-2">{attendees.slice(0, 10).map((person) => <div key={person.user_id} title={person.username} className={`relative h-11 w-11 overflow-hidden rounded-full border-2 border-[#09090d] ${person.is_checked_in ? 'ring-2 ring-[var(--pg-online)]' : ''}`}>{person.avatar_url ? <img src={person.avatar_url} alt={person.username} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-white/5 text-xs font-black text-white/50">{person.username.slice(0,1).toUpperCase()}</div>}</div>)}</div>
                <p className="text-xs text-white/38">O anel verde indica quem fez check-in no evento agora.</p>
              </div>
            ) : <p className="mt-3 text-sm text-white/35">Ninguém marcou presença visível ainda.</p>}
          </section>

          {event.description && <section className="pg-surface p-4"><p className="pg-eyebrow">Sobre</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/60">{event.description}</p></section>}

          <div className="grid grid-cols-2 gap-2">
            <button disabled={event.lat == null || event.lng == null} onClick={route} className="pg-btn pg-btn-secondary !text-xs disabled:opacity-35"><span className="material-symbols-rounded !text-[18px]">directions</span>Rota</button>
            <button onClick={share} className="pg-btn pg-btn-secondary !text-xs"><span className="material-symbols-rounded !text-[18px]">share</span>Compartilhar</button>
          </div>
          {event.source_url && <a href={event.source_url} target="_blank" rel="noreferrer" className="block text-center text-xs font-black text-[var(--pg-primary)]">Ver programação oficial ↗</a>}
        </div>
      </div>
    </ModalShell>
  );
};
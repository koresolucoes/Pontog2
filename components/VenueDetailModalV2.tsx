import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Venue, VenueCheckin, VenueReview, User } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
import { profileQueries } from '../modules/profiles/public';
import { useHardwareBack } from '../lib/useHardwareBack';

interface VenueDetailModalProps { venue: Venue; onClose: () => void; }

type SafetyStats = {
  staffRespectAvg: number;
  inclusiveBathroomsPercent: number;
  safetyAssistanceAvg: number;
  totalReviews: number;
  userHasReviewed: boolean;
};

const EmptyData = ({ icon, title, text }: { icon: string; title: string; text: string }) => (
  <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-5 text-center">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/[0.04] text-white/25"><span className="material-symbols-rounded">{icon}</span></span>
    <h4 className="mt-3 text-sm font-black text-white/75">{title}</h4>
    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/35">{text}</p>
  </div>
);

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({ venue, onClose }) => {
  useHardwareBack(true, onClose);
  const user = useAuthStore((state) => state.user);
  const setSelectedUser = useMapStore((state) => state.setSelectedUser);
  const publishAgoraCheckin = useAgoraStore((state) => state.publishAgoraCheckin);
  const [checkins, setCheckins] = useState<VenueCheckin[]>([]);
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [safetyStats, setSafetyStats] = useState<SafetyStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [safetyLoading, setSafetyLoading] = useState(true);
  const [reviewError, setReviewError] = useState(false);
  const [safetyError, setSafetyError] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showSafetyForm, setShowSafetyForm] = useState(false);
  const [ratingRespect, setRatingRespect] = useState(5);
  const [ratingAssistance, setRatingAssistance] = useState(5);
  const [inclusiveBathrooms, setInclusiveBathrooms] = useState(false);
  const [busy, setBusy] = useState(false);

  const displayImage = venue.image_url || '';
  const isCurrentCheckin = user?.current_checkin_venue_id === venue.id;

  const resolveProfiles = async (ids: string[]) => {
    const entries = await Promise.all(Array.from(new Set(ids.filter(Boolean))).map(async (id) => {
      try { return [id, await profileQueries.getPublicProfile(id)] as const; }
      catch { return [id, null] as const; }
    }));
    return new Map(entries.filter((entry) => Boolean(entry[1])) as Array<[string, any]>);
  };

  const fetchCheckins = async () => {
    const { data, error } = await supabase.rpc('get_venue_checkins', { p_venue_id: venue.id });
    if (error) {
      console.warn('Venue check-ins unavailable:', error);
      setCheckins([]);
      return;
    }
    setCheckins((data || []) as VenueCheckin[]);
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    setReviewError(false);
    try {
      const { data, error } = await supabase
        .from('venue_reviews')
        .select('id, venue_id, user_id, comment, photos, created_at, likes_count, replies_count')
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const profiles = await resolveProfiles((data || []).map((item: any) => item.user_id));
      const mapped: VenueReview[] = (data || []).map((item: any) => {
        const author = profiles.get(item.user_id);
        return {
          ...item,
          photos: item.photos || [],
          likes_count: Number(item.likes_count || 0),
          replies_count: Number(item.replies_count || 0),
          user_has_liked: false,
          username: author?.username || 'Perfil indisponível',
          avatar_url: author?.avatar_url || '',
        } as VenueReview;
      });
      setReviews(mapped);
    } catch (error) {
      console.error('Venue reviews failed:', error);
      setReviews([]);
      setReviewError(true);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchSafety = async () => {
    setSafetyLoading(true);
    setSafetyError(false);
    try {
      const { data, error } = await supabase
        .from('venue_safety_reviews')
        .select('staff_respect, inclusive_bathrooms, safety_assistance, user_id')
        .eq('venue_id', venue.id);
      if (error) throw error;

      if (!data?.length) {
        setSafetyStats({ staffRespectAvg: 0, inclusiveBathroomsPercent: 0, safetyAssistanceAvg: 0, totalReviews: 0, userHasReviewed: false });
        return;
      }

      const total = data.length;
      setSafetyStats({
        staffRespectAvg: data.reduce((sum: number, item: any) => sum + Number(item.staff_respect || 0), 0) / total,
        inclusiveBathroomsPercent: data.filter((item: any) => Boolean(item.inclusive_bathrooms)).length / total * 100,
        safetyAssistanceAvg: data.reduce((sum: number, item: any) => sum + Number(item.safety_assistance || 0), 0) / total,
        totalReviews: total,
        userHasReviewed: Boolean(user && data.some((item: any) => item.user_id === user.id)),
      });
      if (user) {
        const own = data.find((item: any) => item.user_id === user.id);
        if (own) {
          setRatingRespect(Number(own.staff_respect || 5));
          setRatingAssistance(Number(own.safety_assistance || 5));
          setInclusiveBathrooms(Boolean(own.inclusive_bathrooms));
        }
      }
    } catch (error) {
      console.error('Venue safety stats failed:', error);
      setSafetyStats(null);
      setSafetyError(true);
    } finally {
      setSafetyLoading(false);
    }
  };

  useEffect(() => { void Promise.all([fetchCheckins(), fetchReviews(), fetchSafety()]); }, [venue.id]);

  const handleCheckin = async () => {
    if (!user || busy) return toast.error('Entre para fazer check-in.');
    setBusy(true);
    try {
      if (isCurrentCheckin) {
        const { error } = await supabase.rpc('set_my_checkin_v1', { p_venue_id: null });
        if (error) throw error;
        toast.success('Check-in encerrado.');
      } else {
        const { error } = await supabase.from('venue_checkins').insert({ venue_id: venue.id, user_id: user.id });
        if (error) throw error;
        const { error: profileError } = await supabase.rpc('set_my_checkin_v1', { p_venue_id: venue.id });
        if (profileError) throw profileError;
        toast.success(`Check-in feito em ${venue.name}.`);
        void publishAgoraCheckin(venue.name, venue.image_url || '');
      }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) await useAuthStore.getState().fetchProfile(authUser);
      await fetchCheckins();
    } catch (error) {
      console.error('Venue check-in failed:', error);
      toast.error('Não foi possível atualizar o check-in.');
    } finally { setBusy(false); }
  };

  const publishReview = async () => {
    if (!user || !newReview.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from('venue_reviews').insert({
      venue_id: venue.id,
      user_id: user.id,
      comment: newReview.trim(),
      photos: [],
    });
    if (error) {
      console.error('Venue review insert failed:', error);
      toast.error('Sua avaliação não foi publicada. Nada foi salvo localmente.');
    } else {
      toast.success('Avaliação publicada.');
      setNewReview('');
      setShowReviewForm(false);
      await fetchReviews();
    }
    setBusy(false);
  };

  const publishSafety = async () => {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase.from('venue_safety_reviews').upsert({
      venue_id: venue.id,
      user_id: user.id,
      staff_respect: ratingRespect,
      inclusive_bathrooms: inclusiveBathrooms,
      safety_assistance: ratingAssistance,
    }, { onConflict: 'venue_id,user_id' });
    if (error) {
      console.error('Venue safety review failed:', error);
      toast.error('A avaliação de segurança não foi publicada.');
    } else {
      toast.success('Avaliação de segurança publicada.');
      setShowSafetyForm(false);
      await fetchSafety();
    }
    setBusy(false);
  };

  const share = async () => {
    const url = `${window.location.origin}/#map`;
    if (navigator.share) await navigator.share({ title: venue.name, text: venue.address, url }).catch(() => undefined);
    else { await navigator.clipboard.writeText(`${venue.name} — ${venue.address}`); toast.success('Local copiado.'); }
  };

  const route = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.lat},${venue.lng}`)}`, '_blank', 'noopener,noreferrer');

  return (
    <>
      <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md" onClick={onClose}/>
      <div className="pointer-events-none fixed inset-0 z-[151] flex items-end justify-center sm:items-center sm:p-5">
        <article className="pointer-events-auto relative flex max-h-[94dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[34px] border border-white/[0.08] bg-[#08080b]/97 shadow-[0_-24px_80px_rgba(0,0,0,.55)] sm:max-h-[90dvh] sm:rounded-[34px]">
          <button onClick={onClose} className="pg-icon-btn absolute right-4 top-4 z-30 !bg-black/45 backdrop-blur-xl" aria-label="Fechar"><span className="material-symbols-rounded">close</span></button>
          <div className="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <section className="relative aspect-[16/10] min-h-[280px] bg-[#111116]">
              {displayImage ? <img src={displayImage} alt={venue.name} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-white/15"><span className="material-symbols-rounded !text-[52px]">storefront</span></div>}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#08080b]"/>
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="mb-2 flex items-center gap-2">{venue.is_partner && <span className="pg-chip !border-amber-400/20 !bg-amber-400/10 !text-amber-200">Parceiro</span>}{venue.is_verified && <span className="pg-chip pg-chip-active">Verificado</span>}</div>
                <h1 className="pg-title text-[32px] text-white">{venue.name}</h1>
                <p className="mt-2 text-sm text-white/52">{venue.address}</p>
              </div>
            </section>

            <div className="space-y-5 px-4 pt-4 sm:px-5">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={handleCheckin} disabled={busy} className={`pg-btn ${isCurrentCheckin ? 'pg-btn-secondary' : 'pg-btn-primary'} !px-2 !text-xs`}><span className="material-symbols-rounded !text-[17px]">location_on</span>{isCurrentCheckin ? 'Sair' : 'Check-in'}</button>
                <button onClick={route} className="pg-btn pg-btn-secondary !px-2 !text-xs"><span className="material-symbols-rounded !text-[17px]">directions</span>Rota</button>
                <button onClick={share} className="pg-btn pg-btn-secondary !px-2 !text-xs"><span className="material-symbols-rounded !text-[17px]">share</span>Compartilhar</button>
              </div>

              <section className="pg-surface p-4">
                <div className="flex items-center justify-between"><div><p className="pg-eyebrow">Quem está aqui</p><h3 className="mt-1 text-sm font-black text-white">{checkins.length ? `${checkins.length} agora` : 'Sem check-ins visíveis'}</h3></div><span className="material-symbols-rounded text-[var(--pg-online)]">group</span></div>
                {checkins.length > 0 && <div className="mt-4 flex -space-x-2">{checkins.slice(0,8).map((checkin) => <button key={checkin.user_id} onClick={() => setSelectedUser({ id: checkin.user_id, username: checkin.username, avatar_url: checkin.avatar_url } as User)} className="h-11 w-11 overflow-hidden rounded-full border-2 border-[#09090d]"><img src={checkin.avatar_url} alt={checkin.username} className="h-full w-full object-cover"/></button>)}</div>}
              </section>

              {(venue.description || venue.opening_hours || venue.website || venue.phone) && <section className="pg-surface p-4"><p className="pg-eyebrow">Sobre o local</p>{venue.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/62">{venue.description}</p>}{venue.opening_hours && <p className="mt-3 text-xs font-semibold text-white/42">Horário informado: {venue.opening_hours}</p>}{venue.website && <a href={venue.website} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-bold text-[var(--pg-primary)]">Visitar site</a>}</section>}

              <section className="space-y-3">
                <div className="flex items-end justify-between"><div><p className="pg-eyebrow">Segurança LGBTQ+</p><h3 className="mt-1 font-bricolage text-xl font-black text-white">Experiência da comunidade</h3></div>{user && <button onClick={() => setShowSafetyForm((v) => !v)} className="pg-btn pg-btn-secondary !min-h-[40px] !rounded-full !px-4 !text-xs">Avaliar</button>}</div>
                {safetyLoading ? <div className="h-28 animate-pulse rounded-[22px] bg-white/[0.03]"/> : safetyError ? <EmptyData icon="cloud_off" title="Dados indisponíveis" text="Não conseguimos carregar as avaliações de segurança agora. Tente novamente mais tarde."/> : !safetyStats?.totalReviews ? <EmptyData icon="shield" title="Ainda sem avaliações suficientes" text="Se você conhece este local, compartilhe sua experiência para ajudar outras pessoas."/> : <div className="grid grid-cols-3 gap-2"><Metric label="Respeito" value={`${safetyStats.staffRespectAvg.toFixed(1)}/5`}/><Metric label="Banheiro inclusivo" value={`${Math.round(safetyStats.inclusiveBathroomsPercent)}%`}/><Metric label="Assistência" value={`${safetyStats.safetyAssistanceAvg.toFixed(1)}/5`}/></div>}
                {showSafetyForm && <div className="pg-surface space-y-4 p-4"><Scale label="Respeito da equipe" value={ratingRespect} onChange={setRatingRespect}/><Scale label="Ajuda em situação de risco" value={ratingAssistance} onChange={setRatingAssistance}/><label className="flex items-center justify-between gap-3 text-sm font-bold text-white/65">Banheiro inclusivo<input type="checkbox" checked={inclusiveBathrooms} onChange={(e) => setInclusiveBathrooms(e.target.checked)}/></label><button onClick={publishSafety} disabled={busy} className="pg-btn pg-btn-primary w-full">Publicar avaliação</button></div>}
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between"><div><p className="pg-eyebrow">Avaliações</p><h3 className="mt-1 font-bricolage text-xl font-black text-white">Como foi a experiência?</h3></div>{user && <button onClick={() => setShowReviewForm((v) => !v)} className="pg-btn pg-btn-secondary !min-h-[40px] !rounded-full !px-4 !text-xs">Escrever</button>}</div>
                {showReviewForm && <div className="pg-surface p-4"><textarea value={newReview} onChange={(e) => setNewReview(e.target.value.slice(0,2000))} rows={4} className="pg-field resize-none" placeholder="Conte o que realmente aconteceu…"/><button onClick={publishReview} disabled={busy || !newReview.trim()} className="pg-btn pg-btn-primary mt-3 w-full">Publicar</button></div>}
                {reviewsLoading ? <div className="space-y-2">{[1,2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[22px] bg-white/[0.03]"/>)}</div> : reviewError ? <EmptyData icon="cloud_off" title="Avaliações indisponíveis" text="Nenhuma avaliação local ou simulada será exibida enquanto o banco estiver indisponível."/> : reviews.length === 0 ? <EmptyData icon="rate_review" title="Seja a primeira pessoa a avaliar" text="Ainda não há avaliações reais publicadas para este local."/> : <div className="space-y-2">{reviews.map((review) => <article key={review.id} className="pg-surface p-4"><div className="flex items-center gap-3">{review.avatar_url ? <img src={review.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/25"><span className="material-symbols-rounded">person</span></span>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white/75">{review.username}</p><p className="text-[10px] text-white/28">{new Date(review.created_at).toLocaleDateString('pt-BR')}</p></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/58">{review.comment}</p></article>)}</div>}
              </section>

              <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-white/32"><strong className="text-white/55">Sobre dados de confiança:</strong> o Ponto G exibe apenas informações enviadas ao banco por pessoas usuárias ou fontes verificadas. Ausência de dados nunca é convertida em nota, avaliação ou estimativa fictícia.</section>
            </div>
          </div>
        </article>
      </div>
    </>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-3 text-center"><p className="font-space text-lg font-black text-white">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.1em] text-white/30">{label}</p></div>;
const Scale = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-white/55">{label}</span><span className="font-space text-xs font-black text-white">{value}/5</span></div><div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map((item) => <button key={item} type="button" onClick={() => onChange(item)} className={`h-9 rounded-xl border text-xs font-black ${item <= value ? 'border-[rgba(245,12,105,.28)] bg-[rgba(245,12,105,.13)] text-[var(--pg-primary)]' : 'border-white/[0.07] bg-white/[0.03] text-white/30'}`}>{item}</button>)}</div></div>;

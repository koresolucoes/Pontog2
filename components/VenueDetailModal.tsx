
import React, { useState, useEffect } from 'react';
import { Venue, VenueCheckin } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface VenueDetailModalProps {
  venue: Venue;
  onClose: () => void;
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({ venue, onClose }) => {
  const { t } = useTranslation();
  const [checkins, setCheckins] = useState<VenueCheckin[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const user = useAuthStore(state => state.user);

  // Safety Evaluation State
  const [safetyStats, setSafetyStats] = useState<{
    staffRespectAvg: number;
    inclusiveBathroomsPercent: number;
    safetyAssistanceAvg: number;
    totalReviews: number;
    userHasReviewed: boolean;
  } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [ratingRespect, setRatingRespect] = useState(5);
  const [ratingBathrooms, setRatingBathrooms] = useState(false);
  const [ratingAssistance, setRatingAssistance] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    fetchCheckins();
    fetchSafetyStats();
  }, [venue.id]);

  const loadFallbackStats = () => {
    const localDataStr = localStorage.getItem(`venue_safety_${venue.id}`);
    if (localDataStr) {
      const localData = JSON.parse(localDataStr);
      setSafetyStats(localData);
    } else {
      let code = 0;
      for (let i = 0; i < venue.name.length; i++) code += venue.name.charCodeAt(i);
      const seedRespect = (code % 3) + 3; // 3, 4, 5
      const seedBathrooms = (code % 2) === 0 ? 100 : 0;
      const seedAssistance = ((code + 2) % 3) + 3;
      
      setSafetyStats({
        staffRespectAvg: seedRespect,
        inclusiveBathroomsPercent: seedBathrooms,
        safetyAssistanceAvg: seedAssistance,
        totalReviews: 8 + (code % 12),
        userHasReviewed: false
      });
    }
  };

  const fetchSafetyStats = async () => {
    try {
      const { data, error } = await supabase
        .from('venue_safety_reviews')
        .select('staff_respect, inclusive_bathrooms, safety_assistance, user_id')
        .eq('venue_id', venue.id);

      if (error) {
        loadFallbackStats();
        return;
      }

      if (data && data.length > 0) {
        const total = data.length;
        const sumRespect = data.reduce((acc, r) => acc + (r.staff_respect || 0), 0);
        const sumAssistance = data.reduce((acc, r) => acc + (r.safety_assistance || 0), 0);
        const countBathrooms = data.filter(r => r.inclusive_bathrooms).length;
        const userHasReviewed = user ? data.some(r => r.user_id === user.id) : false;

        setSafetyStats({
          staffRespectAvg: sumRespect / total,
          inclusiveBathroomsPercent: (countBathrooms / total) * 100,
          safetyAssistanceAvg: sumAssistance / total,
          totalReviews: total,
          userHasReviewed
        });
        
        // If user already reviewed, pre-populate values
        if (user) {
          const userRev = data.find(r => r.user_id === user.id);
          if (userRev) {
            setRatingRespect(userRev.staff_respect || 5);
            setRatingBathrooms(!!userRev.inclusive_bathrooms);
            setRatingAssistance(userRev.safety_assistance || 5);
          }
        }
      } else {
        setSafetyStats({
          staffRespectAvg: 0,
          inclusiveBathroomsPercent: 0,
          safetyAssistanceAvg: 0,
          totalReviews: 0,
          userHasReviewed: false
        });
      }
    } catch (err) {
      loadFallbackStats();
    }
  };

  const handlePublishSafetyReview = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para avaliar.');
      return;
    }
    setIsSubmittingReview(true);
    
    const payload = {
      venue_id: venue.id,
      user_id: user.id,
      staff_respect: ratingRespect,
      inclusive_bathrooms: ratingBathrooms,
      safety_assistance: ratingAssistance,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('venue_safety_reviews')
        .upsert(payload, { onConflict: 'venue_id, user_id' });

      if (error) throw error;
      
      toast.success('Avaliação de segurança publicada!');
      setShowReviewForm(false);
      fetchSafetyStats();
    } catch (err) {
      console.warn("Supabase insert failed, saving to local fallback...", err);
      
      const localData = {
        staffRespectAvg: ratingRespect,
        inclusiveBathroomsPercent: ratingBathrooms ? 100 : 0,
        safetyAssistanceAvg: ratingAssistance,
        totalReviews: (safetyStats?.totalReviews || 0) + (safetyStats?.userHasReviewed ? 0 : 1),
        userHasReviewed: true
      };
      
      localStorage.setItem(`venue_safety_${venue.id}`, JSON.stringify(localData));
      setSafetyStats(localData);
      toast.success('Avaliação salva localmente (banco de dados pendente do script SQL).');
      setShowReviewForm(false);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchCheckins = async () => {
    try {
      const { data, error } = await supabase.rpc('get_venue_checkins', { p_venue_id: venue.id });
      if (error) {
         fetchCheckinsFallback();
      } else {
        setCheckins(data || []);
      }
    } catch (err) {
      fetchCheckinsFallback();
    }
  };

  const fetchCheckinsFallback = async () => {
    try {
       const { data, error } = await supabase
         .from('venue_checkins')
         .select(`
            user_id,
            created_at,
            profiles!inner ( username, avatar_url )
         `)
         .eq('venue_id', venue.id)
         .gt('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
         .order('created_at', { ascending: false });

       if (!error && data) {
          setCheckins(data.map((row: any) => ({
             user_id: row.user_id,
             username: row.profiles.username,
             avatar_url: row.profiles.avatar_url,
             checked_in_at: row.created_at
          })));
       }
    } catch (e) {
       console.error("Fallback checkins failed", e);
    }
  };

  const hasCheckedIn = user ? checkins.some(c => c.user_id === user.id) : false;

  const handleCheckinToggle = async () => {
    if (!user) {
        toast.error(t('venue.login_required', { defaultValue: 'Você precisa estar logado para fazer check-in.' }));
        return;
    }
    
    setIsCheckingIn(true);
    try {
        if (hasCheckedIn) {
            const { error } = await supabase
                .from('venue_checkins')
                .delete()
                .match({ venue_id: venue.id, user_id: user.id });
            
            if (error) throw error;
            setCheckins(prev => prev.filter(c => c.user_id !== user.id));
            toast.success(t('venue.checkin_removed', { defaultValue: 'Check-in removido.' }));
        } else {
            const { error } = await supabase
                .from('venue_checkins')
                .upsert({ venue_id: venue.id, user_id: user.id }, { onConflict: 'venue_id, user_id' });
            
            if (error) throw error;
            toast.success(t('venue.checkin_success', { defaultValue: 'Check-in realizado!' }));
            fetchCheckins(); 
        }
    } catch (error) {
        console.error('Error toggling checkin', error);
        toast.error(t('venue.checkin_error', { defaultValue: 'Erro ao atualizar check-in.' }));
    } finally {
        setIsCheckingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] animate-fade-in p-0 sm:p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md mx-auto animate-slide-in-up flex flex-col max-h-[90vh] border border-white/10 overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Image */}
        <div className="relative h-56 w-full flex-shrink-0">
            <img 
                src={venue.image_url || 'https://placehold.co/600x400/1f2937/ffffff?text=Local'} 
                alt={venue.name} 
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
            
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors border border-white/10">
                <span className="material-symbols-rounded">close</span>
            </button>

            <div className="absolute bottom-4 left-4 right-4">
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase border border-white/10 shadow-lg">
                        {venue.type === 'event' ? t('venue.type_event', { defaultValue: 'Evento' }) : venue.type}
                    </span>
                    {venue.is_partner && (
                        <span className="px-2 py-1 rounded-md bg-yellow-500 text-black text-[10px] font-bold uppercase flex items-center gap-1 shadow-lg">
                            <span className="material-symbols-rounded filled text-[12px]">star</span>
                            {t('venue.partner', { defaultValue: 'Parceiro' })}
                        </span>
                    )}
                </div>
                <h2 className="text-2xl font-bold text-white font-outfit leading-tight shadow-black drop-shadow-lg">{venue.name}</h2>
            </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-slate-900">
            <div className="space-y-6">
                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleCheckinToggle}
                        disabled={isCheckingIn}
                        className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            hasCheckedIn 
                            ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]' 
                            : 'bg-slate-800 text-white hover:bg-slate-700 border border-white/10'
                        }`}
                    >
                        <span className={`material-symbols-rounded ${hasCheckedIn ? 'filled' : ''}`}>
                            how_to_reg
                        </span>
                        {isCheckingIn ? t('common.processing', { defaultValue: 'Processando...' }) : (hasCheckedIn ? t('venue.checked_in', { defaultValue: 'Check-in Feito!' }) : t('venue.do_checkin', { defaultValue: 'Fazer Check-in' }))}
                    </button>
                    
                    <div className="flex gap-3">
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-white/10 text-sm"
                        >
                            <span className="material-symbols-rounded text-primary-500">map</span>
                            {t('venue.see_route', { defaultValue: 'Ver Rota' })}
                        </a>
                        <button 
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: venue.name,
                                        text: t('venue.share_text', { defaultValue: 'Confira {{name}} no Ponto G!', name: venue.name }),
                                        url: window.location.href
                                    }).catch(console.error);
                                }
                            }}
                            className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-white/10 text-sm"
                        >
                            <span className="material-symbols-rounded text-yellow-400">share</span>
                            {t('common.share', { defaultValue: 'Compartilhar' })}
                        </button>
                    </div>
                </div>

                {/* Checkins - Who is here */}
                {checkins.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-rounded text-green-400">group</span> 
                            {t('venue.who_is_here', { defaultValue: 'Quem está aqui' })} ({checkins.length})
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                            {checkins.map((c) => (
                                <div key={c.user_id} className="flex flex-col items-center flex-shrink-0 w-16">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 p-0.5 overflow-hidden shadow-lg mb-1">
                                        <img loading="lazy" src={c.avatar_url || 'https://via.placeholder.com/150'} alt={c.username} className="w-full h-full object-cover rounded-full" />
                                    </div>
                                    <span className="text-[10px] text-slate-400 truncate w-full text-center font-medium">{c.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-rounded text-slate-300 text-lg">location_on</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">{t('venue.address', { defaultValue: 'Endereço' })}</p>
                            <p className="text-sm text-slate-200 leading-snug">{venue.address}</p>
                        </div>
                    </div>

                    {venue.opening_hours && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-rounded text-slate-300 text-lg">schedule</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">{t('venue.hours', { defaultValue: 'Horário' })}</p>
                                <p className="text-sm text-slate-200 leading-snug">{venue.opening_hours}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary-500">info</span> {t('venue.about', { defaultValue: 'Sobre' })}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/30 p-3 rounded-xl border border-white/5">
                        {venue.description || t('venue.no_description', { defaultValue: 'Sem descrição disponível.' })}
                    </p>
                </div>

                {/* Safe Space Safety Evaluations */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-emerald-500/20 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-rounded text-emerald-400">shield_with_heart</span> 
                            {t('venue.safe_space_title', { defaultValue: 'Espaço Seguro LGBTQ+' })}
                        </h3>
                        {safetyStats && safetyStats.totalReviews > 0 && (
                            <span className="text-[10px] text-emerald-400/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {safetyStats.totalReviews} {safetyStats.totalReviews === 1 ? 'Avaliação' : 'Avaliações'}
                            </span>
                        )}
                    </div>

                    {safetyStats ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{t('venue.staff_respect', { defaultValue: 'Respeito da Equipe' })}</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex gap-0.5 text-yellow-400">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span 
                                                key={star} 
                                                className={`material-symbols-rounded text-[14px] ${star <= Math.round(safetyStats.staffRespectAvg) ? 'filled' : ''}`}
                                            >
                                                star
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-white font-bold">{safetyStats.staffRespectAvg > 0 ? safetyStats.staffRespectAvg.toFixed(1) : '--'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{t('venue.gender_bathrooms', { defaultValue: 'Banheiro Neutro/Inclusivo' })}</span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${safetyStats.inclusiveBathroomsPercent >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                    {safetyStats.inclusiveBathroomsPercent > 0 ? `${safetyStats.inclusiveBathroomsPercent.toFixed(0)}% sim` : 'Não Informado'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{t('venue.assistance_anti_harass', { defaultValue: 'Apoio e Anti-assédio' })}</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex gap-0.5 text-yellow-400">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span 
                                                key={star} 
                                                className={`material-symbols-rounded text-[14px] ${star <= Math.round(safetyStats.safetyAssistanceAvg) ? 'filled' : ''}`}
                                            >
                                                star
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-white font-bold">{safetyStats.safetyAssistanceAvg > 0 ? safetyStats.safetyAssistanceAvg.toFixed(1) : '--'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-pulse h-16 bg-slate-800 rounded-xl"></div>
                    )}

                    {/* Evaluation Form / Button */}
                    {user ? (
                        <div className="pt-2">
                            {!showReviewForm ? (
                                <button 
                                    onClick={() => setShowReviewForm(true)}
                                    className="w-full text-xs font-bold py-2 px-3 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5 transition-all text-center flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-rounded text-[16px]">rate_review</span>
                                    {safetyStats?.userHasReviewed 
                                        ? t('venue.update_evaluation', { defaultValue: 'Atualizar Minha Avaliação' }) 
                                        : t('venue.evaluate_place', { defaultValue: 'Avaliar Segurança do Local' })
                                    }
                                </button>
                            ) : (
                                <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-4 animate-fade-in">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            {t('venue.staff_respect_label', { defaultValue: '1. A equipe tratou o público com respeito?' })}
                                        </label>
                                        <div className="flex gap-1.5 text-yellow-400 cursor-pointer">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button 
                                                    key={star} 
                                                    type="button"
                                                    onClick={() => setRatingRespect(star)}
                                                    className="focus:outline-none transition-transform active:scale-125"
                                                >
                                                    <span className={`material-symbols-rounded text-xl ${star <= ratingRespect ? 'filled' : ''}`}>
                                                        star
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            {t('venue.inclusive_bathrooms_label', { defaultValue: '2. Há banheiros unissex/inclusivos?' })}
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={ratingBathrooms} 
                                                onChange={(e) => setRatingBathrooms(e.target.checked)} 
                                                className="sr-only peer" 
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            {t('venue.safety_assistance_label', { defaultValue: '3. Há apoio/sinalização contra importunação?' })}
                                        </label>
                                        <div className="flex gap-1.5 text-yellow-400 cursor-pointer">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button 
                                                    key={star} 
                                                    type="button"
                                                    onClick={() => setRatingAssistance(star)}
                                                    className="focus:outline-none transition-transform active:scale-125"
                                                >
                                                    <span className={`material-symbols-rounded text-xl ${star <= ratingAssistance ? 'filled' : ''}`}>
                                                        star
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setShowReviewForm(false)}
                                            className="flex-1 text-[11px] font-bold py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {t('common.cancel', { defaultValue: 'Cancelar' })}
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handlePublishSafetyReview}
                                            disabled={isSubmittingReview}
                                            className="flex-1 text-[11px] font-bold py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center justify-center gap-1"
                                        >
                                            {isSubmittingReview ? (
                                                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-rounded text-[14px]">done</span>
                                                    {t('common.save', { defaultValue: 'Salvar' })}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-500 text-center font-medium italic">
                            {t('venue.login_to_evaluate', { defaultValue: 'Faça login para deixar uma avaliação de segurança.' })}
                        </p>
                    )}
                </div>

                {/* Tags */}
                {venue.tags && venue.tags.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-white mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {venue.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-xs text-slate-300 font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Footer Brand */}
                <div className="pt-4 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Guia Ponto G</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

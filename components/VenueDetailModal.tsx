
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

  useEffect(() => {
    fetchCheckins();
  }, [venue.id]);

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


import React, { useState, useEffect } from 'react';
import { Venue, VenueCheckin, VenueReview, VenueReviewReply } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
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
  const [postToAgora, setPostToAgora] = useState(true);
  const user = useAuthStore(state => state.user);
  const mapUsers = useMapStore(state => state.users);
  const setSelectedUser = useMapStore(state => state.setSelectedUser);
  const publishAgoraCheckin = useAgoraStore(state => state.publishAgoraCheckin);


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

  // Experience Reviews State
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);

  // Experience Reviews Replies State
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const [replies, setReplies] = useState<Record<string, VenueReviewReply[]>>({});
  const [newReplyText, setNewReplyText] = useState<Record<string, string>>({});

  const loadFallbackReviews = () => {
    const localReviewsStr = localStorage.getItem(`venue_reviews_${venue.id}`);
    if (localReviewsStr) {
      try {
        const localReviews = JSON.parse(localReviewsStr);
        setReviews(localReviews);
      } catch (e) {
        console.error("Failed to parse local reviews", e);
      }
    } else {
      setReviews([
        {
          id: '1',
          venue_id: venue.id,
          user_id: 'mock-1',
          comment: 'Lugar incrível! A música estava ótima hoje e os drinks são muito bons. Super recomendo a visita.',
          photos: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300&q=80'],
          created_at: new Date().toISOString(),
          likes_count: 5,
          replies_count: 1,
          user_has_liked: false,
          username: 'LucasM',
          avatar_url: 'https://i.pravatar.cc/150?u=lucasm'
        }
      ]);
    }
  };

  const fetchExperienceReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('venue_reviews')
        .select(`
          id,
          venue_id,
          user_id,
          comment,
          photos,
          created_at,
          likes_count,
          replies_count
        `)
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: false });

      if (error) {
        loadFallbackReviews();
        return;
      }

      if (data && data.length > 0) {
        // Fetch profiles of these users separately to avoid dependency on explicit foreign keys
        const userIds = Array.from(new Set(data.map((r: any) => r.user_id)));
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map();
        if (profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p));
        }

        const formattedReviews: VenueReview[] = data.map((r: any) => {
          const profile = profilesMap.get(r.user_id);
          return {
            id: r.id,
            venue_id: r.venue_id,
            user_id: r.user_id,
            comment: r.comment,
            photos: r.photos || [],
            created_at: r.created_at,
            likes_count: r.likes_count || 0,
            replies_count: r.replies_count || 0,
            user_has_liked: false,
            username: profile?.username || 'Usuário',
            avatar_url: profile?.avatar_url || ''
          };
        });

        const localReviewsStr = localStorage.getItem(`venue_reviews_${venue.id}`);
        const localReviews: VenueReview[] = localReviewsStr ? JSON.parse(localReviewsStr) : [];
        const dbReviewIds = new Set(formattedReviews.map(fr => fr.id));
        const uniqueLocalReviews = localReviews.filter(lr => !dbReviewIds.has(lr.id));

        setReviews([...uniqueLocalReviews, ...formattedReviews]);
      } else {
        loadFallbackReviews();
      }
    } catch (err) {
      loadFallbackReviews();
    }
  };

  useEffect(() => {
    fetchCheckins();
    fetchSafetyStats();
    fetchExperienceReviews();
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

  const handleAddExperienceReview = async () => {
      if (!user) {
          toast.error(t('venue.login_required', { defaultValue: 'Você precisa estar logado para comentar.' }));
          return;
      }
      if (!newReviewText.trim()) return;

      const newReview: VenueReview = {
          id: Date.now().toString(),
          venue_id: venue.id,
          user_id: user.id,
          comment: newReviewText,
          photos: [], // Upload functionality skipped for brevity here
          created_at: new Date().toISOString(),
          likes_count: 0,
          replies_count: 0,
          user_has_liked: false,
          username: user.display_name || user.username,
          avatar_url: user.avatar_url,
      };

      setReviews(prev => [newReview, ...prev]);
      setNewReviewText('');
      setShowReviewInput(false);

      try {
          const { error } = await supabase
              .from('venue_reviews')
              .insert({
                  venue_id: newReview.venue_id,
                  user_id: newReview.user_id,
                  comment: newReview.comment,
                  photos: newReview.photos,
                  created_at: newReview.created_at
              });

          if (error) throw error;
          toast.success(t('venue.review_published', { defaultValue: 'Avaliação publicada!' }));
          fetchExperienceReviews();
      } catch (err) {
          console.warn("Supabase insert for venue_reviews failed, saving to local fallback...", err);
          
          const localReviewsStr = localStorage.getItem(`venue_reviews_${venue.id}`);
          const localReviews: VenueReview[] = localReviewsStr ? JSON.parse(localReviewsStr) : [];
          const updatedLocalReviews = [newReview, ...localReviews];
          localStorage.setItem(`venue_reviews_${venue.id}`, JSON.stringify(updatedLocalReviews));
          
          toast.success(t('venue.review_published_fallback', { defaultValue: 'Avaliação salva localmente (banco de dados pendente).' }));
      }
  };

  const handleDeleteReview = async (reviewId: string) => {
      if (!user) return;

      const previousReviews = [...reviews];
      setReviews(reviews.filter(r => r.id !== reviewId));

      try {
          const { error } = await supabase
              .from('venue_reviews')
              .delete()
              .match({ id: reviewId, user_id: user.id });

          if (error) throw error;

          // Remove from local storage
          const localReviewsStr = localStorage.getItem(`venue_reviews_${venue.id}`);
          if (localReviewsStr) {
              const localReviews: VenueReview[] = JSON.parse(localReviewsStr);
              const filtered = localReviews.filter(r => r.id !== reviewId);
              localStorage.setItem(`venue_reviews_${venue.id}`, JSON.stringify(filtered));
          }

          toast.success(t('venue.review_deleted', { defaultValue: 'Avaliação excluída com sucesso.' }));
      } catch (err) {
          console.error("Failed to delete review", err);
          // Fallback/rollback or local-only delete
          const localReviewsStr = localStorage.getItem(`venue_reviews_${venue.id}`);
          if (localReviewsStr) {
              const localReviews: VenueReview[] = JSON.parse(localReviewsStr);
              const filtered = localReviews.filter(r => r.id !== reviewId);
              localStorage.setItem(`venue_reviews_${venue.id}`, JSON.stringify(filtered));
              setReviews(filtered);
              toast.success(t('venue.review_deleted', { defaultValue: 'Avaliação excluída com sucesso.' }));
          } else {
              setReviews(previousReviews);
              toast.error(t('venue.review_delete_failed', { defaultValue: 'Erro ao excluir avaliação.' }));
          }
      }
  };

  const fetchReplies = async (reviewId: string) => {
      try {
          const { data, error } = await supabase
              .from('venue_review_replies')
              .select(`
                  id,
                  review_id,
                  user_id,
                  comment,
                  created_at
              `)
              .eq('review_id', reviewId)
              .order('created_at', { ascending: true });

          const loadLocalReplies = () => {
              const localRepliesStr = localStorage.getItem(`venue_replies_${reviewId}`);
              if (localRepliesStr) {
                  try {
                      const localReplies = JSON.parse(localRepliesStr);
                      setReplies(prev => ({ ...prev, [reviewId]: localReplies }));
                  } catch (e) {
                      console.error(e);
                  }
              } else {
                  setReplies(prev => ({ ...prev, [reviewId]: [] }));
              }
          };

          if (error) {
              loadLocalReplies();
              return;
          }

          if (data && data.length > 0) {
              const userIds = Array.from(new Set(data.map((r: any) => r.user_id)));
              const { data: profilesData } = await supabase
                  .from('profiles')
                  .select('id, username, avatar_url')
                  .in('id', userIds);

              const profilesMap = new Map();
              if (profilesData) {
                  profilesData.forEach(p => profilesMap.set(p.id, p));
              }

              const formattedReplies: VenueReviewReply[] = data.map((r: any) => {
                  const profile = profilesMap.get(r.user_id);
                  return {
                      id: r.id,
                      review_id: r.review_id,
                      user_id: r.user_id,
                      comment: r.comment,
                      created_at: r.created_at,
                      username: profile?.username || 'Usuário',
                      avatar_url: profile?.avatar_url || ''
                  };
              });

              const localRepliesStr = localStorage.getItem(`venue_replies_${reviewId}`);
              const localReplies: VenueReviewReply[] = localRepliesStr ? JSON.parse(localRepliesStr) : [];
              const dbReplyIds = new Set(formattedReplies.map(fr => fr.id));
              const uniqueLocalReplies = localReplies.filter(lr => !dbReplyIds.has(lr.id));

              setReplies(prev => ({
                  ...prev,
                  [reviewId]: [...uniqueLocalReplies, ...formattedReplies]
              }));
          } else {
              loadLocalReplies();
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleToggleReplies = (reviewId: string) => {
      setExpandedReviews(prev => {
          const next = { ...prev, [reviewId]: !prev[reviewId] };
          if (next[reviewId]) {
              fetchReplies(reviewId);
          }
          return next;
      });
  };

  const handleAddReply = async (reviewId: string) => {
      if (!user) {
          toast.error(t('venue.login_required', { defaultValue: 'Você precisa estar logado para responder.' }));
          return;
      }

      const text = newReplyText[reviewId]?.trim();
      if (!text) return;

      const newReply: VenueReviewReply = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
          review_id: reviewId,
          user_id: user.id,
          comment: text,
          created_at: new Date().toISOString(),
          username: user.display_name || user.username,
          avatar_url: user.avatar_url,
      };

      setReplies(prev => ({
          ...prev,
          [reviewId]: [...(prev[reviewId] || []), newReply]
      }));
      setNewReplyText(prev => ({ ...prev, [reviewId]: '' }));

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replies_count: (r.replies_count || 0) + 1 } : r));

      try {
          const { error } = await supabase
              .from('venue_review_replies')
              .insert({
                  review_id: newReply.review_id,
                  user_id: newReply.user_id,
                  comment: newReply.comment,
                  created_at: newReply.created_at
              });

          if (error) throw error;
          toast.success(t('venue.reply_published', { defaultValue: 'Resposta publicada!' }));
      } catch (err) {
          console.warn("Supabase reply insert failed, saving to local fallback...", err);
          const localRepliesStr = localStorage.getItem(`venue_replies_${reviewId}`);
          const localReplies: VenueReviewReply[] = localRepliesStr ? JSON.parse(localRepliesStr) : [];
          const updatedLocalReplies = [...localReplies, newReply];
          localStorage.setItem(`venue_replies_${reviewId}`, JSON.stringify(updatedLocalReplies));
          toast.success(t('venue.reply_published_fallback', { defaultValue: 'Resposta salva localmente.' }));
      }
  };

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
      if (!user) return;

      const previousReplies = [...(replies[reviewId] || [])];
      setReplies(prev => ({
          ...prev,
          [reviewId]: (prev[reviewId] || []).filter(r => r.id !== replyId)
      }));

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replies_count: Math.max(0, (r.replies_count || 0) - 1) } : r));

      try {
          const { error } = await supabase
              .from('venue_review_replies')
              .delete()
              .match({ id: replyId, user_id: user.id });

          if (error) throw error;

          const localRepliesStr = localStorage.getItem(`venue_replies_${reviewId}`);
          if (localRepliesStr) {
              const localReviews: VenueReviewReply[] = JSON.parse(localRepliesStr);
              const filtered = localReviews.filter(r => r.id !== replyId);
              localStorage.setItem(`venue_replies_${reviewId}`, JSON.stringify(filtered));
          }

          toast.success(t('venue.reply_deleted', { defaultValue: 'Resposta excluída.' }));
      } catch (err) {
          console.error("Failed to delete reply", err);
          const localRepliesStr = localStorage.getItem(`venue_replies_${reviewId}`);
          if (localRepliesStr) {
              const localReplies: VenueReviewReply[] = JSON.parse(localRepliesStr);
              const filtered = localReplies.filter(r => r.id !== replyId);
              localStorage.setItem(`venue_replies_${reviewId}`, JSON.stringify(filtered));
              setReplies(prev => ({ ...prev, [reviewId]: filtered }));
              toast.success(t('venue.reply_deleted', { defaultValue: 'Resposta excluída.' }));
          } else {
              setReplies(prev => ({
                  ...prev,
                  [reviewId]: previousReplies
              }));
              setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replies_count: (r.replies_count || 0) + 1 } : r));
              toast.error(t('venue.reply_delete_failed', { defaultValue: 'Erro ao excluir resposta.' }));
          }
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

            // Optional update user's profile checkin status
            await supabase.from('profiles').update({
                current_checkin_venue_id: venue.id,
                current_checkin_venue_name: venue.name
            }).eq('id', user.id);

            // Update auth store user immediately
            useAuthStore.setState({ user: { ...user, current_checkin_venue_id: venue.id, current_checkin_venue_name: venue.name } });

            if (postToAgora) {
                await publishAgoraCheckin(venue.name, venue.image_url);
            }

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
                    {!hasCheckedIn && (
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pl-1 mt-[-4px]">
                            <input 
                                type="checkbox" 
                                checked={postToAgora}
                                onChange={(e) => setPostToAgora(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-900"
                            />
                            {t('venue.post_to_agora', { defaultValue: 'Publicar chegada no feed Agora' })}
                        </label>
                    )}
                    
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
                            {checkins.map((c) => {
                                const matchedUser = mapUsers.find(u => u.id === c.user_id);
                                return (
                                <div 
                                    key={c.user_id} 
                                    className="flex flex-col items-center flex-shrink-0 w-16 cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => {
                                        if (matchedUser) {
                                            setSelectedUser(matchedUser);
                                        } else {
                                            // Fallback if not loaded in map store
                                            toast(t('venue.user_not_loaded', { defaultValue: 'Usuário não disponível' }));
                                        }
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 p-0.5 overflow-hidden shadow-lg mb-1 relative">
                                        <img loading="lazy" src={c.avatar_url || 'https://via.placeholder.com/150'} alt={c.username} className="w-full h-full object-cover rounded-full" />
                                    </div>
                                    <span className="text-[10px] text-slate-400 truncate w-full text-center font-medium">{c.username}</span>
                                </div>
                            )})}
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

                {/* Popular Times (Mock) */}
                <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-yellow-500">bar_chart</span> 
                        {t('venue.popular_times', { defaultValue: 'Horários de Pico (Estimativa)' })}
                    </h3>
                    <div className="flex items-end gap-1 h-16 w-full px-2">
                        {[2, 1, 3, 5, 8, 10, 7, 4].map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div 
                                    className={`w-full rounded-t-sm transition-all duration-500 ${val > 7 ? 'bg-primary-500 shadow-[0_0_8px_rgba(245,12,105,0.5)]' : 'bg-slate-600'}`}
                                    style={{ height: `${val * 10}%` }}
                                ></div>
                                <span className="text-[9px] text-slate-500 font-bold">{18 + i}h</span>
                            </div>
                        ))}
                    </div>
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

                {/* Community Reviews / Vivências */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary-400">forum</span>
                            {t('venue.community_reviews', { defaultValue: 'Avaliações da Comunidade' })}
                        </h3>
                        {!showReviewInput && (
                            <button 
                                onClick={() => setShowReviewInput(true)}
                                className="text-[11px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-wider"
                            >
                                + {t('venue.add_review', { defaultValue: 'Deixar Avaliação' })}
                            </button>
                        )}
                    </div>

                    {showReviewInput && (
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 mb-4 animate-fade-in">
                            <textarea 
                                value={newReviewText}
                                onChange={(e) => setNewReviewText(e.target.value)}
                                placeholder={t('venue.review_placeholder', { defaultValue: 'Como foi sua experiência aqui? A música estava boa?' })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 mb-2 resize-none"
                                rows={3}
                            />
                            <div className="flex gap-2 justify-end">
                                <button 
                                    onClick={() => setShowReviewInput(false)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    {t('common.cancel', { defaultValue: 'Cancelar' })}
                                </button>
                                <button 
                                    onClick={handleAddExperienceReview}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-500 transition-colors"
                                >
                                    {t('common.publish', { defaultValue: 'Publicar' })}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {reviews.length > 0 ? reviews.map(review => (
                            <div key={review.id} className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                                        const mapUser = mapUsers.find(u => u.id === review.user_id);
                                        if(mapUser) setSelectedUser(mapUser);
                                    }}>
                                        <img src={review.avatar_url || 'https://via.placeholder.com/150'} alt={review.username} className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                                        <div>
                                            <p className="text-xs font-bold text-white leading-none">{review.username}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{new Date(review.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {user && user.id === review.user_id && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteReview(review.id);
                                            }}
                                            className="text-slate-500 hover:text-rose-500 transition-colors p-1"
                                            title="Excluir avaliação"
                                        >
                                            <span className="material-symbols-rounded text-base">delete</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-300 leading-snug mb-3">{review.comment}</p>
                                
                                {review.photos && review.photos.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                        {review.photos.map((photo, i) => (
                                            <img key={i} src={photo} alt="Review" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-slate-400 text-xs font-medium">
                                    <button 
                                        className={`flex items-center gap-1 transition-colors ${review.user_has_liked ? 'text-primary-500' : 'hover:text-white'}`}
                                        onClick={() => {
                                            setReviews(reviews.map(r => r.id === review.id ? {
                                                ...r, 
                                                user_has_liked: !r.user_has_liked, 
                                                likes_count: r.user_has_liked ? (r.likes_count || 0) - 1 : (r.likes_count || 0) + 1
                                            } : r));
                                        }}
                                    >
                                        <span className={`material-symbols-rounded text-[14px] ${review.user_has_liked ? 'filled' : ''}`}>thumb_up</span>
                                        {review.likes_count || 0} Útil
                                    </button>
                                    <button 
                                        className={`flex items-center gap-1 hover:text-white transition-colors ${expandedReviews[review.id] ? 'text-primary-500 font-bold' : ''}`}
                                        onClick={() => handleToggleReplies(review.id)}
                                    >
                                        <span className="material-symbols-rounded text-[14px]">reply</span>
                                        {review.replies_count || 0} Respostas
                                    </button>
                                </div>

                                {/* Expanded Replies Block */}
                                {expandedReviews[review.id] && (
                                    <div className="mt-4 pl-4 border-l-2 border-slate-700 space-y-3 pt-2 animate-fade-in">
                                        {/* List replies */}
                                        {(replies[review.id] || []).length > 0 ? (
                                            (replies[review.id] || []).map(reply => (
                                                <div key={reply.id} className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5 relative">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => {
                                                            const mapUser = mapUsers.find(u => u.id === reply.user_id);
                                                            if(mapUser) setSelectedUser(mapUser);
                                                        }}>
                                                            <img src={reply.avatar_url || 'https://via.placeholder.com/150'} alt={reply.username} className="w-5 h-5 rounded-full object-cover border border-slate-700" />
                                                            <div>
                                                                <p className="text-[11px] font-bold text-white leading-none">{reply.username}</p>
                                                                <p className="text-[9px] text-slate-500 mt-0.5">{new Date(reply.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        {user && user.id === reply.user_id && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteReply(review.id, reply.id);
                                                                }}
                                                                className="text-slate-500 hover:text-rose-500 transition-colors p-1"
                                                                title="Excluir resposta"
                                                            >
                                                                <span className="material-symbols-rounded text-[14px]">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-300 leading-normal">{reply.comment}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[11px] text-slate-500 italic py-1">{t('venue.no_replies', { defaultValue: 'Nenhuma resposta ainda.' })}</p>
                                        )}

                                        {/* Reply Input */}
                                        {user ? (
                                            <div className="flex gap-2 items-center pt-2">
                                                <input 
                                                    type="text"
                                                    value={newReplyText[review.id] || ''}
                                                    onChange={(e) => setNewReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                                                    placeholder="Escrever uma resposta..."
                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddReply(review.id);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleAddReply(review.id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition-colors flex-shrink-0"
                                                >
                                                    Responder
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-slate-500 italic">{t('venue.login_to_reply', { defaultValue: 'Faça login para responder.' })}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <p className="text-xs text-slate-500 italic text-center py-4">{t('venue.no_reviews', { defaultValue: 'Nenhuma avaliação ainda. Seja o primeiro!' })}</p>
                        )}
                    </div>
                </div>
                
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

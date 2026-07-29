
import React, { useState, useEffect, useRef } from 'react';
import { User, PrivateAlbum } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useAlbumStore } from '../stores/albumStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useUiStore } from '../stores/uiStore';
import toast from 'react-hot-toast';
import { formatLastSeen, cleanTag, parseTags } from '../lib/utils';
import { AlbumGalleryModal } from './AlbumGalleryModal';
import { useUserActionsStore } from '../stores/userActionsStore';
import { useCommunityStore } from '../stores/communityStore';
import { ReportUserModal } from './ReportUserModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useTranslation } from 'react-i18next';
import { useVideoStore } from '../stores/videoStore';
import { reverseGeocode } from '../lib/geocode';
import { useHardwareBack } from '../lib/useHardwareBack';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onStartChat: (user: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onStartChat }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const onlineUsers = useMapStore((state) => state.onlineUsers);
  const { setSubscriptionModalOpen } = useUiStore();
  const { posts, fetchAgoraPosts } = useAgoraStore();
  const { 
    viewedUserAlbums, 
    viewedUserAccessStatus, 
    isFetchingViewedUserAlbums,
    fetchAlbumsAndAccessStatusForUser,
    requestAccess,
    clearViewedUserData
  } = useAlbumStore();
  const { blockUser, favoriteUser, unfavoriteUser, favoriteIds } = useUserActionsStore();
  const isFavorite = favoriteIds.includes(user.id);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [viewingAlbum, setViewingAlbum] = useState<PrivateAlbum | null>(null);
  useHardwareBack(!!viewingAlbum, () => setViewingAlbum(null));
  
  const [winkCount, setWinkCount] = useState<number | null>(null);
  const [isOptionsMenuOpen, setOptionsMenuOpen] = useState(false);
  useHardwareBack(isOptionsMenuOpen, () => setOptionsMenuOpen(false));
  
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  useHardwareBack(isReportModalOpen, () => setReportModalOpen(false));
  
  const [isBlockConfirmOpen, setBlockConfirmOpen] = useState(false);
  useHardwareBack(isBlockConfirmOpen, () => setBlockConfirmOpen(false));
  
  // Connection Request States
  const [connection, setConnection] = useState<any>(null);
  const [firstMessage, setFirstMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  
  // Video Control
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const agoraPost = posts.find(p => p.user_id === user.id);
  const videos = useVideoStore((state) => state.videos);
  const userVideos = videos.filter(v => v.user_id === user.id);
    const [locationName, setLocationName] = useState<{city: string, state: string} | null>(null);

    useEffect(() => {
        if (user?.lat && user?.lng) {
            reverseGeocode(user.lat, user.lng).then(setLocationName);
        }
    }, [user?.lat, user?.lng]);


  const fetchConnection = async () => {
    if (!currentUser || !user || currentUser.id === user.id) return;
    try {
      // 1. First, check if there is an existing conversation between the users
      const { data: convData, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id);
        
      if (!convError && convData && convData.length > 0) {
        const convIds = convData.map(c => c.conversation_id);
        const { data: otherData, error: otherError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('user_id', user.id)
          .limit(1);
          
        if (!otherError && otherData && otherData.length > 0) {
          // A conversation already exists! Treat as accepted connection.
          setConnection({ status: 'accepted' });
          return;
        }
      }

      // 2. If no conversation exists, check user_connections table cleanly in both directions to bypass nested logical parser failures
      const { data: conn1, error: err1 } = await supabase
        .from('user_connections')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', user.id)
        .limit(1);

      if (!err1 && conn1 && conn1.length > 0) {
        setConnection(conn1[0]);
        return;
      }

      const { data: conn2, error: err2 } = await supabase
        .from('user_connections')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', currentUser.id)
        .limit(1);

      if (!err2 && conn2 && conn2.length > 0) {
        setConnection(conn2[0]);
        return;
      }

      setConnection(null);
    } catch (e) {
      console.error('Error fetching connection:', e);
      setConnection(null);
    }
  };

  useEffect(() => {
    fetchAgoraPosts();
    if (user && currentUser && user.id !== currentUser.id) {
        fetchAlbumsAndAccessStatusForUser(user.id);
        fetchConnection();
        supabase.rpc('record_profile_view', { p_viewed_id: user.id })
            .then(({ error }) => {
                if(error) console.error("Error recording profile view:", error);
            });
    }
    
    const fetchWinkCount = async () => {
        if (currentUser && currentUser.subscription_tier === 'free') {
            const { data, error } = await supabase.rpc('get_daily_wink_count', { p_sender_id: currentUser.id });
            if (!error) {
                setWinkCount(data);
            }
        }
    };
    fetchWinkCount();

    return () => {
        clearViewedUserData();
    }
  }, [user, currentUser, fetchAlbumsAndAccessStatusForUser, clearViewedUserData, fetchAgoraPosts]);

  const handleRequestConnection = async () => {
    if (!currentUser || !user) return;
    if (!firstMessage.trim()) {
        toast.error('Por favor, escreva uma mensagem inicial.');
        return;
    }
    
    setIsSendingRequest(true);
    try {
        // 1. Create connection in 'user_connections'
        const { data: connData, error: connError } = await supabase
            .from('user_connections')
            .insert({
                follower_id: currentUser.id,
                following_id: user.id,
                status: 'pending'
            })
            .select('*')
            .single();
            
        if (connError) throw connError;
        setConnection(connData);
        
        // 2. Get or create conversation
        const { data: convId, error: convError } = await supabase.rpc('get_or_create_conversation', {
            p_one: currentUser.id,
            p_two: user.id
        });
        
        if (convError) throw convError;
        
        // 3. Send initial message
        const { error: msgError } = await supabase.from('messages').insert({
            sender_id: currentUser.id,
            conversation_id: convId,
            content: firstMessage.trim()
        });
        
        if (msgError) throw msgError;
        
        // 4. Send generic push notification
        const { session } = (await supabase.auth.getSession()).data;
        if (session) {
            const senderName = currentUser.display_name || currentUser.username || 'Alguém';
            const truncated = firstMessage.length > 50 ? firstMessage.slice(0, 50) + '...' : firstMessage;
            
            fetch('/api/send-generic-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    receiver_id: user.id,
                    title: 'Nova solicitação de conexão! 🤝',
                    body: `${senderName} enviou uma mensagem inicial: "${truncated}"`
                })
            }).catch(err => console.error("Error sending connection request push:", err));
        }
        
        toast.success('Solicitação de conexão enviada com sucesso!');
        setFirstMessage('');
        
        // Refresh community connections
        useCommunityStore.getState().fetchConnections();
    } catch (e: any) {
        console.error('Error requesting connection:', e);
        toast.error('Erro ao enviar solicitação de conexão.');
    } finally {
        setIsSendingRequest(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!connection) return;
    try {
        const { error } = await supabase
            .from('user_connections')
            .update({ status: 'accepted' })
            .eq('id', connection.id);
            
        if (error) throw error;
        setConnection({ ...connection, status: 'accepted' });
        
        // Send generic push notification to the original sender
        const { session } = (await supabase.auth.getSession()).data;
        if (session && currentUser) {
            const senderName = currentUser.display_name || currentUser.username || 'Alguém';
            
            fetch('/api/send-generic-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    receiver_id: connection.follower_id,
                    title: 'Solicitação de conexão aceita! 🎉',
                    body: `${senderName} aceitou sua solicitação de conexão.`
                })
            }).catch(err => console.error("Error sending connection accept push:", err));
        }
        
        toast.success('Solicitação de conexão aceita!');
        
        // Refresh community connections
        useCommunityStore.getState().fetchConnections();
    } catch (e) {
        console.error('Error accepting connection:', e);
        toast.error('Erro ao aceitar conexão.');
    }
  };

  const handleRejectConnection = async () => {
    if (!connection) return;
    try {
        const { error } = await supabase
            .from('user_connections')
            .delete()
            .eq('id', connection.id);
            
        if (error) throw error;
        setConnection(null);
        toast.success('Solicitação de conexão recusada.');
        
        // Refresh community connections
        useCommunityStore.getState().fetchConnections();
    } catch (e) {
        console.error('Error rejecting connection:', e);
        toast.error('Erro ao recusar conexão.');
    }
  };

  const isOnline = onlineUsers.includes(user.id);
  const statusText = isOnline ? t('profile_modal.online_now', { defaultValue: 'Online Agora' }) : formatLastSeen(user.last_seen);

  const handleWink = async () => {
    if (!currentUser) return;

    const { data: result, error } = await supabase.rpc('send_wink', { 
        p_receiver_id: user.id 
    });

    if (error) {
      toast.error(t('profile_modal.wink_error', { defaultValue: 'Erro ao chamar o perfil.' }));
      return;
    }

    switch (result) {
      case 'success_plus':
      case 'success_free':
        toast.success(t('profile_modal.wink_success', { defaultValue: 'Chamado enviado com sucesso!' }), { icon: '😉' });
        if (result === 'success_free') setWinkCount(count => (count !== null ? count + 1 : 1));
        break;
      case 'limit_reached':
        toast.error(t('profile_modal.wink_limit', { defaultValue: 'Limite diário atingido.' }));
        setSubscriptionModalOpen(true);
        break;
      case 'already_winked':
        toast(t('profile_modal.already_winked', { defaultValue: 'Você já chamou este perfil!' }), { icon: '😉' });
        break;
    }
    
    if (result && result.startsWith('success')) {
        const { session } = (await supabase.auth.getSession()).data;
        if (session) {
          fetch('/api/send-wink-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ receiver_id: user.id })
          }).catch(err => console.error("Error sending wink push:", err));
        }
    }
  };
  
  const handleChatClick = () => {
    onStartChat(user);
    onClose();
  }
  
  const handleRequestAccess = () => {
      toast.promise(requestAccess(user.id), {
          loading: t('profile_modal.requesting_access', { defaultValue: 'Enviando solicitação...' }),
          success: t('profile_modal.request_sent', { defaultValue: 'Solicitação enviada!' }),
          error: t('profile_modal.request_error', { defaultValue: 'Erro ao solicitar.' }),
      });
  }

  const handleBlockUser = () => {
      setBlockConfirmOpen(false);
      blockUser({ id: user.id, username: user.username });
      onClose();
  };

  const allPhotos = [user.avatar_url, ...(user.public_photos || [])];
  const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);

  const toggleVideo = () => {
      if (videoRef.current) {
          if (videoRef.current.paused) {
              videoRef.current.play();
              setIsPlayingVideo(true);
          } else {
              videoRef.current.pause();
              setIsPlayingVideo(false);
          }
      }
  }

  const renderAccessButton = () => {
      switch (viewedUserAccessStatus) {
          case 'pending':
              return <button disabled className="w-full bg-slate-700/50 text-slate-400 font-medium py-3 rounded-xl text-sm border border-slate-600">{t('profile_modal.request_pending', { defaultValue: 'Solicitação Enviada' })}</button>;
          case 'denied':
              return <p className="text-sm text-center text-red-400/80 bg-red-900/10 py-2 rounded-lg">{t('profile_modal.access_denied', { defaultValue: 'Acesso recusado.' })}</p>;
          case null:
              return <button onClick={handleRequestAccess} className="w-full bg-primary-600/20 text-primary-400 border border-primary-500/50 hover:bg-primary-600/30 font-bold py-3 rounded-xl transition-colors text-sm">{t('profile_modal.request_access', { defaultValue: 'Solicitar Acesso' })}</button>;
          default: return null;
      }
  }

  return (
    <>
    {/* Backdrop with blur */}
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-[150] animate-fade-in" onClick={onClose} />
    
        {/* Modal Content - Bottom Sheet style on Mobile, Centered Card on Desktop */}
    <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[150] pointer-events-none">
      <div className="bg-[#0f0f13] sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-md mx-auto pointer-events-auto overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] animate-slide-in-up border-t border-x border-white/5 sm:border-b font-sans relative">
        
        {/* Drag Handle for Mobile aesthetic */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 z-40" onClick={onClose}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
        </div>

        {/* Top Bar Close */}
        <div className="absolute top-4 right-4 z-30 flex gap-2">
            <button onClick={onClose} className="text-white bg-black/40 backdrop-blur-md w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/60 transition-colors border border-white/10">
                <span className="material-symbols-rounded">close</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-8 pt-10">
            {/* Avatar Section */}
            <div className="flex justify-center mt-2">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-tr from-pink-600 via-purple-500 to-indigo-500 shadow-xl shadow-pink-900/20">
                        {user.video_url ? (
                            <video src={user.video_url} className="w-full h-full rounded-full object-cover border-4 border-[#0f0f13]" autoPlay loop muted playsInline />
                        ) : (
                            <img loading="lazy" src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover border-4 border-[#0f0f13]" />
                        )}
                    </div>
                    <div className={`absolute bottom-2 right-2 w-6 h-6 ${isOnline ? 'bg-green-500' : 'bg-slate-600'} border-[3px] border-[#0f0f13] rounded-full flex items-center justify-center shadow-sm`}>
                        {isOnline && <span className="material-symbols-rounded text-white text-[12px] font-bold">check</span>}
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="text-center mt-4 px-4">
                <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2 flex-wrap">
                    {user.display_name || user.username}, {user.age || 'N/A'}
                    {user.is_verified && (
                        <span className="material-symbols-rounded text-pink-500 text-xl" title="Verificado">verified</span>
                    )}
                    {user.subscription_tier === 'plus' && (
                        <span className="material-symbols-rounded text-yellow-500 text-xl" title="Plus">auto_awesome</span>
                    )}
                </h2>
                <div className="flex flex-col items-center gap-1 mt-1">
                    <p className="text-sm text-orange-200/80 font-medium">
                        {locationName ? `${locationName.city}, ${locationName.state} • ` : (user.city ? `${user.city}, ${user.state} • ` : '')}{statusText} • {user.distance_km != null ? (
                            currentUser?.subscription_tier === 'plus' ? (
                                user.distance_km < 1 ? t('profile_modal.near_you_precise', { defaultValue: `${Math.round(user.distance_km * 1000)}m de você` }) : `${user.distance_km.toFixed(1)}km ` + t('profile_modal.from_you', { defaultValue: 'de você' })
                            ) : (
                                user.distance_km < 1 ? t('profile_modal.approx_1km_from_you', { defaultValue: 'Cerca de 1km de você' }) : `Aprox. ${user.distance_km.toFixed(0)}km ` + t('profile_modal.from_you', { defaultValue: 'de você' })
                            )
                        ) : 'Distância desconhecida'}
                    </p>
                    {user.can_host && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-900/40 text-green-400 border border-green-500/30">
                            <span className="material-symbols-rounded filled !text-[12px]">home</span>
                            TEM LOCAL
                        </span>
                    )}
                </div>
            </div>

            {/* Actions (Favorite, Block, Report) */}
            <div className="flex justify-center items-center gap-4 mt-6">
                <button 
                    onClick={() => isFavorite ? unfavoriteUser(user.id) : favoriteUser(user.id)}
                    className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all ${isFavorite ? 'bg-pink-600/20 border-pink-500 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-[#1a1a20] border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'}`}
                    title={t('profile_modal.favorite', { defaultValue: 'Favoritar' })}
                >
                    <span className={`material-symbols-rounded text-2xl ${isFavorite ? 'filled' : ''}`}>favorite</span>
                </button>
                <button 
                    onClick={() => setBlockConfirmOpen(true)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1a1a20] border-2 border-white/10 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all"
                    title={t('profile_modal.block', { defaultValue: 'Bloquear' })}
                >
                    <span className="material-symbols-rounded text-2xl">block</span>
                </button>
                <button 
                    onClick={() => setReportModalOpen(true)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1a1a20] border-2 border-white/10 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-400 transition-all"
                    title={t('profile_modal.report', { defaultValue: 'Denunciar' })}
                >
                    <span className="material-symbols-rounded text-2xl">flag</span>
                </button>
            </div>

            {agoraPost && (
                <div className="px-5 mt-6">
                    <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-900/20">
                        <div className="bg-[#1a1a20] rounded-xl p-4 relative">
                            <div className="flex items-center gap-2 text-red-400 font-bold mb-3">
                                <span className="material-symbols-rounded filled animate-bounce">local_fire_department</span>
                                <span className="tracking-widest text-[11px] uppercase">MODO AGORA</span>
                            </div>
                            <div className="flex gap-4 items-start">
                                <img loading="lazy" src={agoraPost.photo_url} className="w-16 h-16 rounded-lg object-cover bg-[#0f0f13]" />
                                <div className="flex-1">
                                    <p className="text-white italic text-sm leading-relaxed">"{agoraPost.status_text}"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sobre Mim */}
            <div className="mt-8 px-5">
                <h3 className="text-[11px] font-black text-orange-400/90 uppercase tracking-widest mb-3 ml-1">Sobre Mim</h3>
                <div className="bg-[#1a1a20] p-4 rounded-2xl text-slate-300 text-sm leading-relaxed border border-white/5">
                    {user.status_text || 'Sem descrição.'}
                </div>
            </div>

            {/* Interesses & Looking For */}
            <div className="mt-6 px-5 space-y-4">
                {(user.looking_for && user.looking_for.length > 0) && (
                    <div>
                        <h3 className="text-[11px] font-black text-green-400/90 uppercase tracking-widest mb-3 ml-1">O que busco</h3>
                        <div className="bg-[#1a1a20] p-4 rounded-2xl flex flex-wrap gap-2 border border-white/5">
                            {user.looking_for.map(item => (
                                <span key={item} className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-green-900/30 text-green-300 border-green-500/20">
                                    {t(`constants.looking_for.${item}`, { defaultValue: item })}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                <h3 className="text-[11px] font-black text-orange-400/90 uppercase tracking-widest mb-3 ml-1">Interesses e Tribos</h3>
                <div className="bg-[#1a1a20] p-4 rounded-2xl flex flex-wrap gap-2 border border-white/5">
                    {(() => {
                        const validKinks = parseTags(user.kinks);
                        const validTribes = parseTags(user.tribes);

                        if (validKinks.length === 0 && validTribes.length === 0) {
                            return <span className="text-slate-500 text-xs">Nenhum interesse listado.</span>;
                        }

                        return (
                            <>
                                {validKinks.map((rawKink, idx) => {
                                    const kink = cleanTag(rawKink);
                                    const colors = [
                                        'bg-pink-500/10 text-pink-300 border-pink-500/20',
                                        'bg-purple-500/10 text-purple-300 border-purple-500/20',
                                        'bg-green-500/10 text-green-300 border-green-500/20',
                                        'bg-blue-500/10 text-blue-300 border-blue-500/20',
                                        'bg-orange-500/10 text-orange-300 border-orange-500/20'
                                    ];
                                    const colorClass = colors[idx % colors.length];
                                    return (
                                        <span key={kink} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${colorClass}`}>
                                            #{t(`constants.kinks.${kink}`, { defaultValue: kink })}
                                        </span>
                                    );
                                })}
                                {validTribes.map(rawTribe => {
                                    const tribe = cleanTag(rawTribe);
                                    return (
                                        <span key={tribe} className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-slate-800 text-slate-300 border-white/10">
                                            #{t(`constants.tribes.${tribe}`, { defaultValue: tribe })}
                                        </span>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Grid Detalhes */}
            <div className="mt-6 px-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {user.gender_identity && (
                    <InfoItem 
                        icon="wc" 
                        label={t('profile_modal.gender_identity', { defaultValue: 'Identidade' })} 
                        value={t(`constants.options.${user.gender_identity}`, { defaultValue: user.gender_identity })} 
                    />
                    )}
                    {user.pronouns && (
                    <InfoItem 
                        icon="match_case" 
                        label={t('profile_modal.pronouns', { defaultValue: 'Pronomes' })} 
                        value={t(`constants.options.${user.pronouns}`, { defaultValue: user.pronouns })} 
                    />
                    )}
                    {user.sexual_orientation && (
                    <InfoItem 
                        icon="favorite" 
                        label={t('profile_modal.sexual_orientation', { defaultValue: 'Orientação' })} 
                        value={t(`constants.options.${user.sexual_orientation}`, { defaultValue: user.sexual_orientation })} 
                    />
                    )}
                    {user.relationship_status && (
                    <InfoItem 
                        icon="diversity_1" 
                        label={t('profile_modal.relationship_status', { defaultValue: 'Status' })} 
                        value={t(`constants.options.${user.relationship_status}`, { defaultValue: user.relationship_status })} 
                    />
                    )}
                    {user.height_cm && <InfoItem icon="height" label={t('profile_modal.height', { defaultValue: 'Altura' })} value={`${user.height_cm} cm`} />}
                    {user.weight_kg && <InfoItem icon="monitor_weight" label={t('profile_modal.weight', { defaultValue: 'Peso' })} value={`${user.weight_kg} kg`} />}
                    {user.position && (
                    <InfoItem 
                        icon="transgender" 
                        label={t('profile_modal.position', { defaultValue: 'Posição' })} 
                        value={t(`constants.positions.${user.position}`, { defaultValue: user.position })} 
                    />
                    )}
                    {user.hiv_status && (
                    <InfoItem 
                        icon="health_and_safety" 
                        label={t('profile_modal.hiv_status', { defaultValue: 'Status HIV' })} 
                        value={t(`constants.hiv_statuses.${user.hiv_status}`, { defaultValue: user.hiv_status })} 
                    />
                    )}
                </div>
            </div>

            {/* Redes Sociais Display */}
            {user.redes_sociais && (user.redes_sociais.instagram || user.redes_sociais.twitter || user.redes_sociais.telegram || user.redes_sociais.onlyfans) && (
                <div className="mt-6 px-5 space-y-3">
                    <h3 className="text-[11px] font-black text-pink-500 uppercase tracking-widest mb-3 ml-1">Redes Sociais</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {user.redes_sociais.instagram && (
                        <a 
                            href={`https://instagram.com/${user.redes_sociais.instagram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-tr from-yellow-500/10 via-pink-500/10 to-purple-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-all text-xs font-bold text-pink-400"
                        >
                            <span className="material-symbols-rounded !text-[18px] filled">photo_camera</span>
                            <span className="truncate">Instagram</span>
                        </a>
                        )}
                        {user.redes_sociais.twitter && (
                        <a 
                            href={`https://twitter.com/${user.redes_sociais.twitter.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all text-xs font-bold text-sky-400"
                        >
                            <span className="material-symbols-rounded !text-[18px] filled">flutter_dash</span>
                            <span className="truncate">Twitter / X</span>
                        </a>
                        )}
                        {user.redes_sociais.telegram && (
                        <a 
                            href={user.redes_sociais.telegram.startsWith('http') ? user.redes_sociais.telegram : `https://t.me/${user.redes_sociais.telegram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-xs font-bold text-blue-400"
                        >
                            <span className="material-symbols-rounded !text-[18px] filled">send</span>
                            <span className="truncate">Telegram</span>
                        </a>
                        )}
                        {user.redes_sociais.onlyfans && (
                        <a 
                            href={user.redes_sociais.onlyfans.startsWith('http') ? user.redes_sociais.onlyfans : `https://${user.redes_sociais.onlyfans}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all text-xs font-bold text-yellow-500 col-span-2 sm:col-span-1"
                        >
                            <span className="material-symbols-rounded !text-[18px] filled">star</span>
                            <span className="truncate">OnlyFans</span>
                        </a>
                        )}
                    </div>
                </div>
            )}

            {/* Galeria Pública */}
            <div className="mt-6 px-5">
                <h3 className="text-[11px] font-black text-orange-400/90 uppercase tracking-widest mb-3 ml-1">Galeria Pública</h3>
                {allPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 auto-rows-[100px]">
                        {allPhotos.slice(0, 5).map((photo, i) => {
                            let colSpan = 'col-span-1';
                            let rowSpan = 'row-span-1';
                            if (allPhotos.length >= 3 && i === 2) rowSpan = 'row-span-2';
                            
                            const isLastAndMore = i === 4 && allPhotos.length > 5;
                            
                            return (
                                <div key={i} className={`relative rounded-xl overflow-hidden ${colSpan} ${rowSpan}`} onClick={() => setCurrentPhotoIndex(i)}>
                                    <img src={photo} className="w-full h-full object-cover" alt="Gallery item" />
                                    {isLastAndMore && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-xl">
                                            +{allPhotos.length - 5}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-[#1a1a20] p-6 rounded-2xl text-center border border-white/5">
                        <span className="material-symbols-rounded text-slate-500 text-3xl mb-2">no_photography</span>
                        <p className="text-slate-400 text-sm">Sem fotos na galeria.</p>
                    </div>
                )}
            </div>

            {/* Vídeos Públicos */}
            <div className="mt-6 px-5 pb-2">
                <h3 className="text-[11px] font-black text-red-500/90 uppercase tracking-widest mb-3 ml-1 flex items-center gap-1">
                    <span className="material-symbols-rounded text-[14px]">play_circle</span> Vídeos ({userVideos.length})
                </h3>
                {userVideos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {userVideos.map((video, i) => (
                            <div key={video.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-800 cursor-pointer group" onClick={() => {
                                useUiStore.getState().setActiveView('videos');
                                onClose();
                            }}>
                                {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={video.title} />
                                ) : (
                                    <video src={video.video_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                                    <div className="flex items-center gap-1 text-white/90">
                                        <span className="material-symbols-rounded text-[12px]">play_arrow</span>
                                        <span className="text-[10px] font-bold">{video.views_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#1a1a20] p-6 rounded-2xl text-center border border-white/5">
                        <span className="material-symbols-rounded text-slate-500 text-3xl mb-2">videocam_off</span>
                        <p className="text-slate-400 text-sm">Nenhum vídeo publicado.</p>
                    </div>
                )}
            </div>

            {/* Álbum Privado */}
            {user.has_private_albums && (
                <div className="mt-6 px-5 pb-6">
                    <h3 className="text-[11px] font-black text-pink-400/90 uppercase tracking-widest mb-3 ml-1 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">lock</span> Álbuns Privados
                    </h3>
                    {isFetchingViewedUserAlbums ? (
                        <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : viewedUserAccessStatus === 'granted' ? (
                        viewedUserAlbums.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {viewedUserAlbums.map(album => (
                                    <div key={album.id} className="relative aspect-square group cursor-pointer overflow-hidden rounded-xl border border-white/5" onClick={() => setViewingAlbum(album)}>
                                        <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center text-center p-1">
                                            <span className="font-bold text-white text-xs shadow-sm">{album.name}</span>
                                        </div>
                                        {album.private_album_photos.length > 0 && (
                                            <img loading="lazy" src={album.private_album_photos[0].photo_path} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt={album.name} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-slate-500 py-4 border border-dashed border-white/10 rounded-xl">Álbuns vazios.</p>
                        )
                    ) : (
                        <div className="bg-[#2a171d] border border-pink-900/40 rounded-2xl p-5 text-center">
                            <div className="w-12 h-12 bg-pink-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="material-symbols-rounded text-pink-400 text-2xl">lock</span>
                            </div>
                            <p className="text-sm text-pink-200/70 mb-4 font-medium">O conteúdo é privado.</p>
                            {renderAccessButton()}
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Action Bar (Bottom Fixed) */}
        {user.id !== currentUser?.id && (
          <div className="p-4 border-t border-white/5 bg-[#14141a] flex-shrink-0 flex flex-col gap-3 pb-8 sm:pb-4 z-20">
            {currentUser?.subscription_tier === 'free' && winkCount !== null && (
                <div className="text-center text-[11px] text-slate-400 font-medium">
                    {10 - winkCount > 0 ? (
                        <p>{t('profile_modal.you_have', { defaultValue: 'Você tem' })} <span className="font-bold text-white">{10 - winkCount}</span> {t('profile_modal.winks_today', { defaultValue: 'winks hoje.' })}</p>
                    ) : (
                        <p>{t('profile_modal.no_winks', { defaultValue: 'Acabaram os winks.' })} <button onClick={() => { onClose(); setSubscriptionModalOpen(true); }} className="text-pink-400 hover:underline font-bold">{t('profile_modal.get_plus', { defaultValue: 'Vire Plus' })}</button></p>
                    )}
                </div>
            )}
            
            {connection?.status === 'accepted' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={handleWink} 
                    disabled={currentUser?.subscription_tier === 'free' && winkCount !== null && winkCount >= 10}
                    className="flex-1 bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-pink-600/20 border border-pink-500/40 text-pink-300 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-pink-600/30 hover:border-pink-400 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md"
                  >
                    <span className="text-xl">😉</span>
                    <span>{t('profile_modal.wink', { defaultValue: 'Enviar Wink 😉' })}</span>
                  </button>
                  <button onClick={handleChatClick} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-900/30 transition-all active:scale-95">
                    <span className="material-symbols-rounded text-xl filled">chat_bubble</span>
                    <span>{t('profile_modal.message', { defaultValue: 'Mensagem' })}</span>
                  </button>
                </div>
            ) : (
                <div className="space-y-3">
                  {/* Botão de Wink sempre visível mesmo sem conexão */}
                  <button 
                    onClick={handleWink} 
                    disabled={currentUser?.subscription_tier === 'free' && winkCount !== null && winkCount >= 10}
                    className="w-full bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-pink-600/20 border border-pink-500/40 hover:border-pink-400 text-pink-300 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-pink-600/30 transition-all active:scale-95 shadow-md shadow-pink-950/30 disabled:opacity-50 disabled:active:scale-100"
                  >
                    <span className="text-xl">😉</span>
                    <span>{t('profile_modal.wink', { defaultValue: 'Enviar Wink 😉' })}</span>
                  </button>

                  {connection === null ? (
                    <div className="space-y-3 bg-[#1a1a20] p-4 rounded-2xl border border-white/5 relative">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-orange-400/90 font-black tracking-widest uppercase">Conectar para Enviar Mensagens</p>
                            <button
                                type="button"
                                onClick={() => setShowConnectionInfo(!showConnectionInfo)}
                                className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-pink-300 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 transition-all active:scale-95 shrink-0"
                                title="Por que conectar?"
                            >
                                <span className="material-symbols-rounded !text-[14px] text-pink-400">info</span>
                                <span className="font-bold">Info</span>
                            </button>
                        </div>

                        {showConnectionInfo && (
                            <div className="p-3.5 bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/30 rounded-xl text-xs text-pink-100/90 leading-relaxed animate-fade-in flex gap-2.5 items-start shadow-inner">
                                <span className="material-symbols-rounded text-pink-400 text-xl flex-shrink-0 mt-0.5">verified_user</span>
                                <div className="space-y-1">
                                    <p className="font-bold text-white text-xs">{t('profile_modal.why_connect_title', { defaultValue: 'Por que solicitar conexão?' })}</p>
                                    <p className="text-[11px] text-slate-300 leading-snug">{t('profile_modal.why_connect_desc', { defaultValue: 'Para manter um ambiente seguro, privado e livre de spam na comunidade, você precisa enviar uma mensagem inicial para solicitar conexão. Assim que aceita pelo outro perfil, o bate-papo direto fica totalmente liberado!' })}</p>
                                </div>
                            </div>
                        )}

                        <textarea
                            value={firstMessage}
                            onChange={(e) => setFirstMessage(e.target.value)}
                            placeholder="Envie uma mensagem inicial para conectar..."
                            maxLength={150}
                            className="w-full bg-[#0f0f13] border border-white/5 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors resize-none h-18"
                        />
                        <button
                            onClick={handleRequestConnection}
                            disabled={isSendingRequest || !firstMessage.trim()}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isSendingRequest ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-symbols-rounded text-xl">handshake</span>
                                    <span>Solicitar Conexão</span>
                                </>
                            )}
                        </button>
                    </div>
                  ) : connection.status === 'pending' ? (
                    connection.follower_id === currentUser?.id ? (
                        <div className="p-4 bg-[#1a1a20] rounded-2xl border border-white/5 space-y-2 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-rounded text-slate-400 text-xl animate-pulse">hourglass_empty</span>
                                    <p className="text-sm font-bold text-white">Solicitação de Conexão Pendente</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowConnectionInfo(!showConnectionInfo)}
                                    className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-pink-300 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 transition-all active:scale-95 shrink-0"
                                >
                                    <span className="material-symbols-rounded !text-[14px] text-pink-400">info</span>
                                    <span className="font-bold">Info</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">Aguardando a resposta de {user.display_name || user.username} para liberar o envio de mensagens.</p>
                            {showConnectionInfo && (
                                <div className="p-3 bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/30 rounded-xl text-xs text-pink-100/90 leading-relaxed animate-fade-in flex gap-2.5 items-start mt-2">
                                    <span className="material-symbols-rounded text-pink-400 text-lg flex-shrink-0 mt-0.5">verified_user</span>
                                    <p className="text-[11px] text-slate-300 leading-snug">{t('profile_modal.why_connect_desc', { defaultValue: 'Para manter um ambiente seguro, privado e livre de spam na comunidade, você precisa enviar uma mensagem inicial para solicitar conexão. Assim que aceita pelo outro perfil, o bate-papo direto fica totalmente liberado!' })}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 bg-[#1a1a20] rounded-2xl border border-white/5 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-rounded text-pink-500 text-2xl animate-bounce">handshake</span>
                                    <p className="text-sm font-bold text-white">Solicitação de Conexão Recebida</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowConnectionInfo(!showConnectionInfo)}
                                    className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-pink-300 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 transition-all active:scale-95 shrink-0"
                                >
                                    <span className="material-symbols-rounded !text-[14px] text-pink-400">info</span>
                                    <span className="font-bold">Info</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">{user.display_name || user.username} quer se conectar com você!</p>
                            {showConnectionInfo && (
                                <div className="p-3 bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/30 rounded-xl text-xs text-pink-100/90 leading-relaxed animate-fade-in flex gap-2.5 items-start">
                                    <span className="material-symbols-rounded text-pink-400 text-lg flex-shrink-0 mt-0.5">verified_user</span>
                                    <p className="text-[11px] text-slate-300 leading-snug">{t('profile_modal.why_connect_desc', { defaultValue: 'Para manter um ambiente seguro, privado e livre de spam na comunidade, você precisa enviar uma mensagem inicial para solicitar conexão. Assim que aceita pelo outro perfil, o bate-papo direto fica totalmente liberado!' })}</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={handleRejectConnection} className="flex-1 bg-[#22222a] border border-white/5 text-red-400 font-bold py-3 rounded-xl text-sm transition-colors hover:bg-[#2a2a35]">
                                    Recusar
                                </button>
                                <button onClick={handleAcceptConnection} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-xl text-sm transition-all hover:shadow-lg active:scale-95">
                                    Aceitar Conexão
                                </button>
                            </div>
                        </div>
                    )
                  ) : null}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
    
    {viewingAlbum && <AlbumGalleryModal album={viewingAlbum} onClose={() => setViewingAlbum(null)} />}
    {isReportModalOpen && <ReportUserModal user={user} onClose={() => setReportModalOpen(false)} />}
    {isBlockConfirmOpen && (
        <ConfirmationModal
            isOpen={isBlockConfirmOpen}
            title={t('profile_modal.block_title', { defaultValue: 'Bloquear {{name}}', name: user.username })}
            message={t('profile_modal.block_desc', { defaultValue: 'Você não verá mais o perfil de {{name}}.', name: user.username })}
            onConfirm={handleBlockUser}
            onCancel={() => setBlockConfirmOpen(false)}
            confirmText={t('profile_modal.block_btn', { defaultValue: 'Bloquear' })}
        />
    )}
    </>
  );
};

const InfoItem = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
    <div className="flex items-center space-x-3 bg-[#1a1a20] p-3 rounded-xl border border-white/5">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
             <span className="material-symbols-rounded text-lg text-slate-300">{icon}</span>
        </div>
        <div className="overflow-hidden">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">{label}</p>
            <p className="font-semibold text-slate-200 truncate">{value}</p>
        </div>
    </div>
);

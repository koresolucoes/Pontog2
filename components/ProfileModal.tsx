
import React, { useState, useEffect, useRef } from 'react';
import { User, PrivateAlbum } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useAlbumStore } from '../stores/albumStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useUiStore } from '../stores/uiStore';
import toast from 'react-hot-toast';
import { formatLastSeen } from '../lib/utils';
import { AlbumGalleryModal } from './AlbumGalleryModal';
import { useUserActionsStore } from '../stores/userActionsStore';
import { useCommunityStore } from '../stores/communityStore';
import { ReportUserModal } from './ReportUserModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useTranslation } from 'react-i18next';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onStartChat: (user: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onStartChat }) => {
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
  const [winkCount, setWinkCount] = useState<number | null>(null);
  const [isOptionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isBlockConfirmOpen, setBlockConfirmOpen] = useState(false);
  
  // Connection Request States
  const [connection, setConnection] = useState<any>(null);
  const [firstMessage, setFirstMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  
  // Video Control
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const agoraPost = posts.find(p => p.user_id === user.id);

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
      <div className="bg-slate-800/95 backdrop-blur-xl sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-md mx-auto pointer-events-auto overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] animate-slide-in-up border-t border-x border-white/10 sm:border-b">
        
        {/* Drag Handle for Mobile aesthetic */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
            <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
        </div>

        {/* Top Bar */}
        <div className="absolute top-4 right-4 z-30 flex gap-2">
            <button onClick={onClose} className="text-white bg-black/20 backdrop-blur-md w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/40 transition-colors border border-white/10">
                <span className="material-symbols-rounded">close</span>
            </button>
        </div>

        {/* Media Area: Video or Carousel - Adjusted Height for Mobile */}
        <div className={`relative w-full h-[45vh] sm:h-auto sm:aspect-square flex-shrink-0 group bg-black`}>
          {user.video_url && currentPhotoIndex === 0 ? (
              <div className="w-full h-full relative" onClick={toggleVideo}>
                  <video 
                    ref={videoRef}
                    src={user.video_url} 
                    className="w-full h-full object-cover" 
                    loop 
                    muted={!isPlayingVideo} // Start muted for autoplay policies
                    playsInline
                    autoPlay
                  />
                  {!isPlayingVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                          <span className="material-symbols-rounded text-white text-5xl opacity-80 shadow-lg">play_circle</span>
                      </div>
                  )}
                  <div className="absolute bottom-24 right-4 bg-black/50 p-2 rounded-full text-white text-xs font-bold flex items-center gap-1 backdrop-blur-sm">
                      <span className="material-symbols-rounded filled text-sm">videocam</span>
                      {t('profile_modal.video', { defaultValue: 'Vídeo' })}
                  </div>
              </div>
          ) : (
              <img loading="lazy" src={allPhotos[currentPhotoIndex]} alt={user.username} className="w-full h-full object-cover" />
          )}
          
          {!user.video_url || currentPhotoIndex > 0 ? (
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90 pointer-events-none"></div>
          ) : null}

          {/* Carousel Controls */}
          {allPhotos.length > 1 && (
            <>
              <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 transition-colors z-10 sm:opacity-0 sm:group-hover:opacity-100">
                <span className="material-symbols-rounded text-4xl shadow-black drop-shadow-lg">chevron_left</span>
              </button>
              <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 transition-colors z-10 sm:opacity-0 sm:group-hover:opacity-100">
                <span className="material-symbols-rounded text-4xl shadow-black drop-shadow-lg">chevron_right</span>
              </button>
              
              {/* Pagination Dots */}
              <div className="absolute top-4 left-4 flex space-x-1.5 z-10 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {user.video_url && (
                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentPhotoIndex === 0 ? 'bg-primary-500 scale-125' : 'bg-white/40'}`}></div>
                )}
                {allPhotos.map((_, index) => (
                  <div key={index} className={`w-1.5 h-1.5 rounded-full transition-all ${(user.video_url ? index + 1 : index) === currentPhotoIndex ? 'bg-white scale-125' : 'bg-white/40'}`}></div>
                ))}
              </div>
            </>
          )}

          {/* Header Info Over Photo */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2 flex-wrap leading-none mb-2 drop-shadow-lg">
                    <span>{user.display_name || user.username}, {user.age}</span>
                    {user.is_verified && (
                        <div className="bg-primary-600/20 text-primary-500 rounded-full p-1 shadow-lg flex items-center justify-center">
                            <span className="material-symbols-rounded filled !text-[14px]">verified</span>
                        </div>
                    )}
                    {user.subscription_tier === 'plus' && (
                        <span className="bg-yellow-500/90 text-black p-1 rounded-full shadow-lg flex items-center justify-center">
                            <span className="material-symbols-rounded filled !text-[14px]">auto_awesome</span>
                        </span>
                    )}
                    </h2>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium backdrop-blur-sm shadow-sm ${isOnline ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-slate-500/20 text-slate-300 border border-white/10'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
                            {statusText}
                        </span>
                         {user.distance_km != null && (
                             <span className="text-xs text-slate-300 font-medium drop-shadow-md">
                                {user.distance_km < 1 ? t('profile_modal.near_you', { defaultValue: '< 1km de você' }) : `${user.distance_km.toFixed(0)}km ` + t('profile_modal.from_you', { defaultValue: 'de você' })}
                             </span>
                         )}
                         
                         {/* Hoster Badge */}
                         {user.can_host && (
                             <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-green-600 text-white shadow-lg border border-green-400">
                                 <span className="material-symbols-rounded filled !text-[14px]">home</span>
                                 {t('profile_modal.has_place', { defaultValue: 'TEM LOCAL' })}
                             </span>
                         )}
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
          
          {/* Actions (Favorite, Block, Report) */}
          <div className="flex justify-center items-center gap-5 pb-2 pt-1 border-b border-white/5">
              <button 
                  onClick={() => isFavorite ? unfavoriteUser(user.id) : favoriteUser(user.id)}
                  className={`w-14 h-14 flex items-center justify-center rounded-full border-2 transition-all ${isFavorite ? 'bg-primary-600/20 border-primary-500 text-primary-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}
                  title={t('profile_modal.favorite', { defaultValue: 'Favoritar' })}
              >
                  <span className={`material-symbols-rounded text-3xl ${isFavorite ? 'filled' : ''}`}>favorite</span>
              </button>
              
              <button 
                  onClick={() => setBlockConfirmOpen(true)}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all"
                  title={t('profile_modal.block', { defaultValue: 'Bloquear' })}
              >
                  <span className="material-symbols-rounded text-2xl">block</span>
              </button>

              <button 
                  onClick={() => setReportModalOpen(true)}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-400 transition-all"
                  title={t('profile_modal.report', { defaultValue: 'Denunciar' })}
              >
                  <span className="material-symbols-rounded text-2xl">flag</span>
              </button>
          </div>

          {agoraPost && (
            <div className="relative overflow-hidden rounded-2xl p-1 bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-900/30">
              <div className="bg-slate-900 rounded-xl p-4 relative">
                 <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-3">
                    <span className="material-symbols-rounded filled animate-bounce">local_fire_department</span>
                    <span className="tracking-widest text-sm">{t('profile_modal.agora_mode', { defaultValue: 'MODO AGORA' })}</span>
                  </div>
                  <div className="flex gap-4 items-start">
                      <img loading="lazy" src={agoraPost.photo_url} className="w-20 h-20 rounded-lg object-cover bg-slate-800" />
                      <div className="flex-1">
                          <p className="text-white italic text-lg leading-relaxed">"{agoraPost.status_text}"</p>
                      </div>
                  </div>
              </div>
            </div>
          )}

          {user.status_text && (
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-slate-200 text-lg font-light leading-relaxed">"{user.status_text}"</p>
              </div>
          )}
          
          {/* Looking For Display */}
          {user.looking_for && Array.isArray(user.looking_for) && user.looking_for.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-green-400 uppercase mb-3 flex items-center gap-2">
                    <span className="material-symbols-rounded filled text-base">search</span> {t('profile_modal.looking_for_title', { defaultValue: 'O que busco' })}
                </h3>
                <div className="flex flex-wrap gap-2">
                    {user.looking_for.map(item => (
                        <span key={item} className="bg-green-900/30 text-green-200 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-bold">
                            {t(`constants.looking_for.${item}`, { defaultValue: item })}
                        </span>
                    ))}
                </div>
            </div>
          )}

          {/* Kinks Display */}
          {user.kinks && Array.isArray(user.kinks) && user.kinks.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-secondary-400 uppercase mb-3 flex items-center gap-2">
                    <span className="material-symbols-rounded filled text-base">interests</span> {t('profile_modal.kinks', { defaultValue: 'O que curto' })}
                </h3>
                <div className="flex flex-wrap gap-2">
                    {user.kinks.map(kink => (
                        <span key={kink} className="bg-secondary-900/30 text-secondary-200 border border-secondary-500/30 px-3 py-1.5 rounded-lg text-xs font-bold">
                            {t(`constants.kinks.${kink}`, { defaultValue: kink })}
                        </span>
                    ))}
                </div>
            </div>
          )}

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

          {/* Redes Sociais Display */}
          {user.redes_sociais && (user.redes_sociais.instagram || user.redes_sociais.twitter || user.redes_sociais.telegram || user.redes_sociais.onlyfans) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <span className="material-symbols-rounded filled text-base text-primary-500">share</span> {t('profile_modal.redes_sociais', { defaultValue: 'Redes Sociais' })}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {user.redes_sociais.instagram && (
                  <a 
                    href={`https://instagram.com/${user.redes_sociais.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800 transition-all text-sm font-semibold text-pink-400"
                  >
                    <span className="material-symbols-rounded !text-[20px] filled">photo_camera</span>
                    <span className="truncate">Instagram</span>
                  </a>
                )}
                {user.redes_sociais.twitter && (
                  <a 
                    href={`https://twitter.com/${user.redes_sociais.twitter.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800 transition-all text-sm font-semibold text-sky-400"
                  >
                    <span className="material-symbols-rounded !text-[20px] filled">flutter_dash</span>
                    <span className="truncate">Twitter / X</span>
                  </a>
                )}
                {user.redes_sociais.telegram && (
                  <a 
                    href={user.redes_sociais.telegram.startsWith('http') ? user.redes_sociais.telegram : `https://t.me/${user.redes_sociais.telegram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800 transition-all text-sm font-semibold text-blue-400"
                  >
                    <span className="material-symbols-rounded !text-[20px] filled">send</span>
                    <span className="truncate">Telegram</span>
                  </a>
                )}
                {user.redes_sociais.onlyfans && (
                  <a 
                    href={user.redes_sociais.onlyfans.startsWith('http') ? user.redes_sociais.onlyfans : `https://${user.redes_sociais.onlyfans}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800 transition-all text-sm font-semibold text-yellow-500 col-span-2 sm:col-span-1"
                  >
                    <span className="material-symbols-rounded !text-[20px] filled">star</span>
                    <span className="truncate">OnlyFans / Privacy</span>
                  </a>
                )}
              </div>
            </div>
          )}
          
          {user.tribes && Array.isArray(user.tribes) && user.tribes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">{t('profile_modal.tribes', { defaultValue: 'Tribos' })}</h3>
              <div className="flex flex-wrap gap-2">
                {user.tribes.map(tribe => (
                  <span key={tribe} className="bg-slate-800 text-slate-200 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    {t(`constants.tribes.${tribe}`, { defaultValue: tribe })}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {user.has_private_albums && (
            <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <span className="material-symbols-rounded filled text-base">lock</span> {t('profile_modal.private_albums', { defaultValue: 'Álbuns Privados' })}
                </h3>
                {isFetchingViewedUserAlbums ? (
                    <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : viewedUserAccessStatus === 'granted' ? (
                    viewedUserAlbums.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {viewedUserAlbums.map(album => (
                                <div key={album.id} className="relative aspect-square group cursor-pointer overflow-hidden rounded-xl" onClick={() => setViewingAlbum(album)}>
                                    <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-center p-1">
                                        <span className="font-bold text-white text-xs">{album.name}</span>
                                    </div>
                                    {album.private_album_photos.length > 0 && (
                                        <img loading="lazy" src={album.private_album_photos[0].photo_path} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt={album.name} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-slate-500 py-4 border border-dashed border-slate-700 rounded-xl">{t('profile_modal.empty_albums', { defaultValue: 'Álbuns vazios.' })}</p>
                    )
                ) : (
                    <div className="p-5 bg-slate-800/50 rounded-2xl text-center border border-white/5">
                        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="material-symbols-rounded text-slate-400 text-2xl">lock</span>
                        </div>
                        <p className="text-sm text-slate-300 mb-4">{t('profile_modal.private_content', { defaultValue: 'O conteúdo é privado.' })}</p>
                        {renderAccessButton()}
                    </div>
                )}
            </div>
          )}
        </div>
        
        {/* Action Bar */}
        {user.id !== currentUser?.id && (
          <div className="p-4 border-t border-white/10 bg-slate-900 flex-shrink-0 flex flex-col gap-3 pb-8 sm:pb-4">
            {currentUser?.subscription_tier === 'free' && winkCount !== null && connection?.status === 'accepted' && (
                <div className="text-center text-xs text-slate-500">
                    {10 - winkCount > 0 ? (
                        <p>{t('profile_modal.you_have', { defaultValue: 'Você tem' })} <span className="font-bold text-slate-300">{10 - winkCount}</span> {t('profile_modal.winks_today', { defaultValue: 'chamados hoje.' })}</p>
                    ) : (
                        <p>{t('profile_modal.no_winks', { defaultValue: 'Acabaram os chamados.' })} <button onClick={() => { onClose(); setSubscriptionModalOpen(true); }} className="text-primary-400 hover:underline font-semibold">{t('profile_modal.get_plus', { defaultValue: 'Vire Plus' })}</button></p>
                    )}
                </div>
            )}
            
            {connection === null ? (
                <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Solicitação de Conexão</p>
                    <textarea
                        value={firstMessage}
                        onChange={(e) => setFirstMessage(e.target.value)}
                        placeholder="Envie uma primeira mensagem para iniciar a conversa..."
                        maxLength={150}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none h-18"
                    />
                    <button
                        onClick={handleRequestConnection}
                        disabled={isSendingRequest || !firstMessage.trim()}
                        className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
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
                    <div className="text-center p-4 bg-slate-800/40 rounded-2xl border border-white/5 space-y-2">
                        <span className="material-symbols-rounded text-slate-400 text-3xl mb-1 animate-pulse">hourglass_empty</span>
                        <p className="text-sm font-semibold text-slate-300">Solicitação Pendente</p>
                        <p className="text-xs text-slate-500">Aguardando a resposta de {user.display_name || user.username}.</p>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                        <div className="text-center">
                            <span className="material-symbols-rounded text-primary-500 text-3xl mb-1 animate-bounce">handshake</span>
                            <p className="text-sm font-bold text-white">Solicitação Recebida</p>
                            <p className="text-xs text-slate-400 mt-1">{user.display_name || user.username} quer se conectar!</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleRejectConnection} className="flex-1 bg-slate-850 border border-white/5 text-red-400 font-bold py-2.5 rounded-xl text-sm transition-colors hover:bg-slate-700">
                                Recusar
                            </button>
                            <button onClick={handleAcceptConnection} className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all hover:shadow-lg active:scale-95">
                                Aceitar
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={handleWink} 
                    disabled={currentUser?.subscription_tier === 'free' && winkCount !== null && winkCount >= 10}
                    className="flex-1 bg-slate-800 border border-white/10 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                    <span className="material-symbols-rounded text-xl text-primary-500 filled">favorite</span>
                    <span>{t('profile_modal.wink', { defaultValue: 'Chamar' })}</span>
                  </button>
                  <button onClick={handleChatClick} className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary-900/30 transition-all active:scale-95">
                    <span className="material-symbols-rounded text-xl filled">chat_bubble</span>
                    <span>{t('profile_modal.message', { defaultValue: 'Mensagem' })}</span>
                  </button>
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
    <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-xl border border-white/5">
        <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
             <span className="material-symbols-rounded text-lg text-primary-400">{icon}</span>
        </div>
        <div className="overflow-hidden">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">{label}</p>
            <p className="font-semibold text-slate-100 truncate">{value}</p>
        </div>
    </div>
);

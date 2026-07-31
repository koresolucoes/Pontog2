
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Message as MessageType, PrivateAlbum } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useInboxStore } from '../stores/inboxStore';
import { useAlbumStore } from '../stores/albumStore';
import { useUiStore } from '../stores/uiStore';
import { format } from 'date-fns';
import { formatLastSeen } from '../lib/utils';
import { ConfirmationModal } from './ConfirmationModal';
import { SelectAlbumModal } from './SelectAlbumModal';
import { AlbumGalleryModal } from './AlbumGalleryModal';
import { getPublicImageUrl } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ViewOncePhotoModal } from './ViewOncePhotoModal';
import { ViewOnceAudioModal } from './ViewOnceAudioModal';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface ChatUser {
  id: string;
  name: string;
  imageUrl: string;
  last_seen?: string | null;
  subscription_tier: 'free' | 'plus';
  is_verified?: boolean;
  current_checkin_venue_id?: string;
  current_checkin_venue_name?: string;
}

interface ChatWindowProps {
  user: ChatUser;
  onClose: () => void;
}

interface MessageContentProps {
  message: MessageType;
  onViewOnceClick: (message: MessageType) => void;
  onAlbumClick?: (albumId: number, isViewOnce?: boolean, expiresAt?: string | null, message?: MessageType) => void;
  t: any;
  isOwn?: boolean;
}

// AudioPreviewPlayer component for reviewing voice messages before sending
const AudioPreviewPlayer: React.FC<{ src: string }> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(err => console.error("Error playing preview:", err));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex-1 flex items-center gap-3 bg-slate-950/40 px-3 py-2 rounded-xl">
            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={handleTimeUpdate} 
                onLoadedMetadata={handleLoadedMetadata} 
                onEnded={handleEnded} 
                className="hidden" 
            />
            <button 
                type="button" 
                onClick={togglePlay} 
                className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white flex items-center justify-center transition-all flex-shrink-0"
            >
                <span className="material-symbols-rounded text-lg filled">
                    {isPlaying ? 'pause' : 'play_arrow'}
                </span>
            </button>
            <div className="flex-1 space-y-1">
                <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="absolute left-0 top-0 h-full bg-primary-500 rounded-full transition-all duration-100"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration || 0)}</span>
                </div>
            </div>
        </div>
    );
};

// Memoized MessageContent to prevent unnecessary re-renders
const MessageContent: React.FC<MessageContentProps> = React.memo(({ message, onViewOnceClick, onAlbumClick, t, isOwn }) => {
    if (message.is_view_once) {
        let isAudio = false;
        try {
            const parsed = JSON.parse(message.content);
            if (parsed.type === 'audio') {
                isAudio = true;
            }
        } catch (e) {}

        if (isOwn) {
            if (message.viewed_at) {
                return (
                    <div className="flex items-center gap-2 text-sm italic font-semibold opacity-90 select-none text-emerald-300">
                        <span className="material-symbols-rounded text-lg">visibility</span>
                        <span>
                            {isAudio
                                ? t('chat.audio_opened', { defaultValue: 'Áudio aberto pelo destinatário' })
                                : t('chat.photo_opened', { defaultValue: 'Foto aberta pelo destinatário' })}
                        </span>
                    </div>
                );
            }

            return (
                <button
                    onClick={() => onViewOnceClick(message)}
                    className="flex items-center gap-2 text-sm font-bold bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors cursor-pointer select-none"
                >
                    <span className="material-symbols-rounded filled text-lg animate-pulse text-orange-400">local_fire_department</span>
                    <span>
                        {isAudio
                            ? t('chat.view_audio_sent', { defaultValue: 'Áudio (1x) enviado - Clique p/ ouvir' })
                            : t('chat.view_photo_sent', { defaultValue: 'Foto (1x) enviada - Clique p/ ver' })}
                    </span>
                </button>
            );
        }

        if (message.viewed_at) {
            return (
                <div className="flex items-center gap-2 text-sm italic opacity-60 select-none">
                    <span className="material-symbols-rounded text-lg">timer_off</span>
                    <span>{isAudio ? t('chat.audio_expired', { defaultValue: 'Áudio expirado' }) : t('chat.photo_expired', { defaultValue: 'Foto expirada' })}</span>
                </div>
            );
        }

        return (
            <button
                onClick={() => onViewOnceClick(message)}
                className="flex items-center gap-2 text-sm font-bold bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors cursor-pointer select-none"
            >
                <span className="material-symbols-rounded filled text-lg animate-pulse text-orange-400">local_fire_department</span>
                <span>{isAudio ? t('chat.listen_audio_once', { defaultValue: 'Ouvir Áudio (1x)' }) : t('chat.view_photo_once', { defaultValue: 'Ver Foto (1x)' })}</span>
            </button>
        );
    }

    try {
        const parsedContent = JSON.parse(message.content);
        if (parsedContent.type) {
            switch(parsedContent.type) {
                case 'location':
                    const { lat, lng } = parsedContent;
                    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    return (
                        <div className="space-y-2">
                            <iframe
                                width="240"
                                height="150"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`}
                                className="rounded-lg border border-white/10 pointer-events-none"
                            ></iframe>
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block text-left group bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
                                        <span className="material-symbols-rounded filled text-lg">location_on</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm block">{t('chat.location', { defaultValue: 'Localização' })}</span>
                                        <span className="text-xs opacity-80 underline">{t('chat.open_in_maps', { defaultValue: 'Abrir no Maps' })}</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    );
                case 'album':
                    const { albumId, albumName, expiresAt, isViewOnce } = parsedContent;
                    const isExpired = expiresAt && new Date(expiresAt) < new Date();

                    if (isExpired) {
                        return (
                            <div className="flex items-center gap-2 text-sm italic opacity-60 select-none text-rose-300">
                                <span className="material-symbols-rounded text-lg">timer_off</span>
                                <span>{t('chat.album_expired', { defaultValue: 'Acesso ao álbum expirou' })}</span>
                            </div>
                        );
                    }

                    if (isViewOnce && message.viewed_at) {
                        return (
                            <div className="flex items-center gap-2 text-sm italic opacity-60 select-none text-amber-300">
                                <span className="material-symbols-rounded text-lg">visibility_off</span>
                                <span>{isOwn ? t('chat.album_viewed_by_recipient', { defaultValue: 'Álbum (1x) visualizado pelo destinatário' }) : t('chat.album_viewed', { defaultValue: 'Álbum (1x) já visualizado' })}</span>
                            </div>
                        );
                    }

                    return (
                        <button 
                            type="button"
                            onClick={() => onAlbumClick && albumId && onAlbumClick(albumId, isViewOnce, expiresAt, message)}
                            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all cursor-pointer text-left w-full border border-white/10"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary-500/30 flex items-center justify-center text-primary-300 flex-shrink-0">
                                <span className="material-symbols-rounded text-xl">photo_album</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-sm block truncate">{albumName || t('chat.private_album', { defaultValue: 'Álbum Privado' })}</span>
                                <span className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                                    {isViewOnce ? (
                                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                                            <span className="material-symbols-rounded text-xs">local_fire_department</span>
                                            Visualização Única
                                        </span>
                                    ) : expiresAt ? (
                                        <span className="text-blue-300">
                                            Expira em {format(new Date(expiresAt), 'dd/MM HH:mm')}
                                        </span>
                                    ) : (
                                        <span>{t('chat.click_to_open_album', { defaultValue: 'Clique para abrir o álbum' })}</span>
                                    )}
                                </span>
                            </div>
                            <span className="material-symbols-rounded text-slate-400">chevron_right</span>
                        </button>
                    );
                case 'audio':
                    const { url } = parsedContent;
                    if (!url) {
                        return (
                            <div className="flex items-center gap-2 text-sm italic opacity-60 select-none">
                                <span className="material-symbols-rounded text-lg">timer_off</span>
                                <span>{t('chat.audio_expired', { defaultValue: 'Áudio expirado' })}</span>
                            </div>
                        );
                    }
                    return (
                        <audio controls src={getPublicImageUrl(url)} className="max-w-[240px] max-h-12" />
                    );
            }
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }


    return (
        <div className="space-y-2">
            {message.image_url && (
                <img loading="lazy" src={getPublicImageUrl(message.image_url)} alt="Imagem enviada" className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(getPublicImageUrl(message.image_url))}/>
            )}
            {message.content && <p className="text-sm break-words leading-relaxed">{message.content}</p>}
        </div>
    );
});

// Extracted and Memoized MessageStatus to fix re-mounting issue
const MessageStatus = React.memo(({ msg, currentUserId, isPremium, t }: { msg: MessageType, currentUserId: string, isPremium: boolean, t: any }) => {
    if (msg.sender_id !== currentUserId) return null;
    
    const hasBeenRead = msg.read_at !== null && msg.read_at !== undefined;
    const showReadReceipt = isPremium && hasBeenRead;

    return (
      <div className="flex items-center space-x-1 transition-opacity duration-300">
          {msg.updated_at && <span className="text-[9px] text-slate-400">({t('chat.edited', { defaultValue: 'editado' })})</span>}
          <span className="text-[9px] text-slate-400/80">{format(new Date(msg.created_at), 'HH:mm')}</span>
          {showReadReceipt ? (
              <span className="material-symbols-rounded !text-[12px] text-blue-400">done_all</span>
          ) : (
              <span className="material-symbols-rounded !text-[12px] text-slate-500">check</span>
          )}
      </div>
    );
});

export const ChatWindow: React.FC<ChatWindowProps> = ({ user, onClose }) => {
  useHardwareBack(true, onClose);
  
  const { t } = useTranslation();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore(state => state.user);
  const currentUserId = currentUser?.id;
  const onlineUsers = useMapStore(state => state.onlineUsers);
  const deleteConversation = useInboxStore(state => state.deleteConversation);
  const clearUnreadCountForConversation = useInboxStore(state => state.clearUnreadCountForConversation);
  const { uploadPhoto, uploadAudio, grantAccess, fetchAlbumById } = useAlbumStore();

  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<MessageType | null>(null);
  const [confirmDeleteConvo, setConfirmDeleteConvo] = useState(false);
  
  const [isAttachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [isAlbumSelectorOpen, setIsAlbumSelectorOpen] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<PrivateAlbum | null>(null);
  
  useHardwareBack(isAlbumSelectorOpen, () => setIsAlbumSelectorOpen(false));
  useHardwareBack(!!activeAlbum, () => setActiveAlbum(null));
  useHardwareBack(!!confirmDeleteMessage, () => setConfirmDeleteMessage(null));
  useHardwareBack(confirmDeleteConvo, () => setConfirmDeleteConvo(false));
  useHardwareBack(isAttachmentMenuOpen, () => setAttachmentMenuOpen(false));
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [messageOptions, setMessageOptions] = useState<MessageType | null>(null);
  useHardwareBack(!!messageOptions, () => setMessageOptions(null));
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [imageToSend, setImageToSend] = useState<{ file: File; preview: string } | null>(null);
  const [audioToSend, setAudioToSend] = useState<{ file: File; preview: string } | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  
  useHardwareBack(!!imageToSend, () => setImageToSend(null));
  useHardwareBack(!!audioToSend, () => setAudioToSend(null));
  useHardwareBack(isRecording, () => cancelRecording());
  
  const [viewingOncePhoto, setViewingOncePhoto] = useState<MessageType | null>(null);
  const [viewingOnceAudio, setViewingOnceAudio] = useState<MessageType | null>(null);
  
  useHardwareBack(!!viewingOncePhoto, () => setViewingOncePhoto(null));
  useHardwareBack(!!viewingOnceAudio, () => setViewingOnceAudio(null));
  
  const [connectionStatus, setConnectionStatus] = useState<'pending_incoming' | 'pending_outgoing' | 'accepted' | 'none'>('none');
  const [connectionIdState, setConnectionIdState] = useState<string | null>(null);

  const markMessagesAsRead = useCallback(async (messageIds: number[], convId: number | null) => {
      if (messageIds.length === 0 || !convId) return;
      
      const { error } = await supabase.rpc('mark_messages_as_read', { message_ids: messageIds });
      
      if (error) {
          console.error("Error marking messages as read:", error);
      } else {
          const now = new Date().toISOString();
          setMessages(prevMessages =>
              prevMessages.map(msg =>
                  messageIds.includes(msg.id) ? { ...msg, read_at: now } : msg
              )
          );
          clearUnreadCountForConversation(convId);
      }
  }, [clearUnreadCountForConversation]);

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      if (!currentUserId || !user.id) return;
      try {
        const { data, error } = await supabase
          .from('user_connections')
          .select('*')
          .or(`and(follower_id.eq.${currentUserId},following_id.eq.${user.id}),and(follower_id.eq.${user.id},following_id.eq.${currentUserId})`);

        if (error) throw error;

        if (data && data.length > 0) {
          const conn = data[0];
          setConnectionIdState(conn.id);
          if (conn.status === 'accepted') {
            setConnectionStatus('accepted');
          } else if (conn.follower_id === currentUserId) {
            setConnectionStatus('pending_outgoing');
          } else {
            setConnectionStatus('pending_incoming');
          }
        } else {
          setConnectionStatus('none');
        }
      } catch (err) {
        console.error('Error fetching connection status:', err);
      }
    };

    fetchConnectionStatus();
  }, [currentUserId, user.id]);

  const handleAcceptConnection = async () => {
    if (!connectionIdState) return;
    try {
      const { acceptMessageRequest } = useInboxStore.getState();
      await acceptMessageRequest(connectionIdState, user.id);
      setConnectionStatus('accepted');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectConnection = async () => {
    if (!connectionIdState) return;
    try {
      const { rejectMessageRequest } = useInboxStore.getState();
      await rejectMessageRequest(connectionIdState);
      setConnectionStatus('none');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const setupConversation = async () => {
      if (!currentUserId || !user.id) return;
      
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_one: currentUserId,
        p_two: user.id
      });

      if (error) {
        console.error("Error setting up conversation:", error);
        toast.error(t('chat.error_loading', { defaultValue: 'Erro ao carregar a conversa.' }));
        return;
      }
      const convId = data;
      setConversationId(convId);
      
      // OPTIMIZATION: Fetch only last 50 messages to improve performance
      const { data: initialMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false }) // Get newest first
        .limit(50);

      if (messagesError) {
          console.error("Error fetching messages:", messagesError);
      } else {
          // Reverse to show oldest first in the UI
          const sortedMessages = (initialMessages || []).reverse();
          setMessages(sortedMessages);
          setHasMoreMessages(initialMessages?.length === 50);
          
          const unreadIds = sortedMessages
            .filter(m => m.sender_id !== currentUserId && !m.read_at)
            .map(m => m.id);
          if (unreadIds.length > 0) {
              markMessagesAsRead(unreadIds, convId);
          }
      }
    };

    setupConversation();
  }, [user.id, currentUserId, markMessagesAsRead]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
           if (payload.eventType === 'INSERT') {
               const newMessagePayload = payload.new as MessageType;
               setMessages((prevMessages) => {
                   if (prevMessages.some(m => m.id === newMessagePayload.id)) {
                       return prevMessages;
                   }
                   return [...prevMessages, newMessagePayload];
               });
               if (newMessagePayload.sender_id !== currentUserId) {
                   markMessagesAsRead([newMessagePayload.id], conversationId);
               }
           } else if (payload.eventType === 'UPDATE') {
               const updatedMessage = payload.new as MessageType;
               setMessages(prevMessages =>
                 prevMessages.map(msg =>
                   msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
                 )
               );
           } else if (payload.eventType === 'DELETE') {
               const deletedMessageId = (payload.old as MessageType).id;
               setMessages(prev => prev.filter(m => m.id !== deletedMessageId));
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, markMessagesAsRead]);

  const handleLoadMoreMessages = async () => {
      if (!hasMoreMessages || loadingMoreMessages || !conversationId || messages.length === 0) return;
      setLoadingMoreMessages(true);
      
      const oldestMessage = messages[0];
      
      const { data: olderMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .lt('created_at', oldestMessage.created_at)
          .order('created_at', { ascending: false })
          .limit(50);
          
      if (!error && olderMessages) {
          const reversedOlder = [...olderMessages].reverse();
          setMessages(prev => [...reversedOlder, ...prev]);
          setHasMoreMessages(olderMessages.length === 50);
      } else if (error) {
          console.error("Error loading older messages:", error);
      }
      setLoadingMoreMessages(false);
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
          const previewUrl = URL.createObjectURL(audioBlob);
          setAudioToSend({ file: audioFile, preview: previewUrl });
        }
      };

      mediaRecorder.start();
    } catch (err) {
      toast.error(t('chat.mic_error', { defaultValue: 'Erro ao acessar microfone.' }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent sending
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };
  
  const sendMessage = async (content: string | null, imageUrl: string | null = null, isViewOnceFlag: boolean = false, audioUrl: string | null = null) => {
    if ((!content || content.trim() === '') && !imageUrl && !audioUrl) return;
    if (!currentUser || !conversationId) return;

    let finalContent = content;
    if (audioUrl) {
        finalContent = JSON.stringify({ type: 'audio', url: audioUrl });
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      conversation_id: conversationId,
      content: finalContent,
      image_url: imageUrl,
      is_view_once: isViewOnceFlag,
    });
    
    if (error) {
        toast.error(t('chat.error_sending', { defaultValue: 'Não foi possível enviar a mensagem.' }));
    } else {
        const { session } = (await supabase.auth.getSession()).data;
        if (session && content) {
            fetch('/api/send-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    receiver_id: user.id,
                    message_content: content.length > 50 ? t('chat.new_message', { defaultValue: 'Nova mensagem' }) : content
                })
            }).catch(err => console.error("Error sending push notification:", err));
        }
    }
  };

  const cancelImageSend = () => {
    if (imageToSend) {
        URL.revokeObjectURL(imageToSend.preview);
    }
    setImageToSend(null);
    setIsViewOnce(false);
    setNewMessage('');
  };

  const cancelAudioSend = () => {
    if (audioToSend) {
        URL.revokeObjectURL(audioToSend.preview);
    }
    setAudioToSend(null);
    setIsViewOnce(false);
  };

  const handleSendAudioPreview = async () => {
    if (!audioToSend) return;
    const toastId = toast.loading(t('chat.sending_audio', { defaultValue: 'Enviando áudio...' }));
    const audioPath = await uploadAudio(audioToSend.file);
    if (audioPath) {
      await sendMessage(null, null, isViewOnce, audioPath);
      cancelAudioSend();
      toast.success(t('chat.audio_sent', { defaultValue: 'Áudio enviado!' }), { id: toastId });
    } else {
      toast.error(t('chat.error_sending_audio', { defaultValue: 'Erro ao enviar áudio.' }), { id: toastId });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageToSend) {
        const toastId = toast.loading(t('chat.sending_photo', { defaultValue: 'Enviando foto...' }));
        const imagePath = await uploadPhoto(imageToSend.file);
        if (imagePath) {
            await sendMessage(newMessage || null, imagePath, isViewOnce);
            cancelImageSend();
            toast.success(t('chat.photo_sent', { defaultValue: 'Foto enviada!' }), { id: toastId });
        } else {
            toast.error(t('chat.error_sending_photo', { defaultValue: 'Erro ao enviar foto. Tente novamente.' }), { id: toastId });
        }
    } else {
        if (!newMessage.trim()) return;
        await sendMessage(newMessage.trim(), null, false);
        setNewMessage('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error(t('chat.image_too_large', { defaultValue: 'A imagem é muito grande. Máximo 5MB.' }));
            return;
        }
        const preview = URL.createObjectURL(file);
        setImageToSend({ file, preview });
    }
    setAttachmentMenuOpen(false);
    if (e.target) e.target.value = '';
  };
  
  const handleSendLocation = () => {
    setAttachmentMenuOpen(false);
    toast.loading(t('chat.getting_location', { defaultValue: 'Obtendo localização...' }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss();
        const { latitude, longitude } = position.coords;
        const locationContent = JSON.stringify({
          type: 'location',
          lat: latitude,
          lng: longitude,
        });
        sendMessage(locationContent);
      },
      (error) => {
        toast.dismiss();
        toast.error(t('chat.location_error', { defaultValue: 'Não foi possível acessar sua localização.' }));
        console.error("Geolocation error:", error);
      }
    );
  };
  
  const handleSelectAlbum = async (album: PrivateAlbum & { is_view_once?: boolean; expires_in_hours?: number }) => {
    setIsAlbumSelectorOpen(false);
    const toastId = toast.loading(t('chat.sharing_album', { defaultValue: 'Compartilhando álbum...' }));
    try {
        await grantAccess(album.id, user.id);
        const expiresAt = album.expires_in_hours ? new Date(Date.now() + album.expires_in_hours * 3600000).toISOString() : null;
        const albumContent = JSON.stringify({
            type: 'album',
            albumId: album.id,
            albumName: album.name,
            isViewOnce: !!album.is_view_once,
            expiresAt: expiresAt,
        });
        await sendMessage(albumContent);
        toast.success(t('chat.album_shared', { defaultValue: 'Álbum compartilhado!' }), { id: toastId });
    } catch (error) {
        toast.error(t('chat.error_sharing_album', { defaultValue: 'Falha ao compartilhar o álbum.' }), { id: toastId });
    }
  };

  const handleAlbumClick = async (albumId: number, isViewOnce?: boolean, expiresAt?: string | null, message?: MessageType) => {
    const isOwn = currentUser && message && message.sender_id === currentUser.id;

    if (expiresAt && new Date(expiresAt) < new Date()) {
        toast.error(t('chat.album_expired', { defaultValue: 'O acesso a este álbum expirou.' }));
        return;
    }

    if (isViewOnce && message?.viewed_at && !isOwn) {
        toast.error(t('chat.album_viewed', { defaultValue: 'Este álbum de visualização única já foi visualizado.' }));
        return;
    }

    const toastId = toast.loading(t('chat.loading_album', { defaultValue: 'Carregando álbum...' }));
    const album = await fetchAlbumById(albumId);
    toast.dismiss(toastId);

    if (!album) {
        toast.error(t('chat.album_not_found', { defaultValue: 'Álbum não encontrado ou sem acesso.' }));
        return;
    }

    if (isViewOnce && message && !isOwn && !message.viewed_at) {
        const nowStr = new Date().toISOString();
        await supabase
            .from('messages')
            .update({ viewed_at: nowStr })
            .eq('id', message.id);

        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, viewed_at: nowStr } : m));
    }

    setActiveAlbum(album);
  };
  
  const handleStartEdit = (msg: MessageType) => {
      setEditingMessage(msg);
      setEditedContent(msg.content ?? '');
      setMessageOptions(null); // Fecha o menu de opções
  };
  
  const handleCancelEdit = () => {
      setEditingMessage(null);
      setEditedContent('');
  };

  const handleSaveEdit = async () => {
      if (!editingMessage || editedContent.trim() === '') return;

      const { error } = await supabase
        .from('messages')
        .update({ content: editedContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingMessage.id);
      
      if (error) {
          toast.error(t('chat.error_saving_edit', { defaultValue: 'Erro ao salvar edição.' }));
      }
      handleCancelEdit();
  };

  const handleDeleteMessage = async () => {
      if (!confirmDeleteMessage) return;
      const { error } = await supabase.from('messages').delete().eq('id', confirmDeleteMessage.id);
      if (error) {
          toast.error(t('chat.error_deleting', { defaultValue: 'Erro ao apagar mensagem.' }));
      } else {
          toast.success(t('chat.message_deleted', { defaultValue: 'Mensagem apagada.' }));
      }
      setConfirmDeleteMessage(null);
  };

  const handleDeleteConversation = async () => {
      if (!conversationId) return;
      await deleteConversation(conversationId);
      onClose();
  };

  const handleViewOnceClick = useCallback(async (message: MessageType) => {
    const isOwn = currentUser && message.sender_id === currentUser.id;

    if (message.viewed_at && !isOwn) return;
    if (isOwn && message.viewed_at) return;

    let isAudio = false;
    let audioUrl = null;
    try {
        const parsed = JSON.parse(message.content);
        if (parsed.type === 'audio') {
            isAudio = true;
            audioUrl = parsed.url;
        }
    } catch (e) {}

    if (!isAudio && !message.image_url) return;

    if (!isOwn && !message.viewed_at) {
        const nowStr = new Date().toISOString();

        // 1. Immediately update database to mark as viewed
        const { error } = await supabase
            .from('messages')
            .update({ viewed_at: nowStr })
            .eq('id', message.id);
            
        if (error) {
            console.error("Failed to mark media as viewed in database", error);
            toast.error(t('chat.error_opening_media', { defaultValue: 'Não foi possível abrir a mídia.' }));
            return;
        }

        // 2. Immediately update local state to avoid race conditions or double-clicking
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === message.id ? { ...msg, viewed_at: nowStr } : msg
            )
        );
    }

    // 3. Open appropriate view-once modal
    if (isAudio && audioUrl) {
        setViewingOnceAudio(message);
    } else if (message.image_url) {
        setViewingOncePhoto(message);
    }
  }, [t, currentUser]);

  if (!currentUser) return null;
  
  const statusText = formatLastSeen(user.last_seen);
  const isOnline = onlineUsers.includes(user.id) || statusText === 'Online' || statusText === 'Online Agora' || statusText === t('profile_modal.online_now', { defaultValue: 'Online Agora' });
  const isPremiumUser = currentUser.subscription_tier === 'plus';

  const handleOpenProfile = () => {
      const fullChatUser = useUiStore.getState().chatUser;
      if (fullChatUser) {
          useMapStore.getState().setSelectedUser(fullChatUser as any);
      }
  };

  return (
    <>
    <div className="fixed bottom-0 right-0 sm:right-4 md:right-8 w-full sm:w-[400px] h-full sm:h-[600px] bg-dark-900/95 backdrop-blur-xl shadow-2xl rounded-t-3xl sm:rounded-3xl z-[60] flex flex-col animate-slide-in-up border border-white/10 overflow-hidden">
      <header className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex-shrink-0 z-20">
        <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors -ml-2"
            onClick={handleOpenProfile}
        >
          <div className="relative">
            <img loading="lazy" src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700" />
            {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-slate-900 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white leading-none font-outfit text-lg">{user.name}</h3>
              {user.is_verified && (
                  <span className="material-symbols-rounded filled text-primary-500 !text-[14px]" title="Verificado">verified</span>
              )}
              {user.subscription_tier === 'plus' && (
                  <span className="material-symbols-rounded filled !text-[14px] text-yellow-400 drop-shadow-sm">auto_awesome</span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">{isOnline ? t('profile_modal.online_now', { defaultValue: 'Online Agora' }) : statusText}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setConfirmDeleteConvo(true)} className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-white/5 active:scale-90">
                <span className="material-symbols-rounded text-xl">delete</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 active:scale-90">
                <span className="material-symbols-rounded filled">close</span>
            </button>
        </div>
      </header>
      
      {connectionStatus === 'pending_incoming' && (
          <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border-b border-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 z-20 animate-fade-in">
              <div className="text-center sm:text-left">
                  <p className="text-sm font-bold text-white">Solicitação de Conexão</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">Esta pessoa enviou uma solicitação de conversa.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                  <button 
                      onClick={handleRejectConnection} 
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-full transition-colors border border-white/5 flex items-center gap-1.5"
                  >
                      <span className="material-symbols-rounded text-sm">close</span>
                      Recusar
                  </button>
                  <button 
                      onClick={handleAcceptConnection} 
                      className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold text-xs rounded-full transition-colors border border-white/5 flex items-center gap-1.5"
                  >
                      <span className="material-symbols-rounded text-sm">check</span>
                      Aceitar
                  </button>
              </div>
          </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto bg-dark-900 scroll-smooth pb-24">
        {currentUser.current_checkin_venue_id && user.current_checkin_venue_id && currentUser.current_checkin_venue_id === user.current_checkin_venue_id && (
            <div className="mx-auto mb-4 bg-primary-900/30 border border-primary-500/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in shadow-lg w-[90%]">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-rounded text-white">celebration</span>
                </div>
                <div>
                    <p className="text-xs font-bold text-primary-300 uppercase">{t('chat.icebreaker', { defaultValue: 'Quebra-gelo' })}</p>
                    <p className="text-sm text-white font-medium">Vocês dois estão no <strong>{user.current_checkin_venue_name}</strong> agora!</p>
                </div>
            </div>
        )}
        <div className="flex flex-col space-y-2">
          {hasMoreMessages && (
              <div className="flex justify-center py-2">
                  <button 
                      onClick={handleLoadMoreMessages} 
                      disabled={loadingMoreMessages}
                      className="bg-slate-800 text-slate-300 text-xs px-4 py-1.5 rounded-full border border-white/10 hover:bg-slate-700 transition-colors"
                  >
                      {loadingMoreMessages ? t('chat.loading', { defaultValue: 'Carregando...' }) : t('chat.load_more', { defaultValue: 'Carregar mensagens anteriores' })}
                  </button>
              </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender_id === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender_id === currentUser.id ? 'flex-row-reverse' : 'flex-row'}`}>
                 {/* Avatar for incoming messages */}
                 {msg.sender_id !== currentUser.id && (
                    <img loading="lazy" src={user.imageUrl} className="w-6 h-6 rounded-full self-end mb-1 ring-1 ring-white/10" />
                 )}
                 
                 {editingMessage?.id === msg.id ? (
                     <div className="w-full bg-slate-800 rounded-2xl p-3 border border-primary-500/50 shadow-lg animate-fade-in">
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
                            className="w-full bg-slate-900 rounded-xl py-2 px-3 text-white text-sm focus:outline-none resize-none border border-white/10"
                            rows={2}
                        />
                        <div className="flex justify-end gap-3 mt-2 text-xs font-bold">
                            <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white transition-colors">{t('common.cancel', { defaultValue: 'CANCELAR' })}</button>
                            <button onClick={handleSaveEdit} className="text-primary-500 hover:text-primary-400 transition-colors">{t('common.save', { defaultValue: 'SALVAR' })}</button>
                        </div>
                     </div>
                 ) : (
                    <div className={`px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm border border-white/5 ${
                        msg.sender_id === currentUser.id 
                        ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-2xl rounded-tr-none' 
                        : 'bg-slate-800/80 text-slate-100 rounded-2xl rounded-tl-none'
                    }`}>
                        <MessageContent message={msg} onViewOnceClick={handleViewOnceClick} onAlbumClick={handleAlbumClick} t={t} isOwn={msg.sender_id === currentUser.id} />
                    </div>
                 )}
                
                 {/* Options Button (3 dots) */}
                 {msg.sender_id === currentUser.id && !editingMessage && !msg.is_view_once && !msg.image_url && !msg.content?.includes('"type":') && (
                    <div className="relative opacity-0 hover:opacity-100 transition-opacity self-center group-hover:opacity-100">
                        <button onClick={() => setMessageOptions(msg)} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors">
                            <span className="material-symbols-rounded text-base">more_vert</span>
                        </button>
                        {messageOptions?.id === msg.id && (
                             <div className="absolute bottom-full right-0 mb-1 w-32 bg-slate-800 rounded-xl shadow-2xl z-30 border border-white/10 overflow-hidden animate-fade-in-up origin-bottom-right">
                                <button onClick={() => handleStartEdit(msg)} className="w-full text-xs font-bold p-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                                    <span className="material-symbols-rounded text-base">edit</span> {t('common.edit', { defaultValue: 'Editar' })}
                                </button>
                                <div className="h-px bg-white/5"></div>
                                <button onClick={() => { setConfirmDeleteMessage(msg); setMessageOptions(null); }} className="w-full text-xs font-bold p-3 text-left text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                                    <span className="material-symbols-rounded text-base">delete</span> {t('common.delete', { defaultValue: 'Apagar' })}
                                </button>
                             </div>
                        )}
                    </div>
                )}

              </div>
              <div className={`mt-1 px-1 ${msg.sender_id === currentUser.id ? 'self-end' : 'self-start ml-9'}`}>
                 <MessageStatus msg={msg} currentUserId={currentUser.id} isPremium={isPremiumUser} t={t} />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      {!editingMessage && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-slate-900 border-t border-white/10 z-20">
            {connectionStatus === 'pending_incoming' ? (
                <div className="py-3.5 px-4 bg-slate-800/40 rounded-2xl border border-white/5 text-center animate-fade-in shadow-inner">
                    <p className="text-xs text-slate-300 font-sans">Aceite a solicitação acima para poder responder a esta conversa.</p>
                </div>
            ) : connectionStatus === 'pending_outgoing' ? (
                <div className="py-3.5 px-4 bg-slate-800/40 rounded-2xl border border-white/5 text-center animate-fade-in shadow-inner">
                    <p className="text-xs text-slate-400 font-sans">Aguardando que {user.name} aceite sua solicitação de conexão.</p>
                </div>
            ) : (
                <>
                     {isAttachmentMenuOpen && (
                        <div className="absolute bottom-16 left-3 w-48 bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-1.5 animate-fade-in-up border border-white/10 z-30">
                            <button onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }} className="w-full flex items-center gap-3 text-left p-3 rounded-xl hover:bg-white/10 text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
                                    <span className="material-symbols-rounded text-lg">image</span>
                                </div>
                                <span className="text-sm font-bold">{t('chat.photo', { defaultValue: 'Foto' })}</span>
                            </button>
                             <button onClick={handleSendLocation} className="w-full flex items-center gap-3 text-left p-3 rounded-xl hover:bg-white/10 text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                    <span className="material-symbols-rounded text-lg">location_on</span>
                                </div>
                                <span className="text-sm font-bold">{t('chat.location', { defaultValue: 'Localização' })}</span>
                            </button>
                             <button onClick={() => { setAttachmentMenuOpen(false); setIsAlbumSelectorOpen(true); }} className="w-full flex items-center gap-3 text-left p-3 rounded-xl hover:bg-white/10 text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-secondary-500/20 flex items-center justify-center text-secondary-400">
                                    <span className="material-symbols-rounded text-lg">photo_album</span>
                                </div>
                                <span className="text-sm font-bold">{t('chat.private_album', { defaultValue: 'Álbum Privado' })}</span>
                            </button>
                        </div>
                    )}
                    
                    {imageToSend ? (
                        <div className="p-3 space-y-3 bg-slate-800 rounded-3xl border border-white/10 shadow-xl animate-slide-in-up">
                            <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-black/50 border border-white/5">
                                <img loading="lazy" src={imageToSend.preview} alt="Preview" className="w-full h-full object-contain" />
                                <button onClick={cancelImageSend} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition-colors backdrop-blur-sm">
                                    <span className="material-symbols-rounded text-xl">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsViewOnce(!isViewOnce)} 
                                    className={`flex-shrink-0 h-12 px-4 rounded-2xl transition-all font-bold text-sm flex items-center gap-2 ${isViewOnce ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} 
                                >
                                    <span className={`material-symbols-rounded text-xl ${isViewOnce ? 'filled animate-pulse' : ''}`}>local_fire_department</span>
                                    {isViewOnce ? t('chat.once_active', { defaultValue: '1x Ativo' }) : '1x'}
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={t('chat.caption_placeholder', { defaultValue: 'Legenda (opcional)...' })}
                                    className="flex-1 bg-slate-900 rounded-2xl py-3.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 border border-white/5 text-sm"
                                />
                                <button 
                                    type="submit" 
                                    className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-900/30"
                                >
                                    <span className="material-symbols-rounded text-2xl filled">send</span>
                                </button>
                            </form>
                        </div>
                      ) : audioToSend ? (
                        <div className="p-3 space-y-3 bg-slate-800 rounded-3xl border border-white/10 shadow-xl animate-slide-in-up">
                            <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded-2xl border border-white/5">
                                <AudioPreviewPlayer src={audioToSend.preview} />
                                
                                {/* Interactive Fire toggle for View Once Audio */}
                                <button 
                                    type="button" 
                                    onClick={() => setIsViewOnce(!isViewOnce)} 
                                    className={`flex-shrink-0 h-10 px-3.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 ${isViewOnce ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30 font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                    title={t('chat.toggle_view_once', { defaultValue: 'Visualização Única' })}
                                >
                                    <span className={`material-symbols-rounded text-lg ${isViewOnce ? 'filled animate-pulse' : ''}`}>local_fire_department</span>
                                    <span>{isViewOnce ? t('chat.once_active', { defaultValue: '1x Ativo' }) : t('chat.view_once', { defaultValue: 'Ver 1x' })}</span>
                                </button>
        
                                <button 
                                    type="button" 
                                    onClick={cancelAudioSend}
                                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-rounded text-xl">delete</span>
                                </button>
        
                                <button 
                                    type="button"
                                    onClick={handleSendAudioPreview} 
                                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-900/20"
                                >
                                    <span className="material-symbols-rounded text-xl filled">send</span>
                                </button>
                            </div>
                            {isViewOnce && (
                                <div className="flex items-center gap-1.5 text-[11px] text-orange-400 font-semibold bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/5 animate-fade-in">
                                    <span className="material-symbols-rounded text-sm filled animate-pulse">local_fire_department</span>
                                    <span>{t('chat.audio_view_once_tip', { defaultValue: 'Este áudio só poderá ser ouvido uma única vez pelo destinatário.' })}</span>
                                </div>
                            )}
                        </div>
                      ) : (
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleFileSelect}/>
                            <button 
                                type="button" 
                                onClick={() => setAttachmentMenuOpen(prev => !prev)} 
                                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all ${isAttachmentMenuOpen ? 'bg-slate-800 text-white rotate-45' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-rounded text-2xl">add</span>
                            </button>
                            <div className="flex-1 relative bg-slate-800 rounded-full border border-white/5 overflow-hidden">
                                {isRecording ? (
                                    <div className="w-full bg-transparent py-2.5 px-4 text-red-400 font-bold flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                            <span>{t('chat.recording', { defaultValue: 'Gravando...' })} {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                        <button type="button" onClick={cancelRecording} className="text-slate-400 hover:text-white">{t('common.cancel', { defaultValue: 'Cancelar' })}</button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={t('chat.type_message', { defaultValue: 'Digite uma mensagem...' })}
                                        className="w-full bg-transparent py-2.5 px-4 text-white placeholder-slate-400 focus:outline-none text-sm"
                                    />
                                )}
                            </div>
                            {newMessage.trim() ? (
                                <button 
                                    type="submit" 
                                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all hover:scale-105 active:scale-95"
                                >
                                    <span className="material-symbols-rounded text-lg filled">send</span>
                                </button>
                            ) : isRecording ? (
                                <button 
                                    type="button" 
                                    onClick={stopRecording}
                                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all hover:scale-105 active:scale-95 animate-pulse"
                                >
                                    <span className="material-symbols-rounded text-lg filled">stop</span>
                                </button>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={startRecording}
                                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-800 text-slate-400 rounded-full hover:bg-primary-500 hover:text-white transition-all hover:scale-105 active:scale-95 border border-white/5"
                                >
                                    <span className="material-symbols-rounded text-lg filled">mic</span>
                                </button>
                            )}
                        </form>
                    )}
                </>
            )}
        </div>
      )}
    </div>
    {confirmDeleteMessage && (
        <ConfirmationModal
            isOpen={!!confirmDeleteMessage}
            title={t('chat.delete_msg_title', { defaultValue: 'Apagar Mensagem' })}
            message={t('chat.delete_msg_desc', { defaultValue: 'Tem certeza que deseja apagar esta mensagem? Esta ação não pode ser desfeita.' })}
            onConfirm={handleDeleteMessage}
            onCancel={() => setConfirmDeleteMessage(null)}
            confirmText={t('common.delete', { defaultValue: 'Apagar' })}
        />
    )}
     {confirmDeleteConvo && (
        <ConfirmationModal
            isOpen={confirmDeleteConvo}
            title={t('chat.delete_convo_title', { defaultValue: 'Apagar Conversa' })}
            message={t('chat.delete_convo_desc', { defaultValue: 'Tem certeza que deseja apagar toda a conversa com este usuário? Esta ação é permanente.' })}
            onConfirm={handleDeleteConversation}
            onCancel={() => setConfirmDeleteConvo(false)}
            confirmText={t('chat.delete_convo', { defaultValue: 'Apagar Conversa' })}
        />
    )}
    {isAlbumSelectorOpen && (
        <SelectAlbumModal 
            onClose={() => setIsAlbumSelectorOpen(false)}
            onSelect={handleSelectAlbum}
        />
    )}
    {activeAlbum && (
        <AlbumGalleryModal
            album={activeAlbum}
            onClose={() => setActiveAlbum(null)}
        />
    )}
    {messageOptions && (
        <div className="fixed inset-0 z-20" onClick={() => setMessageOptions(null)}></div>
    )}
    {viewingOncePhoto && (
        <ViewOncePhotoModal
            imageUrl={viewingOncePhoto.image_url ? getPublicImageUrl(viewingOncePhoto.image_url) : ''}
            onClose={async () => {
                const isOwn = currentUser && viewingOncePhoto.sender_id === currentUser.id;
                const pathToDelete = viewingOncePhoto.image_url;
                const msgId = viewingOncePhoto.id;
                setViewingOncePhoto(null);

                // If the sender viewed their own sent image, DO NOT expire or delete it!
                if (isOwn) return;

                // 1. Permanently erase image_url from database row for recipient
                const { error: dbError } = await supabase
                    .from('messages')
                    .update({ image_url: null, viewed_at: new Date().toISOString() })
                    .eq('id', msgId);
                
                if (dbError) {
                    console.error("Error clearing image_url from database:", dbError);
                }

                // 2. Reflect in local messages state
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, image_url: null, viewed_at: m.viewed_at || new Date().toISOString() } : m));

                // 3. Delete from bucket storage
                if (pathToDelete) {
                    try {
                        const { error } = await supabase.storage.from('user_uploads').remove([pathToDelete]);
                        if (error) {
                            console.error("Error deleting view-once image from storage on close:", error);
                        } else {
                            console.log("Successfully deleted view-once photo from storage on close:", pathToDelete);
                        }
                    } catch (e) {
                        console.error("Error deleting view-once image:", e);
                    }
                }
            }}
        />
    )}
    {viewingOnceAudio && (
        <ViewOnceAudioModal
            audioUrl={(() => {
                try {
                    const parsed = JSON.parse(viewingOnceAudio.content);
                    return parsed.url ? getPublicImageUrl(parsed.url) : '';
                } catch(e) {
                    return '';
                }
            })()}
            onClose={async () => {
                const isOwn = currentUser && viewingOnceAudio.sender_id === currentUser.id;
                let pathToDelete = null;
                try {
                    const parsed = JSON.parse(viewingOnceAudio.content);
                    if (parsed.type === 'audio') {
                        pathToDelete = parsed.url;
                    }
                } catch(e) {}

                const msgId = viewingOnceAudio.id;
                setViewingOnceAudio(null);

                // If the sender listened to their own sent audio, DO NOT expire or delete it!
                if (isOwn) return;

                // 1. Permanently erase audio URL reference from message content JSON in DB
                const { error: dbError } = await supabase
                    .from('messages')
                    .update({ content: JSON.stringify({ type: 'audio', url: null }), viewed_at: new Date().toISOString() })
                    .eq('id', msgId);

                if (dbError) {
                    console.error("Error clearing audio url from database content:", dbError);
                }

                // 2. Reflect in local messages state
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: JSON.stringify({ type: 'audio', url: null }), viewed_at: m.viewed_at || new Date().toISOString() } : m));

                // 3. Delete from bucket storage
                if (pathToDelete) {
                    try {
                        const { error } = await supabase.storage.from('user_uploads').remove([pathToDelete]);
                        if (error) {
                            console.error("Error deleting view-once audio from storage on close:", error);
                        } else {
                            console.log("Successfully deleted view-once audio from storage on close:", pathToDelete);
                        }
                    } catch (e) {
                        console.error("Error deleting view-once audio:", e);
                    }
                }
            }}
        />
    )}
    </>
  );
};

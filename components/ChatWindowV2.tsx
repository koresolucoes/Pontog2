import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { formatLastSeen } from '../lib/utils';
import { useHardwareBack } from '../lib/useHardwareBack';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useInboxStore } from '../stores/inboxStore';
import { useAlbumStore } from '../stores/albumStore';
import { useUiStore } from '../stores/uiStore';
import { socialActions, type ConnectionState } from '../modules/social/public';
import type { Message as MessageType, PrivateAlbum } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { SelectAlbumModal } from './SelectAlbumModal';
import { AlbumGalleryModal } from './AlbumGalleryModal';
import { ViewOncePhotoModal } from './ViewOncePhotoModal';
import { ViewOnceAudioModal } from './ViewOnceAudioModal';

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

type AttachmentMode = 'photo' | 'photo_once' | 'album' | 'location';

type ParsedMessage =
  | { type: 'location'; lat: number; lng: number }
  | { type: 'album'; albumId: number; albumName?: string; expiresAt?: string | null; isViewOnce?: boolean }
  | { type: 'audio'; url: string | null }
  | null;

const parseMessage = (content?: string | null): ParsedMessage => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || !parsed.type) return null;
    if (parsed.type === 'location' && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
    if (parsed.type === 'album' && parsed.albumId) return parsed;
    if (parsed.type === 'audio') return parsed;
  } catch {
    return null;
  }
  return null;
};

const formatRecordingTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const AudioPreview: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <audio
        ref={audioRef}
        src={src}
        className="hidden"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
      <button
        type="button"
        className="pg-icon-btn !h-10 !w-10 shrink-0 !border-primary-500/20 !bg-primary-500/10 !text-primary-300"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (playing) {
            audio.pause();
            setPlaying(false);
          } else {
            audio.play().then(() => setPlaying(true)).catch(() => toast.error('Não foi possível reproduzir o áudio.'));
          }
        }}
        aria-label={playing ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        <span className="material-symbols-rounded filled text-xl">{playing ? 'pause' : 'play_arrow'}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary-500 transition-[width] duration-100" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-white/38">
          <span>{formatRecordingTime(Math.floor(currentTime))}</span>
          <span>{formatRecordingTime(Math.floor(duration || 0))}</span>
        </div>
      </div>
    </div>
  );
};

export const ChatWindowV2 = React.memo<ChatWindowProps>(({ user, onClose }) => {
  useHardwareBack(true, onClose);

  const currentUser = useAuthStore((state) => state.user);
  const onlineUsers = useMapStore((state) => state.onlineUsers);
  const clearUnreadCountForConversation = useInboxStore((state) => state.clearUnreadCountForConversation);
  const deleteConversation = useInboxStore((state) => state.deleteConversation);
  const fetchConversations = useInboxStore((state) => state.fetchConversations);
  const { uploadPhoto, uploadAudio, grantAccess, fetchAlbumById } = useAlbumStore();

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [imageToSend, setImageToSend] = useState<{ file: File; preview: string } | null>(null);
  const [audioToSend, setAudioToSend] = useState<{ file: File; preview: string } | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isAlbumSelectorOpen, setAlbumSelectorOpen] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<PrivateAlbum | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [messageOptions, setMessageOptions] = useState<MessageType | null>(null);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<MessageType | null>(null);
  const [confirmDeleteConversation, setConfirmDeleteConversation] = useState(false);
  const [viewingOncePhoto, setViewingOncePhoto] = useState<MessageType | null>(null);
  const [viewingOnceAudio, setViewingOnceAudio] = useState<MessageType | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useHardwareBack(attachmentsOpen, () => setAttachmentsOpen(false));
  useHardwareBack(!!imageToSend, () => setImageToSend(null));
  useHardwareBack(!!audioToSend, () => setAudioToSend(null));
  useHardwareBack(isAlbumSelectorOpen, () => setAlbumSelectorOpen(false));
  useHardwareBack(!!activeAlbum, () => setActiveAlbum(null));
  useHardwareBack(!!messageOptions, () => setMessageOptions(null));
  useHardwareBack(!!confirmDeleteMessage, () => setConfirmDeleteMessage(null));
  useHardwareBack(confirmDeleteConversation, () => setConfirmDeleteConversation(false));

  const isOnline = useMemo(() => {
    const status = formatLastSeen(user.last_seen || null);
    return onlineUsers.includes(user.id) || status === 'Online' || status === 'Online Agora';
  }, [onlineUsers, user.id, user.last_seen]);

  const connectionMode = useMemo<'pending_incoming' | 'pending_outgoing' | 'accepted' | 'none'>(() => {
    if (!connection || !currentUser) return 'none';
    if (connection.status === 'accepted') return 'accepted';
    return connection.follower_id === currentUser.id ? 'pending_outgoing' : 'pending_incoming';
  }, [connection, currentUser]);

  const canCompose = connectionMode !== 'pending_incoming' && connectionMode !== 'pending_outgoing';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const markMessagesAsRead = useCallback(async (messageIds: number[], convId: number | null) => {
    if (!messageIds.length || !convId) return;
    const { error } = await supabase.rpc('mark_messages_as_read', { message_ids: messageIds });
    if (error) {
      console.error('Error marking messages as read:', error);
      return;
    }
    const now = new Date().toISOString();
    setMessages((previous) => previous.map((message) => messageIds.includes(message.id) ? { ...message, read_at: now } : message));
    clearUnreadCountForConversation(convId);
  }, [clearUnreadCountForConversation]);

  useEffect(() => {
    let cancelled = false;
    const loadConnection = async () => {
      if (!currentUser || !user.id) return;
      setLoadingConnection(true);
      try {
        const state = await socialActions.getConnectionState(user.id);
        if (!cancelled) setConnection(state);
      } catch (error) {
        console.error('Error fetching safe connection state:', error);
        if (!cancelled) setConnection(null);
      } finally {
        if (!cancelled) setLoadingConnection(false);
      }
    };
    loadConnection();
    return () => { cancelled = true; };
  }, [currentUser?.id, user.id]);

  useEffect(() => {
    let cancelled = false;
    const setupConversation = async () => {
      if (!currentUser?.id || !user.id) return;
      const { data, error } = await supabase.rpc('get_or_create_conversation', { p_one: currentUser.id, p_two: user.id });
      if (error || !data) {
        console.error('Error setting up conversation:', error);
        toast.error('Não foi possível carregar a conversa.');
        return;
      }
      if (cancelled) return;
      const convId = Number(data);
      setConversationId(convId);

      const { data: initialMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }
      if (cancelled) return;

      const sorted = [...(initialMessages || [])].reverse() as MessageType[];
      setMessages(sorted);
      setHasMoreMessages((initialMessages || []).length === 50);
      const unreadIds = sorted.filter((message) => message.sender_id !== currentUser.id && !message.read_at).map((message) => message.id);
      if (unreadIds.length) markMessagesAsRead(unreadIds, convId);
      requestAnimationFrame(() => scrollToBottom('auto'));
    };
    setupConversation();
    return () => { cancelled = true; };
  }, [currentUser?.id, user.id, markMessagesAsRead, scrollToBottom]);

  useEffect(() => {
    if (!conversationId || !currentUser?.id) return;
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const incoming = payload.new as MessageType;
          setMessages((previous) => previous.some((message) => message.id === incoming.id) ? previous : [...previous, incoming]);
          if (incoming.sender_id !== currentUser.id) markMessagesAsRead([incoming.id], conversationId);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as MessageType;
          setMessages((previous) => previous.map((message) => message.id === updated.id ? { ...message, ...updated } : message));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = Number((payload.old as MessageType).id);
          setMessages((previous) => previous.filter((message) => message.id !== deletedId));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id, markMessagesAsRead]);

  useEffect(() => {
    if (messages.length) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (imageToSend?.preview) URL.revokeObjectURL(imageToSend.preview);
    if (audioToSend?.preview) URL.revokeObjectURL(audioToSend.preview);
  }, []);

  const refreshConnection = async () => {
    try {
      setConnection(await socialActions.getConnectionState(user.id));
    } catch (error) {
      console.error('Error refreshing connection:', error);
    }
  };

  const handleAcceptConnection = async () => {
    if (!connection?.id) return;
    try {
      await socialActions.acceptConnection(connection.id);
      await refreshConnection();
      fetchConversations(true);
      toast.success('Conexão aceita. Agora vocês podem conversar.');
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast.error('Não foi possível aceitar a conexão.');
    }
  };

  const handleRejectConnection = async () => {
    if (!connection?.id) return;
    try {
      await socialActions.rejectConnection(connection.id);
      setConnection(null);
      fetchConversations(true);
      toast.success('Pedido recusado.');
    } catch (error) {
      console.error('Error rejecting connection:', error);
      toast.error('Não foi possível recusar o pedido.');
    }
  };

  const sendMessage = async (content: string | null, imageUrl: string | null = null, viewOnce = false, audioUrl: string | null = null) => {
    if ((!content || !content.trim()) && !imageUrl && !audioUrl) return false;
    if (!currentUser || !conversationId) return false;

    const finalContent = audioUrl ? JSON.stringify({ type: 'audio', url: audioUrl }) : content;
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      conversation_id: conversationId,
      content: finalContent,
      image_url: imageUrl,
      is_view_once: viewOnce,
    });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Não foi possível enviar a mensagem.');
      return false;
    }

    const { session } = (await supabase.auth.getSession()).data;
    if (session) {
      const isPlainText = !!content && !parseMessage(content);
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          receiver_id: user.id,
          message_content: isPlainText && content && content.length <= 50 ? content : 'Nova mensagem no Ponto G',
        }),
      }).catch((error) => console.error('Error sending push:', error));
    }
    return true;
  };

  const handleSendText = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = newMessage.trim();
    if (!text) return;
    if (await sendMessage(text)) setNewMessage('');
  };

  const handleLoadMore = async () => {
    if (!hasMoreMessages || loadingMoreMessages || !conversationId || !messages.length) return;
    setLoadingMoreMessages(true);
    const oldest = messages[0];
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) console.error('Error loading older messages:', error);
    else {
      const older = [...(data || [])].reverse() as MessageType[];
      setMessages((previous) => [...older, ...previous]);
      setHasMoreMessages((data || []).length === 50);
    }
    setLoadingMoreMessages(false);
  };

  const chooseAttachment = (mode: AttachmentMode) => {
    setAttachmentsOpen(false);
    if (mode === 'photo' || mode === 'photo_once') {
      setIsViewOnce(mode === 'photo_once');
      imageInputRef.current?.click();
      return;
    }
    if (mode === 'album') {
      setAlbumSelectorOpen(true);
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Localização não está disponível neste dispositivo.');
      return;
    }
    const toastId = toast.loading('Obtendo sua localização…');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        toast.dismiss(toastId);
        await sendMessage(JSON.stringify({ type: 'location', lat: coords.latitude, lng: coords.longitude }));
      },
      (error) => {
        toast.dismiss(toastId);
        console.error('Geolocation error:', error);
        toast.error('Não foi possível acessar sua localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem pode ter no máximo 5 MB.');
      event.target.value = '';
      return;
    }
    const preview = URL.createObjectURL(file);
    setImageToSend({ file, preview });
    event.target.value = '';
  };

  const cancelImage = () => {
    if (imageToSend?.preview) URL.revokeObjectURL(imageToSend.preview);
    setImageToSend(null);
    setIsViewOnce(false);
    setNewMessage('');
  };

  const handleSendImage = async () => {
    if (!imageToSend) return;
    const toastId = toast.loading('Enviando foto…');
    const path = await uploadPhoto(imageToSend.file);
    if (!path) {
      toast.error('Não foi possível enviar a foto.', { id: toastId });
      return;
    }
    const sent = await sendMessage(newMessage.trim() || null, path, isViewOnce);
    if (sent) {
      cancelImage();
      toast.success(isViewOnce ? 'Foto 1x enviada.' : 'Foto enviada.', { id: toastId });
    } else toast.dismiss(toastId);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        recordingIntervalRef.current = setInterval(() => setRecordingTime((value) => value + 1), 1000);
      };
      recorder.onstop = () => {
        setIsRecording(false);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
        if (audioChunksRef.current.length) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
          setAudioToSend({ file, preview: URL.createObjectURL(blob) });
        }
        recorder.stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  const cancelAudio = () => {
    if (audioToSend?.preview) URL.revokeObjectURL(audioToSend.preview);
    setAudioToSend(null);
    setIsViewOnce(false);
  };

  const handleSendAudio = async () => {
    if (!audioToSend) return;
    const toastId = toast.loading('Enviando áudio…');
    const path = await uploadAudio(audioToSend.file);
    if (!path) {
      toast.error('Não foi possível enviar o áudio.', { id: toastId });
      return;
    }
    const sent = await sendMessage(null, null, isViewOnce, path);
    if (sent) {
      cancelAudio();
      toast.success(isViewOnce ? 'Áudio 1x enviado.' : 'Áudio enviado.', { id: toastId });
    } else toast.dismiss(toastId);
  };

  const handleSelectAlbum = async (album: PrivateAlbum & { is_view_once?: boolean; expires_in_hours?: number }) => {
    setAlbumSelectorOpen(false);
    const toastId = toast.loading('Compartilhando álbum…');
    try {
      await grantAccess(album.id, user.id);
      const expiresAt = album.expires_in_hours ? new Date(Date.now() + album.expires_in_hours * 3600000).toISOString() : null;
      await sendMessage(JSON.stringify({
        type: 'album',
        albumId: album.id,
        albumName: album.name,
        isViewOnce: !!album.is_view_once,
        expiresAt,
      }));
      toast.success('Álbum compartilhado.', { id: toastId });
    } catch (error) {
      console.error('Error sharing album:', error);
      toast.error('Não foi possível compartilhar o álbum.', { id: toastId });
    }
  };

  const handleAlbumClick = async (message: MessageType, parsed: Extract<ParsedMessage, { type: 'album' }>) => {
    const isOwn = message.sender_id === currentUser?.id;
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      toast.error('O acesso a este álbum expirou.');
      return;
    }
    if (parsed.isViewOnce && message.viewed_at && !isOwn) {
      toast.error('Este álbum de visualização única já foi aberto.');
      return;
    }
    const toastId = toast.loading('Carregando álbum…');
    const album = await fetchAlbumById(parsed.albumId);
    toast.dismiss(toastId);
    if (!album) {
      toast.error('Álbum não encontrado ou sem acesso.');
      return;
    }
    if (parsed.isViewOnce && !isOwn && !message.viewed_at) {
      const viewedAt = new Date().toISOString();
      const { error } = await supabase.from('messages').update({ viewed_at: viewedAt }).eq('id', message.id);
      if (!error) setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, viewed_at: viewedAt } : item));
    }
    setActiveAlbum(album);
  };

  const openViewOnce = async (message: MessageType) => {
    const isOwn = message.sender_id === currentUser?.id;
    if (message.viewed_at && !isOwn) return;
    const parsed = parseMessage(message.content);
    const isAudio = parsed?.type === 'audio';
    if (!message.image_url && !isAudio) return;

    if (!isOwn && !message.viewed_at) {
      const viewedAt = new Date().toISOString();
      const { error } = await supabase.from('messages').update({ viewed_at: viewedAt }).eq('id', message.id);
      if (error) {
        toast.error('Não foi possível abrir a mídia.');
        return;
      }
      setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, viewed_at: viewedAt } : item));
    }

    if (isAudio) setViewingOnceAudio(message);
    else setViewingOncePhoto(message);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editedContent.trim()) return;
    const { error } = await supabase.from('messages').update({ content: editedContent.trim(), updated_at: new Date().toISOString() }).eq('id', editingMessage.id);
    if (error) toast.error('Não foi possível salvar a edição.');
    setEditingMessage(null);
    setEditedContent('');
  };

  const handleDeleteMessage = async () => {
    if (!confirmDeleteMessage) return;
    const { error } = await supabase.from('messages').delete().eq('id', confirmDeleteMessage.id);
    if (error) toast.error('Não foi possível apagar a mensagem.');
    else toast.success('Mensagem apagada.');
    setConfirmDeleteMessage(null);
  };

  const handleDeleteConversation = async () => {
    if (!conversationId) return;
    await deleteConversation(conversationId);
    onClose();
  };

  const handleOpenProfile = () => {
    const fullChatUser = useUiStore.getState().chatUser;
    if (fullChatUser) useMapStore.getState().setSelectedUser(fullChatUser as any);
  };

  const renderMessageContent = (message: MessageType) => {
    const parsed = parseMessage(message.content);
    const isOwn = message.sender_id === currentUser?.id;

    if (message.is_view_once) {
      const isAudio = parsed?.type === 'audio';
      if (message.viewed_at && !isOwn) {
        return <div className="flex items-center gap-2 text-sm text-white/45"><span className="material-symbols-rounded text-lg">visibility_off</span>{isAudio ? 'Áudio 1x já aberto' : 'Foto 1x já aberta'}</div>;
      }
      if (message.viewed_at && isOwn) {
        return <div className="flex items-center gap-2 text-sm text-emerald-300/80"><span className="material-symbols-rounded text-lg">done_all</span>{isAudio ? 'Áudio aberto' : 'Foto aberta'}</div>;
      }
      return (
        <button type="button" onClick={() => openViewOnce(message)} className="flex w-full items-center gap-3 rounded-2xl border border-primary-500/20 bg-primary-500/10 p-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/15 text-primary-300"><span className="material-symbols-rounded">{isAudio ? 'graphic_eq' : 'photo'}</span></span>
          <span className="min-w-0"><strong className="block text-sm text-white">{isAudio ? 'Áudio 1x' : 'Foto 1x'}</strong><span className="text-xs text-white/45">{isOwn ? 'Pré-visualizar sem consumir' : 'Toque para abrir uma única vez'}</span></span>
        </button>
      );
    }

    if (parsed?.type === 'location') {
      const mapsUrl = `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`;
      return (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-[210px] items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 hover:bg-white/5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300"><span className="material-symbols-rounded filled">location_on</span></span>
          <span><strong className="block text-sm text-white">Localização compartilhada</strong><span className="text-xs text-white/45">Abrir no mapa</span></span>
        </a>
      );
    }

    if (parsed?.type === 'album') {
      const expired = !!parsed.expiresAt && new Date(parsed.expiresAt) < new Date();
      const unavailable = expired || (!!parsed.isViewOnce && !!message.viewed_at && !isOwn);
      return (
        <button
          type="button"
          disabled={unavailable}
          onClick={() => handleAlbumClick(message, parsed)}
          className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 text-left disabled:opacity-45"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-500/12 text-secondary-300"><span className="material-symbols-rounded">photo_library</span></span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{parsed.albumName || 'Álbum privado'}</strong><span className="text-xs text-white/45">{expired ? 'Acesso expirado' : parsed.isViewOnce ? 'Visualização única' : parsed.expiresAt ? `Até ${format(new Date(parsed.expiresAt), 'dd/MM HH:mm')}` : 'Acesso privado'}</span></span>
          {!unavailable && <span className="material-symbols-rounded text-white/30">chevron_right</span>}
        </button>
      );
    }

    if (parsed?.type === 'audio') {
      if (!parsed.url) return <div className="text-sm text-white/45">Áudio indisponível</div>;
      return <audio controls preload="metadata" src={getPublicImageUrl(parsed.url)} className="max-w-[260px]" />;
    }

    return (
      <div className="space-y-2">
        {message.image_url && (
          <button type="button" className="block overflow-hidden rounded-2xl" onClick={() => window.open(getPublicImageUrl(message.image_url!), '_blank', 'noopener,noreferrer')}>
            <img loading="lazy" src={getPublicImageUrl(message.image_url)} alt="Imagem enviada" className="max-h-[340px] w-full max-w-[270px] object-cover" />
          </button>
        )}
        {message.content && <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.content}</p>}
      </div>
    );
  };

  if (!currentUser) return null;

  return (
    <>
      <section className="pg-page fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-hidden text-white">
        <header className="pg-glass relative z-30 flex min-h-[74px] shrink-0 items-center gap-3 border-x-0 border-t-0 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-5">
          <button type="button" onClick={onClose} className="pg-icon-btn shrink-0" aria-label="Voltar para conversas"><span className="material-symbols-rounded">arrow_back</span></button>
          <button type="button" onClick={handleOpenProfile} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left transition hover:bg-white/[0.035]">
            <span className="relative shrink-0">
              <img src={user.imageUrl} alt={user.name} className="h-11 w-11 rounded-full object-cover ring-1 ring-white/10" />
              {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--pg-surface-1)] bg-[var(--pg-online)]" />}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5"><strong className="truncate text-[15px] font-extrabold text-white">{user.name}</strong>{user.is_verified && <span className="material-symbols-rounded filled text-[15px] text-primary-400">verified</span>}</span>
              <span className={`mt-0.5 block truncate text-xs ${isOnline ? 'text-emerald-300' : 'text-white/42'}`}>{isOnline ? 'Online agora' : formatLastSeen(user.last_seen || null)}</span>
            </span>
          </button>
          <button type="button" onClick={() => setConfirmDeleteConversation(true)} className="pg-icon-btn shrink-0 !text-white/55 hover:!text-red-300" aria-label="Opções da conversa"><span className="material-symbols-rounded">delete</span></button>
        </header>

        {!loadingConnection && connectionMode === 'pending_incoming' && (
          <div className="relative z-20 border-b border-primary-500/16 bg-primary-500/[0.07] px-4 py-3 sm:px-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-extrabold text-white">{user.name} quer conversar com você</p><p className="mt-0.5 text-xs text-white/45">Aceite para liberar respostas e recursos da conversa.</p></div>
              <div className="flex gap-2"><button type="button" className="pg-btn pg-btn-secondary !min-h-10 flex-1 !rounded-xl !px-4 text-xs sm:flex-none" onClick={handleRejectConnection}>Recusar</button><button type="button" className="pg-btn pg-btn-primary !min-h-10 flex-1 !rounded-xl !px-4 text-xs sm:flex-none" onClick={handleAcceptConnection}>Aceitar</button></div>
            </div>
          </div>
        )}

        <main className="relative flex-1 overflow-y-auto px-3 py-4 pb-6 sm:px-5">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {currentUser.current_checkin_venue_id && user.current_checkin_venue_id && currentUser.current_checkin_venue_id === user.current_checkin_venue_id && (
              <div className="pg-surface flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-500/12 text-primary-300"><span className="material-symbols-rounded">celebration</span></span>
                <div><p className="pg-eyebrow !text-primary-300/80">Quebra-gelo</p><p className="mt-1 text-sm text-white/72">Vocês estão no <strong className="text-white">{user.current_checkin_venue_name}</strong> agora.</p></div>
              </div>
            )}

            {hasMoreMessages && (
              <button type="button" onClick={handleLoadMore} disabled={loadingMoreMessages} className="pg-chip mx-auto !min-h-9">{loadingMoreMessages ? 'Carregando…' : 'Mensagens anteriores'}</button>
            )}

            {messages.map((message) => {
              const own = message.sender_id === currentUser.id;
              const isPlainText = !message.is_view_once && !message.image_url && !parseMessage(message.content);
              return (
                <div key={message.id} className={`group flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                  <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[72%] ${own ? 'flex-row-reverse' : ''}`}>
                    {!own && <img src={user.imageUrl} alt="" className="mb-1 h-6 w-6 shrink-0 rounded-full object-cover opacity-80" />}
                    <div className="relative min-w-0">
                      {editingMessage?.id === message.id ? (
                        <div className="pg-surface min-w-[260px] p-3">
                          <textarea className="pg-field min-h-[76px] resize-none" value={editedContent} onChange={(event) => setEditedContent(event.target.value)} />
                          <div className="mt-2 flex justify-end gap-2"><button className="pg-btn pg-btn-secondary !min-h-9 !rounded-xl !px-3 text-xs" onClick={() => { setEditingMessage(null); setEditedContent(''); }}>Cancelar</button><button className="pg-btn pg-btn-primary !min-h-9 !rounded-xl !px-3 text-xs" onClick={handleSaveEdit}>Salvar</button></div>
                        </div>
                      ) : (
                        <div className={`${own ? 'rounded-[22px] rounded-br-[7px] bg-gradient-to-br from-primary-500 to-secondary-600 text-white' : 'rounded-[22px] rounded-bl-[7px] border border-white/[0.07] bg-white/[0.055] text-white/88'} px-3.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,.14)]`}>
                          {renderMessageContent(message)}
                        </div>
                      )}
                      {own && isPlainText && !editingMessage && (
                        <button type="button" onClick={() => setMessageOptions(messageOptions?.id === message.id ? null : message)} className="absolute -left-8 top-1/2 hidden -translate-y-1/2 text-white/28 group-hover:block" aria-label="Opções da mensagem"><span className="material-symbols-rounded text-lg">more_horiz</span></button>
                      )}
                      {messageOptions?.id === message.id && (
                        <div className="pg-glass absolute bottom-[calc(100%+6px)] right-0 z-20 min-w-[132px] overflow-hidden rounded-2xl p-1 shadow-2xl">
                          <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-white/75 hover:bg-white/5" onClick={() => { setEditingMessage(message); setEditedContent(message.content || ''); setMessageOptions(null); }}><span className="material-symbols-rounded text-base">edit</span>Editar</button>
                          <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-300 hover:bg-red-500/10" onClick={() => { setConfirmDeleteMessage(message); setMessageOptions(null); }}><span className="material-symbols-rounded text-base">delete</span>Apagar</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {own && <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-white/30"><span>{message.updated_at ? 'editada · ' : ''}{format(new Date(message.created_at), 'HH:mm')}</span><span className={`material-symbols-rounded !text-[12px] ${currentUser.subscription_tier === 'plus' && message.read_at ? 'text-primary-300' : ''}`}>{currentUser.subscription_tier === 'plus' && message.read_at ? 'done_all' : 'check'}</span></div>}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="pg-glass relative z-30 shrink-0 border-x-0 border-b-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="mx-auto max-w-3xl">
            {connectionMode === 'pending_incoming' ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-center text-xs text-white/45">Aceite o pedido acima para responder.</div>
            ) : connectionMode === 'pending_outgoing' ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-center text-xs text-white/45">Aguardando {user.name} aceitar seu pedido de conexão.</div>
            ) : imageToSend ? (
              <div className="pg-surface p-3">
                <div className="relative mb-3 overflow-hidden rounded-[20px] bg-black/30"><img src={imageToSend.preview} alt="Prévia" className="max-h-56 w-full object-contain" /><button type="button" onClick={cancelImage} className="pg-icon-btn absolute right-2 top-2 !h-9 !w-9 !bg-black/55"><span className="material-symbols-rounded">close</span></button></div>
                <div className="flex items-center gap-2"><button type="button" onClick={() => setIsViewOnce((value) => !value)} className={`pg-chip shrink-0 ${isViewOnce ? 'pg-chip-active' : ''}`}><span className="material-symbols-rounded text-base">visibility_off</span>1x</button><input className="pg-field min-w-0 flex-1" value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Legenda opcional…" /><button type="button" onClick={handleSendImage} className="pg-icon-btn !h-12 !w-12 !border-0 !bg-primary-500 !text-white"><span className="material-symbols-rounded filled">send</span></button></div>
              </div>
            ) : audioToSend ? (
              <div className="pg-surface flex items-center gap-2 p-3"><AudioPreview src={audioToSend.preview} /><button type="button" onClick={() => setIsViewOnce((value) => !value)} className={`pg-chip shrink-0 ${isViewOnce ? 'pg-chip-active' : ''}`}>1x</button><button type="button" onClick={cancelAudio} className="pg-icon-btn !h-10 !w-10 !text-red-300"><span className="material-symbols-rounded">delete</span></button><button type="button" onClick={handleSendAudio} className="pg-icon-btn !h-10 !w-10 !border-0 !bg-primary-500 !text-white"><span className="material-symbols-rounded filled">send</span></button></div>
            ) : isRecording ? (
              <div className="flex items-center gap-3 rounded-[22px] border border-red-500/18 bg-red-500/[0.07] p-2.5"><button type="button" onClick={cancelRecording} className="pg-icon-btn !h-10 !w-10 !text-white/50"><span className="material-symbols-rounded">close</span></button><div className="flex min-w-0 flex-1 items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" /><strong className="text-sm text-white">Gravando</strong><span className="font-mono text-xs text-white/45">{formatRecordingTime(recordingTime)}</span></div><button type="button" onClick={stopRecording} className="pg-icon-btn !h-10 !w-10 !border-0 !bg-red-500 !text-white"><span className="material-symbols-rounded filled">stop</span></button></div>
            ) : canCompose ? (
              <form onSubmit={handleSendText} className="flex items-end gap-2">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <button type="button" onClick={() => setAttachmentsOpen((value) => !value)} className={`pg-icon-btn shrink-0 ${attachmentsOpen ? '!rotate-45 !bg-white/10 !text-white' : ''}`} aria-label="Anexar"><span className="material-symbols-rounded text-2xl">add</span></button>
                <div className="min-w-0 flex-1 rounded-[22px] border border-white/[0.07] bg-white/[0.045] px-4 py-2.5 focus-within:border-primary-500/25 focus-within:bg-white/[0.06]"><input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/28" placeholder="Mensagem…" /></div>
                {newMessage.trim() ? <button type="submit" className="pg-icon-btn shrink-0 !border-0 !bg-primary-500 !text-white" aria-label="Enviar"><span className="material-symbols-rounded filled">arrow_upward</span></button> : <button type="button" onClick={startRecording} className="pg-icon-btn shrink-0" aria-label="Gravar áudio"><span className="material-symbols-rounded filled">mic</span></button>}
              </form>
            ) : null}
          </div>

          {attachmentsOpen && canCompose && !imageToSend && !audioToSend && !isRecording && (
            <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 z-40 mx-auto max-w-md rounded-[28px] border border-white/[0.09] bg-[rgba(11,11,15,.96)] p-3 shadow-[0_26px_80px_rgba(0,0,0,.58)] backdrop-blur-3xl">
              <div className="mb-2 flex items-center justify-between px-1"><div><p className="pg-eyebrow">Compartilhar</p><p className="mt-1 text-sm text-white/55">Escolha o que enviar</p></div><span className="material-symbols-rounded text-white/20">add_circle</span></div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['photo', 'image', 'Foto', 'Imagem com legenda'],
                  ['photo_once', 'visibility_off', 'Foto 1x', 'Abre uma única vez'],
                  ['album', 'photo_library', 'Álbum privado', 'Controle de acesso'],
                  ['location', 'location_on', 'Localização', 'Compartilhar posição'],
                ].map(([mode, icon, label, description]) => (
                  <button key={mode} type="button" onClick={() => chooseAttachment(mode as AttachmentMode)} className="rounded-[20px] border border-white/[0.065] bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.065] active:scale-[.98]"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded">{icon}</span></span><strong className="block text-sm text-white">{label}</strong><span className="mt-1 block text-xs text-white/38">{description}</span></button>
                ))}
              </div>
            </div>
          )}
        </footer>
      </section>

      {confirmDeleteMessage && <ConfirmationModal isOpen title="Apagar mensagem" message="Essa mensagem será removida da conversa." confirmText="Apagar" onConfirm={handleDeleteMessage} onCancel={() => setConfirmDeleteMessage(null)} />}
      {confirmDeleteConversation && <ConfirmationModal isOpen title="Apagar conversa" message={`Apagar permanentemente a conversa com ${user.name}?`} confirmText="Apagar conversa" onConfirm={handleDeleteConversation} onCancel={() => setConfirmDeleteConversation(false)} />}
      {isAlbumSelectorOpen && <SelectAlbumModal onClose={() => setAlbumSelectorOpen(false)} onSelect={handleSelectAlbum} />}
      {activeAlbum && <AlbumGalleryModal album={activeAlbum} onClose={() => setActiveAlbum(null)} />}

      {viewingOncePhoto && (
        <ViewOncePhotoModal
          imageUrl={viewingOncePhoto.image_url ? getPublicImageUrl(viewingOncePhoto.image_url) : ''}
          onClose={async () => {
            const message = viewingOncePhoto;
            const own = message.sender_id === currentUser.id;
            const path = message.image_url;
            setViewingOncePhoto(null);
            if (own) return;
            const viewedAt = new Date().toISOString();
            const { error } = await supabase.from('messages').update({ image_url: null, viewed_at: viewedAt }).eq('id', message.id);
            if (!error) setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, image_url: null, viewed_at: viewedAt } : item));
            if (path) supabase.storage.from('user_uploads').remove([path]).then(({ error: storageError }) => { if (storageError) console.error('Error deleting view-once photo:', storageError); });
          }}
        />
      )}

      {viewingOnceAudio && (
        <ViewOnceAudioModal
          audioUrl={(() => { const parsed = parseMessage(viewingOnceAudio.content); return parsed?.type === 'audio' && parsed.url ? getPublicImageUrl(parsed.url) : ''; })()}
          onClose={async () => {
            const message = viewingOnceAudio;
            const own = message.sender_id === currentUser.id;
            const parsed = parseMessage(message.content);
            const path = parsed?.type === 'audio' ? parsed.url : null;
            setViewingOnceAudio(null);
            if (own) return;
            const viewedAt = new Date().toISOString();
            const emptyContent = JSON.stringify({ type: 'audio', url: null });
            const { error } = await supabase.from('messages').update({ content: emptyContent, viewed_at: viewedAt }).eq('id', message.id);
            if (!error) setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, content: emptyContent, viewed_at: viewedAt } : item));
            if (path) supabase.storage.from('user_uploads').remove([path]).then(({ error: storageError }) => { if (storageError) console.error('Error deleting view-once audio:', storageError); });
          }}
        />
      )}
    </>
  );
});

ChatWindowV2.displayName = 'ChatWindowV2';

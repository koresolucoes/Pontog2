import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePwaStore } from '../stores/pwaStore';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useInboxStore } from '../stores/inboxStore';
import { EditProfileModal } from './EditProfileModal';
import { MyAlbumsModal } from './MyAlbumsModal';
import { BlockedUsersModal } from './BlockedUsersModal';
import { VerificationModal } from './VerificationModal';
import { TrustSafetyCenter } from './TrustSafetyCenter';
import { useTranslation } from 'react-i18next';
import { cleanTag, parseTags } from '../lib/utils';
import { useVideoStore } from '../stores/videoStore';
import { reverseGeocode } from '../lib/geocode';
import { Button } from './ui/Button';

export const ProfileView: React.FC = () => {
  const { user, signOut, toggleIncognitoMode } = useAuthStore();
  const { setSubscriptionModalOpen, setDonationModalOpen, setActiveView } = useUiStore();
  const { pushState, checkPushSupport, subscribeToPushNotifications, isSubscribing } = usePwaStore();
  const { preferences, loading: loadingPreferences, fetchPreferences, updatePreference } = useNotificationStore();
  const { winks, profileViews } = useInboxStore();
  const { t } = useTranslation();
  const videos = useVideoStore((state) => state.videos);

  const [isEditProfileOpen, setEditProfileOpen] = useState(false);
  const [isMyAlbumsOpen, setMyAlbumsOpen] = useState(false);
  const [isBlockedUsersOpen, setBlockedUsersOpen] = useState(false);
  const [isVerificationOpen, setVerificationOpen] = useState(false);
  const [isSupportOpen, setSupportOpen] = useState(false);
  const [locationName, setLocationName] = useState<{ city: string; state: string } | null>(null);

  useEffect(() => { checkPushSupport(); }, [checkPushSupport]);
  useEffect(() => { if (pushState === 'granted') fetchPreferences(); }, [pushState, fetchPreferences]);
  useEffect(() => { if (user?.lat && user?.lng) reverseGeocode(user.lat, user.lng).then(setLocationName).catch(() => setLocationName(null)); }, [user?.lat, user?.lng]);

  const userVideos = useMemo(() => videos.filter((video) => video.user_id === user?.id), [videos, user?.id]);
  if (!user) return null;

  const allPhotos = Array.from(new Set([user.avatar_url, ...(user.public_photos || [])].filter(Boolean))) as string[];
  const interests = [...parseTags(user.tribes), ...parseTags(user.kinks)].map(cleanTag).filter(Boolean);
  const locationText = locationName ? `${locationName.city}, ${locationName.state}` : user.city ? `${user.city}${user.state ? `, ${user.state}` : ''}` : 'Localização aproximada';
  const profileSignals = [!!user.avatar_url,!!user.status_text,!!user.date_of_birth,!!user.position,!!user.looking_for?.length,!!user.tribes?.length,!!user.public_photos?.length,!!user.is_verified];
  const profileCompletion = Math.round((profileSignals.filter(Boolean).length / profileSignals.length) * 100);
  const notificationEnabled = (type: 'new_message' | 'new_wink' | 'new_album_request') => preferences.find((item) => item.notification_type === type)?.enabled ?? true;

  return <>
    <div className="pg-page h-full overflow-y-auto pb-28 no-scrollbar"><div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 sm:px-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#111116] shadow-[0_24px_70px_rgba(0,0,0,.28)]">
        <div className="relative aspect-[4/3] min-h-[330px] sm:aspect-[16/10]"><img src={user.avatar_url} alt={user.display_name || user.username} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0b0b0f]"/><div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-white/70 backdrop-blur-xl">Como as pessoas te veem</div><div className="absolute inset-x-0 bottom-0 p-5 sm:p-6"><div className="flex items-center gap-2"><h1 className="font-bricolage text-[32px] font-black tracking-[-0.04em] text-white sm:text-[38px]">{user.display_name || user.username}{user.age ? `, ${user.age}` : ''}</h1>{user.is_verified && <span className="material-symbols-rounded filled text-primary-400">verified</span>}</div><p className="mt-1.5 text-sm font-semibold text-white/50">{locationText}</p><div className="mt-3 flex flex-wrap gap-2">{user.can_host && <span className="pg-chip !min-h-[30px] !bg-tertiary-500/10 !text-tertiary-500"><span className="material-symbols-rounded !text-[14px]">home</span>Tem local</span>}{user.is_incognito && <span className="pg-chip !min-h-[30px]"><span className="material-symbols-rounded !text-[14px]">visibility_off</span>Invisível</span>}{user.subscription_tier === 'plus' && <span className="pg-chip !min-h-[30px] !border-primary-500/20 !bg-primary-500/10 !text-primary-300"><span className="material-symbols-rounded filled !text-[14px]">auto_awesome</span>Plus</span>}</div></div></div>
        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] p-3"><Button variant="secondary" icon="edit" onClick={() => setEditProfileOpen(true)}>Editar perfil</Button>{user.subscription_tier === 'plus' ? <Button variant="secondary" icon="photo_library" onClick={() => setMyAlbumsOpen(true)}>Álbuns</Button> : <Button variant="primary" icon="auto_awesome" onClick={() => setSubscriptionModalOpen(true)}>Conhecer Plus</Button>}</div>
      </section>

      <section className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4 rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-4"><div><div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-white">Perfil {profileCompletion}% completo</p><span className="text-[11px] font-bold text-white/30">{profileCompletion < 100 ? 'Pode melhorar' : 'Excelente'}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500" style={{ width: `${profileCompletion}%` }}/></div><p className="mt-2 text-xs leading-relaxed text-white/38">Perfis completos ajudam as pessoas certas a entenderem melhor quem você é e o que procura.</p></div><button onClick={() => setEditProfileOpen(true)} className="pg-icon-btn"><span className="material-symbols-rounded">arrow_forward</span></button></section>

      <section className="mt-6"><div className="mb-3 px-1"><p className="pg-eyebrow">Seu cartão público</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">Sobre você</h2></div><div className="pg-surface p-4 sm:p-5"><p className="whitespace-pre-wrap text-[15px] leading-6 text-white/65">{user.status_text || 'Adicione uma apresentação para que outras pessoas saibam um pouco mais sobre você.'}</p>{interests.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{interests.slice(0,12).map(item=><span key={item} className="pg-chip !min-h-[32px]">#{item}</span>)}</div>}</div></section>

      {allPhotos.length > 1 && <section className="mt-6"><div className="mb-3 flex items-center justify-between px-1"><div><p className="pg-eyebrow">Galeria</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">Suas fotos</h2></div><Button variant="secondary" className="!min-h-[40px] !px-3 !text-xs" onClick={() => setEditProfileOpen(true)}>Gerenciar</Button></div><div className="grid grid-cols-3 gap-2">{allPhotos.slice(1,7).map((photo,index)=><img key={`${photo}-${index}`} src={photo} alt="Galeria" className="aspect-[3/4] w-full rounded-[18px] object-cover"/>)}</div></section>}
      {userVideos.length > 0 && <section className="mt-6"><div className="mb-3 flex items-center justify-between px-1"><div><p className="pg-eyebrow">Vídeos</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">Seu conteúdo</h2></div><button onClick={() => setActiveView('videos')} className="text-xs font-black text-primary-300">Abrir vídeos</button></div><div className="grid grid-cols-3 gap-2">{userVideos.slice(0,6).map(video=><button key={video.id} onClick={() => setActiveView('videos')} className="relative aspect-[9/14] overflow-hidden rounded-[18px] bg-white/[0.04]">{video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover"/> : <video src={video.video_url} className="h-full w-full object-cover"/>}<span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"><span className="material-symbols-rounded filled !text-[18px]">play_arrow</span></span></button>)}</div></section>}

      <section className="mt-7"><div className="mb-3 px-1"><p className="pg-eyebrow">Atividade</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">O que chegou até você</h2></div><div className="grid grid-cols-2 gap-2"><StatTile icon="waving_hand" label="Chamados" value={winks.length} onClick={() => setActiveView('inbox')}/><StatTile icon="visibility" label="Visitas" value={profileViews.length} onClick={() => setActiveView('inbox')}/></div></section>

      <section className="mt-7"><div className="mb-3 px-1"><p className="pg-eyebrow">Privacidade</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">Controle sua presença</h2></div><div className="space-y-2"><SettingToggle icon="visibility_off" title="Modo invisível" description={user.subscription_tier === 'plus' ? 'Fique fora da descoberta até decidir aparecer novamente.' : 'Disponível para membros Plus.'} checked={user.is_incognito} onChange={() => user.subscription_tier === 'plus' ? toggleIncognitoMode(!user.is_incognito) : setSubscriptionModalOpen(true)} badge={user.subscription_tier !== 'plus' ? 'PLUS' : undefined}/>{!user.is_verified && <SettingLink icon="verified" title="Verificar perfil" description="Aumente confiança sem expor dados públicos extras." onClick={() => setVerificationOpen(true)}/>}<SettingLink icon="block" title="Perfis bloqueados" description="Veja e gerencie quem você bloqueou." onClick={() => setBlockedUsersOpen(true)}/><SettingLink icon="photo_library" title="Álbuns privados" description="Controle o que é compartilhado e com quem." onClick={() => setMyAlbumsOpen(true)}/></div></section>

      <section className="mt-7"><div className="mb-3 px-1"><p className="pg-eyebrow">Notificações</p><h2 className="mt-1 font-bricolage text-xl font-black text-white">Só o que importa</h2></div>{pushState === 'granted' ? (loadingPreferences ? <div className="h-24 animate-pulse rounded-[22px] bg-white/[0.03]"/> : <div className="space-y-2"><SettingToggle icon="chat_bubble" title="Novas mensagens" description="Avisos quando alguém conversar com você." checked={notificationEnabled('new_message')} onChange={() => updatePreference('new_message', !notificationEnabled('new_message'))}/><SettingToggle icon="waving_hand" title="Novos chamados" description="Saiba quando alguém demonstrar interesse." checked={notificationEnabled('new_wink')} onChange={() => updatePreference('new_wink', !notificationEnabled('new_wink'))}/><SettingToggle icon="lock" title="Pedidos de álbum" description="Avisos de solicitações de acesso." checked={notificationEnabled('new_album_request')} onChange={() => updatePreference('new_album_request', !notificationEnabled('new_album_request'))}/></div>) : pushState === 'denied' ? <div className="rounded-[22px] border border-red-500/15 bg-red-500/[0.06] p-4 text-sm font-semibold text-red-200/70">Notificações estão bloqueadas nas permissões do navegador.</div> : <Button variant="secondary" fullWidth icon="notifications" loading={isSubscribing} onClick={subscribeToPushNotifications}>Ativar notificações</Button>}</section>

      <section className="mt-7 space-y-2"><SettingLink icon="support_agent" title="Ajuda e suporte" description="Converse com a equipe Ponto G e acompanhe seus atendimentos." onClick={() => setSupportOpen(true)}/><SettingLink icon="volunteer_activism" title="Apoiar o Ponto G" description="Ajude a manter e evoluir a comunidade." onClick={() => setDonationModalOpen(true)}/><button onClick={signOut} className="flex min-h-[52px] w-full items-center gap-3 rounded-[20px] px-4 text-left text-sm font-bold text-red-300 transition hover:bg-red-500/[0.07]"><span className="material-symbols-rounded">logout</span>Sair da conta</button></section>
    </div></div>

    {isEditProfileOpen && <EditProfileModal onClose={() => setEditProfileOpen(false)}/>} {isMyAlbumsOpen && <MyAlbumsModal onClose={() => setMyAlbumsOpen(false)}/>} {isBlockedUsersOpen && <BlockedUsersModal onClose={() => setBlockedUsersOpen(false)}/>} <VerificationModal isOpen={isVerificationOpen} onClose={() => setVerificationOpen(false)}/> {isSupportOpen && <TrustSafetyCenter onClose={() => setSupportOpen(false)}/>}
  </>;
};

const StatTile: React.FC<{ icon:string; label:string; value:number; onClick:()=>void }> = ({icon,label,value,onClick}) => <button onClick={onClick} className="pg-surface flex min-h-[86px] items-center gap-3 p-3.5 text-left transition active:scale-[0.985]"><span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded filled">{icon}</span></span><span><span className="block font-bricolage text-2xl font-black leading-none text-white">{value}</span><span className="mt-1 block text-[11px] font-bold uppercase tracking-[.12em] text-white/32">{label}</span></span></button>;

const SettingLink: React.FC<{icon:string;title:string;description:string;onClick:()=>void}> = ({icon,title,description,onClick}) => <button onClick={onClick} className="flex min-h-[66px] w-full items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.05] active:scale-[0.99]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-white/[0.045] text-white/50"><span className="material-symbols-rounded !text-[20px]">{icon}</span></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-white/75">{title}</span><span className="mt-0.5 block text-[11px] leading-snug text-white/30">{description}</span></span><span className="material-symbols-rounded !text-[18px] text-white/18">chevron_right</span></button>;

const SettingToggle: React.FC<{icon:string;title:string;description:string;checked:boolean;onChange:()=>void;badge?:string}> = ({icon,title,description,checked,onChange,badge}) => <button onClick={onChange} className="flex min-h-[70px] w-full items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.05] active:scale-[0.99]"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] ${checked ? 'bg-primary-500/12 text-primary-300' : 'bg-white/[0.045] text-white/40'}`}><span className="material-symbols-rounded !text-[20px]">{icon}</span></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-black text-white/75">{title}{badge && <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[9px] tracking-[.12em] text-primary-300">{badge}</span>}</span><span className="mt-0.5 block text-[11px] leading-snug text-white/30">{description}</span></span><span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-primary-500' : 'bg-white/10'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`}/></span></button>;

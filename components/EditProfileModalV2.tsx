import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { useAlbumStore } from '../stores/albumStore';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { profileCommands, type EditableProfilePatch } from '../modules/profiles/public';
import type { Profile } from '../types';
import { HIV_STATUSES, KINKS, POSITIONS, LOOKING_FOR } from '../lib/constants';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface EditProfileModalProps { onClose: () => void; }
type Section = 'essencial' | 'midia' | 'sobre' | 'interesses';

const getPathFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const marker = '/user_uploads/';
    const index = parsed.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + marker.length)) : url;
  } catch { return url; }
};

const getVideoDuration = (file: File) => new Promise<number>((resolve, reject) => {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.preload = 'metadata';
  video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); resolve(duration); };
  video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid_video')); };
  video.src = url;
});

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }> = ({ label, hint, className = '', ...props }) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-black uppercase tracking-[.12em] text-white/38">{label}</span>
    <input {...props} className={`pg-field ${className}`} />
    {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-white/28">{hint}</span>}
  </label>
);

const SelectField: React.FC<{ label: string; value?: string | null; onChange: (value: string) => void; options: string[] }> = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-black uppercase tracking-[.12em] text-white/38">{label}</span>
    <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="pg-field appearance-none">
      <option value="">Não informar</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const ChipGroup: React.FC<{ values: string[]; selected: string[]; onToggle: (value: string) => void; translate?: (value: string) => string }> = ({ values, selected, onToggle, translate }) => (
  <div className="flex flex-wrap gap-2">
    {values.map((value) => {
      const active = selected.includes(value);
      return <button key={value} type="button" onClick={() => onToggle(value)} className={`pg-chip ${active ? 'pg-chip-active' : ''}`}>{active && <span className="material-symbols-rounded !text-[14px]">check</span>}{translate ? translate(value) : value}</button>;
    })}
  </div>
);

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const { tribes, fetchTribes } = useDataStore();
  const { uploadPhoto, uploadVideo } = useAlbumStore();
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [section, setSection] = useState<Section>('essencial');
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const publicPhotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setFormData({ ...profile, tribes: profile.tribes || [], kinks: profile.kinks || [], looking_for: profile.looking_for || [], interests: profile.interests || [] });
    if (!tribes.length) fetchTribes();
  }, [profile, tribes.length, fetchTribes]);

  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await fetchProfile(data.user);
  };

  const updateForm = <K extends keyof Profile>(key: K, value: Profile[K]) => setFormData((current) => ({ ...current, [key]: value }));
  const toggleList = (key: 'tribes' | 'kinks' | 'looking_for', value: string) => {
    const current = Array.isArray(formData[key]) ? (formData[key] as string[]) : [];
    updateForm(key as any, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as any);
  };

  const saveMediaPatch = async (patch: EditableProfilePatch, successMessage: string) => {
    try {
      await profileCommands.updateOwnProfile(patch);
      setFormData((current) => ({ ...current, ...patch } as Partial<Profile>));
      await refresh();
      toast.success(successMessage);
    } catch (error) {
      console.error('Profile media update failed:', error);
      toast.error('Não foi possível salvar esta mídia.');
      throw error;
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMediaBusy(true);
    const toastId = toast.loading('Atualizando sua foto...');
    try {
      const path = await uploadPhoto(file);
      if (!path) throw new Error('upload_failed');
      await saveMediaPatch({ avatar_url: path }, 'Foto de perfil atualizada.');
      setFormData((current) => ({ ...current, avatar_url: getPublicImageUrl(path) }));
      toast.dismiss(toastId);
    } catch { toast.error('Falha ao atualizar a foto.', { id: toastId }); }
    finally { setMediaBusy(false); if (event.target) event.target.value = ''; }
  };

  const handlePublicPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMediaBusy(true);
    const toastId = toast.loading('Adicionando foto...');
    try {
      const path = await uploadPhoto(file);
      if (!path) throw new Error('upload_failed');
      const paths = [...(formData.public_photos || []).map(getPathFromUrl), path];
      await saveMediaPatch({ public_photos: paths }, 'Foto adicionada à galeria.');
      setFormData((current) => ({ ...current, public_photos: paths.map(getPublicImageUrl) }));
      toast.dismiss(toastId);
    } catch { toast.error('Falha ao adicionar a foto.', { id: toastId }); }
    finally { setMediaBusy(false); if (event.target) event.target.value = ''; }
  };

  const removePublicPhoto = async (photoUrl: string) => {
    setMediaBusy(true);
    const paths = (formData.public_photos || []).map(getPathFromUrl).filter((path) => path !== getPathFromUrl(photoUrl));
    try {
      await saveMediaPatch({ public_photos: paths }, 'Foto removida da galeria.');
      setFormData((current) => ({ ...current, public_photos: paths.map(getPublicImageUrl) }));
    } finally { setMediaBusy(false); }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('O vídeo deve ter no máximo 20 MB.'); return; }
    setMediaBusy(true);
    const toastId = toast.loading('Preparando seu vídeo...');
    try {
      const duration = await getVideoDuration(file);
      if (!Number.isFinite(duration) || duration > 15.25) throw new Error('duration');
      const path = await uploadVideo(file);
      if (!path) throw new Error('upload_failed');
      await saveMediaPatch({ video_url: path }, 'Vídeo de apresentação atualizado.');
      setFormData((current) => ({ ...current, video_url: getPublicImageUrl(path) }));
      toast.dismiss(toastId);
    } catch (error: any) {
      toast.error(error?.message === 'duration' ? 'Seu vídeo de apresentação deve ter até 15 segundos.' : 'Não foi possível enviar o vídeo.', { id: toastId });
    } finally { setMediaBusy(false); if (event.target) event.target.value = ''; }
  };

  const removeVideo = async () => {
    setMediaBusy(true);
    try { await saveMediaPatch({ video_url: null }, 'Vídeo removido.'); setFormData((current) => ({ ...current, video_url: null })); }
    finally { setMediaBusy(false); }
  };

  const saveProfile = async () => {
    if (!profile) return;
    if (formData.height_cm && (formData.height_cm < 50 || formData.height_cm > 250)) return toast.error('Altura deve estar entre 50 e 250 cm.');
    if (formData.weight_kg && (formData.weight_kg < 30 || formData.weight_kg > 300)) return toast.error('Peso deve estar entre 30 e 300 kg.');

    setSaving(true);
    const toastId = toast.loading('Salvando perfil...');
    try {
      const patch: EditableProfilePatch = {
        username: formData.username || null,
        display_name: formData.display_name || null,
        status_text: formData.status_text || null,
        date_of_birth: formData.date_of_birth || null,
        height_cm: formData.height_cm ?? null,
        weight_kg: formData.weight_kg ?? null,
        position: formData.position || null,
        hiv_status: formData.hiv_status || null,
        redes_sociais: formData.redes_sociais || null,
        kinks: formData.kinks || [],
        can_host: !!formData.can_host,
        gender_identity: formData.gender_identity || null,
        pronouns: formData.pronouns || null,
        sexual_orientation: formData.sexual_orientation || null,
        relationship_status: formData.relationship_status || null,
        looking_for: formData.looking_for || [],
        interests: formData.interests || [],
        visibility: formData.visibility || 'todos',
        oral_preference: formData.oral_preference || null,
        accommodation_preference: formData.accommodation_preference || null,
        tribes_configured: true,
      };
      await profileCommands.updateOwnProfile(patch);

      const selectedTribeIds = tribes.filter((tribe) => (formData.tribes || []).includes(tribe.name)).map((tribe) => tribe.id);
      const { error: deleteError } = await supabase.from('profile_tribes').delete().eq('profile_id', profile.id);
      if (deleteError) throw deleteError;
      if (selectedTribeIds.length) {
        const { error: tribeError } = await supabase.from('profile_tribes').insert(selectedTribeIds.map((tribeId) => ({ profile_id: profile.id, tribe_id: tribeId })));
        if (tribeError) throw tribeError;
      }

      await refresh();
      toast.success('Perfil salvo.', { id: toastId });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Não foi possível salvar o perfil.', { id: toastId });
    } finally { setSaving(false); }
  };

  if (!profile) return null;
  const tabs: Array<{ id: Section; label: string; icon: string }> = [
    { id: 'essencial', label: 'Essencial', icon: 'person' },
    { id: 'midia', label: 'Fotos', icon: 'photo_library' },
    { id: 'sobre', label: 'Sobre', icon: 'tune' },
    { id: 'interesses', label: 'Interesses', icon: 'interests' },
  ];

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      eyebrow="Seu perfil"
      title="Edite como você aparece"
      description="Organize sua identidade, mídia e intenção sem transformar seu perfil em um formulário infinito."
      footer={<div className="grid grid-cols-[.75fr_1.25fr] gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="light" loading={saving} onClick={saveProfile}>Salvar perfil</Button></div>}
    >
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.03]">
          <div className="h-36 sm:h-40"><img src={formData.avatar_url || profile.avatar_url} alt="Prévia do seu perfil" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" /></div>
          <div className="absolute inset-x-0 bottom-0 p-4"><p className="pg-eyebrow mb-1">Prévia</p><h3 className="font-bricolage text-2xl font-black text-white">{formData.display_name || formData.username || profile.username}</h3><p className="mt-1 line-clamp-1 text-xs font-semibold text-white/48">{formData.status_text || 'Adicione uma bio curta para mostrar sua vibe.'}</p></div>
        </section>

        <nav className="grid grid-cols-4 gap-1 rounded-[20px] border border-white/[0.06] bg-white/[0.025] p-1" aria-label="Seções do editor">
          {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setSection(tab.id)} className={`flex min-h-[48px] flex-col items-center justify-center rounded-[16px] px-1 text-[10px] font-black transition ${section === tab.id ? 'bg-white text-black' : 'text-white/38 hover:text-white/70'}`}><span className="material-symbols-rounded !text-[19px]">{tab.icon}</span><span className="mt-0.5">{tab.label}</span></button>)}
        </nav>

        {section === 'essencial' && <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Nome de usuário" value={formData.username || ''} onChange={(e) => updateForm('username', e.target.value)} /><Field label="Nome que aparece" value={formData.display_name || ''} onChange={(e) => updateForm('display_name', e.target.value)} /></div>
          <label className="block"><span className="mb-2 block text-[11px] font-black uppercase tracking-[.12em] text-white/38">Bio</span><textarea value={formData.status_text || ''} onChange={(e) => updateForm('status_text', e.target.value)} maxLength={280} rows={4} className="pg-field resize-none" placeholder="O que você quer que as pessoas saibam primeiro?" /><span className="mt-1.5 block text-right text-[10px] font-bold text-white/25">{(formData.status_text || '').length}/280</span></label>
          <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Identidade de gênero" value={formData.gender_identity} onChange={(v) => updateForm('gender_identity', v)} options={['Homem Cis','Mulher Cis','Homem Trans','Mulher Trans','Não-binário','Agênero','Outro']} /><SelectField label="Pronomes" value={formData.pronouns} onChange={(v) => updateForm('pronouns', v)} options={['Ele/Dele','Ela/Dela','Elu/Delu','Qualquer pronome']} /><SelectField label="Orientação" value={formData.sexual_orientation} onChange={(v) => updateForm('sexual_orientation', v)} options={['Gay','Lésbica','Bissexual','Pansexual','Assexual','Queer','Heterossexual','Outro']} /><SelectField label="Relacionamento" value={formData.relationship_status} onChange={(v) => updateForm('relationship_status', v)} options={['Solteiro(a)','Casado(a)','Em um relacionamento','Relacionamento Aberto','Poliamor','Complicado']} /></div>
        </div>}

        {section === 'midia' && <div className="space-y-5">
          <section className="pg-surface p-4"><div className="flex items-center gap-4"><button type="button" onClick={() => avatarInputRef.current?.click()} disabled={mediaBusy} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border border-white/10"><img src={formData.avatar_url || profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition hover:opacity-100"><span className="material-symbols-rounded text-white">photo_camera</span></span></button><div className="min-w-0 flex-1"><h3 className="font-bricolage text-lg font-black text-white">Foto principal</h3><p className="mt-1 text-xs leading-relaxed text-white/38">É a primeira imagem que aparece em Descobrir, Mapa e conversas.</p><Button type="button" variant="secondary" className="mt-3 !min-h-[38px] !px-3 !text-xs" onClick={() => avatarInputRef.current?.click()} disabled={mediaBusy}>Trocar foto</Button></div></div><input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} /></section>
          <section><div className="mb-3 flex items-end justify-between"><div><p className="pg-eyebrow">Galeria pública</p><h3 className="mt-1 font-bricolage text-lg font-black text-white">Suas fotos</h3></div><span className="text-[11px] font-bold text-white/28">Salva ao adicionar</span></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{(formData.public_photos || []).map((photo) => <div key={photo} className="group relative aspect-[3/4] overflow-hidden rounded-[18px] bg-white/[0.04]"><img src={photo} alt="Foto pública" className="h-full w-full object-cover" /><button type="button" onClick={() => removePublicPhoto(photo)} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100" aria-label="Remover foto"><span className="material-symbols-rounded !text-[18px]">delete</span></button></div>)}<button type="button" onClick={() => publicPhotoInputRef.current?.click()} disabled={mediaBusy} className="flex aspect-[3/4] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/14 bg-white/[0.025] text-white/35 transition hover:border-primary-500/35 hover:text-primary-300"><span className="material-symbols-rounded">add_photo_alternate</span><span className="mt-1 text-[10px] font-black uppercase">Adicionar</span></button></div><input ref={publicPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePublicPhotoUpload} /></section>
          <section className="pg-surface p-4"><div className="mb-3 flex items-center justify-between"><div><p className="pg-eyebrow">Apresentação</p><h3 className="mt-1 font-bricolage text-lg font-black text-white">Vídeo de até 15s</h3></div>{formData.video_url && <button type="button" onClick={removeVideo} disabled={mediaBusy} className="text-xs font-black text-red-300">Remover</button>}</div>{formData.video_url ? <video src={formData.video_url} controls playsInline className="aspect-video w-full rounded-[20px] bg-black object-contain" /> : <button type="button" onClick={() => videoInputRef.current?.click()} className="flex aspect-video w-full flex-col items-center justify-center rounded-[20px] border border-dashed border-white/14 bg-black/20 text-white/38"><span className="material-symbols-rounded !text-[30px]">video_call</span><span className="mt-2 text-xs font-black">Adicionar vídeo</span><span className="mt-1 text-[10px]">até 15 segundos · 20 MB</span></button>}<input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoUpload} /></section>
        </div>}

        {section === 'sobre' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Data de nascimento" type="date" value={formData.date_of_birth?.split('T')[0] || ''} onChange={(e) => updateForm('date_of_birth', e.target.value)} /><SelectField label="Posição" value={formData.position} onChange={(v) => updateForm('position', v)} options={POSITIONS} /><Field label="Altura (cm)" type="number" min={50} max={250} value={formData.height_cm ?? ''} onChange={(e) => updateForm('height_cm', e.target.value ? Number(e.target.value) : null)} /><Field label="Peso (kg)" type="number" min={30} max={300} value={formData.weight_kg ?? ''} onChange={(e) => updateForm('weight_kg', e.target.value ? Number(e.target.value) : null)} /><SelectField label="Status HIV" value={formData.hiv_status} onChange={(v) => updateForm('hiv_status', v)} options={HIV_STATUSES} /></div><label className="pg-surface flex min-h-[72px] items-center justify-between gap-4 p-4"><span><span className="block text-sm font-black text-white">Tenho local</span><span className="mt-1 block text-xs text-white/35">Mostra que você pode receber, sem revelar endereço.</span></span><input type="checkbox" checked={!!formData.can_host} onChange={(e) => updateForm('can_host', e.target.checked)} className="h-5 w-5 accent-primary-500" /></label><section><p className="pg-eyebrow mb-3">Redes sociais</p><div className="grid gap-3 sm:grid-cols-2">{['instagram','twitter','telegram','onlyfans'].map((network) => <Field key={network} label={network === 'onlyfans' ? 'OnlyFans / Privacy' : network} value={(formData.redes_sociais as any)?.[network] || ''} onChange={(e) => updateForm('redes_sociais', { ...(formData.redes_sociais || {}), [network]: e.target.value })} />)}</div></section></div>}

        {section === 'interesses' && <div className="space-y-6"><section><p className="pg-eyebrow mb-3">O que você busca</p><ChipGroup values={LOOKING_FOR} selected={formData.looking_for || []} onToggle={(value) => toggleList('looking_for', value)} translate={(value) => t(`constants.looking_for.${value}`, { defaultValue: value })} /></section><section><p className="pg-eyebrow mb-3">Tribos</p><ChipGroup values={tribes.map((tribe) => tribe.name)} selected={formData.tribes || []} onToggle={(value) => toggleList('tribes', value)} translate={(value) => t(`constants.tribes.${value}`, { defaultValue: value })} /></section><section><p className="pg-eyebrow mb-3">Preferências</p><ChipGroup values={KINKS} selected={formData.kinks || []} onToggle={(value) => toggleList('kinks', value)} translate={(value) => t(`constants.kinks.${value}`, { defaultValue: value })} /></section><section><p className="pg-eyebrow mb-3">Quem pode te encontrar</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => updateForm('visibility', 'todos')} className={`pg-surface min-h-[76px] p-3 text-left ${formData.visibility !== 'tribos' ? '!border-primary-500/30 !bg-primary-500/[0.07]' : ''}`}><span className="text-sm font-black text-white">Todos</span><span className="mt-1 block text-[11px] text-white/35">Descoberta aberta.</span></button><button type="button" onClick={() => updateForm('visibility', 'tribos')} className={`pg-surface min-h-[76px] p-3 text-left ${formData.visibility === 'tribos' ? '!border-primary-500/30 !bg-primary-500/[0.07]' : ''}`}><span className="text-sm font-black text-white">Minhas tribos</span><span className="mt-1 block text-[11px] text-white/35">Descoberta mais focada.</span></button></div></section></div>}
      </div>
    </ModalShell>
  );
};

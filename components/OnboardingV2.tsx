import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { calculateAge } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { useAlbumStore } from '../stores/albumStore';
import { useDataStore } from '../stores/dataStore';
import { profileCommands } from '../modules/profiles/public';

const TERMS_VERSION = '2026-09-07';
const PRIVACY_VERSION = '2026-09-07';

export const Onboarding: React.FC = () => {
  const { profile, fetchProfile, signOut } = useAuthStore();
  const uploadPhoto = useAlbumStore((state) => state.uploadPhoto);
  const { tribes, fetchTribes } = useDataStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [dob, setDob] = useState(profile?.date_of_birth?.split('T')[0] || '');
  const [statusText, setStatusText] = useState(profile?.status_text || '');
  const [avatarPath, setAvatarPath] = useState(profile?.avatar_url || '');
  const [selectedTribes, setSelectedTribes] = useState<number[]>([]);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => { void fetchTribes(); }, [fetchTribes]);

  const age = useMemo(() => dob ? calculateAge(dob) : null, [dob]);

  const rejectUnderage = async () => {
    toast.error('O Ponto G é exclusivo para maiores de 18 anos.');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/account-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ reason: 'underage' }),
        });
      }
    } finally {
      await signOut().catch(() => undefined);
      window.location.replace('/');
    }
  };

  const continueFromConsent = async () => {
    if (!dob) return toast.error('Informe sua data de nascimento.');
    if (age !== null && age < 18) return void rejectUnderage();
    if (!adultConfirmed || !termsAccepted) return toast.error('Confirme sua idade e aceite os documentos para continuar.');
    setStep(2);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!dob || age === null || age < 18) return toast.error('Confirme primeiro que você é maior de 18 anos.');
    const toastId = toast.loading('Enviando foto…');
    const path = await uploadPhoto(file);
    if (!path) return toast.error('Não foi possível enviar a foto.', { id: toastId });
    try {
      await profileCommands.updateOwnProfile({ avatar_url: path });
      setAvatarPath(path);
      toast.success('Foto adicionada.', { id: toastId });
    } catch (error) {
      console.error('Avatar update failed:', error);
      toast.error('Não foi possível salvar a foto.', { id: toastId });
    }
  };

  const finish = async () => {
    if (!username.trim() || !dob) return toast.error('Nome e data de nascimento são obrigatórios.');
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('complete_onboarding_v2', {
        p_username: username.trim(),
        p_date_of_birth: dob,
        p_status_text: statusText.trim() || null,
        p_tribe_ids: selectedTribes,
        p_terms_version: TERMS_VERSION,
        p_privacy_version: PRIVACY_VERSION,
      });
      if (error) {
        if (String(error.message).includes('underage_not_allowed')) {
          setLoading(false);
          return void rejectUnderage();
        }
        throw error;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await fetchProfile(user);
      useAuthStore.setState({ showOnboarding: false });
      toast.success('Seu Ponto G está pronto.');
      void data;
    } catch (error) {
      console.error('Onboarding failed:', error);
      toast.error('Não foi possível finalizar seu perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-y-auto bg-[var(--pg-canvas,#050507)] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(245,12,105,.17),transparent_38%),radial-gradient(circle_at_90%_85%,rgba(129,13,247,.12),transparent_34%)]" />
      <div className="relative mx-auto w-full max-w-md pb-10">
        <div className="mb-8 flex items-center justify-between">
          <div><p className="pg-eyebrow">Primeiros passos</p><h1 className="pg-title mt-1 text-3xl">Seu Ponto G</h1></div>
          <span className="font-space text-xs font-black text-white/30">{step}/4</span>
        </div>
        <div className="mb-8 grid grid-cols-4 gap-2">{[1,2,3,4].map((item) => <div key={item} className={`h-1.5 rounded-full ${item <= step ? 'bg-[var(--pg-primary,#F50C69)]' : 'bg-white/8'}`} />)}</div>

        {step === 1 && (
          <section className="space-y-5">
            <div><p className="pg-eyebrow">Segurança primeiro</p><h2 className="pg-title mt-2 text-3xl">Você tem 18 anos ou mais?</h2><p className="mt-2 text-sm leading-relaxed text-white/45">A data de nascimento não é exibida publicamente; mostramos apenas sua idade quando necessário.</p></div>
            <label className="block"><span className="pg-eyebrow">Data de nascimento</span><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="pg-field mt-2" max={new Date().toISOString().slice(0,10)} /></label>
            <label className="flex gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4"><input type="checkbox" checked={adultConfirmed} onChange={(e) => setAdultConfirmed(e.target.checked)} className="mt-1"/><span className="text-sm leading-relaxed text-white/60">Confirmo que tenho 18 anos ou mais.</span></label>
            <label className="flex gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4"><input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1"/><span className="text-sm leading-relaxed text-white/60">Li e aceito os <strong className="text-white">Termos de Uso</strong> e a <strong className="text-white">Política de Privacidade</strong> vigentes.</span></label>
            <button onClick={continueFromConsent} className="pg-btn pg-btn-primary w-full !min-h-[52px]">Continuar</button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div><p className="pg-eyebrow">Identidade</p><h2 className="pg-title mt-2 text-3xl">Como você quer aparecer?</h2><p className="mt-2 text-sm text-white/45">Use um nome ou apelido e uma foto que represente você.</p></div>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="mx-auto block h-36 w-36 overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.035] shadow-[0_24px_60px_rgba(0,0,0,.3)]">
              {avatarPath ? <img src={avatarPath} alt="Seu avatar" className="h-full w-full object-cover"/> : <span className="material-symbols-rounded !text-[42px] text-white/25">add_a_photo</span>}
            </button>
            <label className="block"><span className="pg-eyebrow">Nome ou apelido</span><input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={64} className="pg-field mt-2" placeholder="Como devemos te chamar?" /></label>
            <div className="grid grid-cols-2 gap-2"><button onClick={() => setStep(1)} className="pg-btn pg-btn-secondary">Voltar</button><button onClick={() => username.trim() ? setStep(3) : toast.error('Escolha um nome.')} className="pg-btn pg-btn-light">Continuar</button></div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <div><p className="pg-eyebrow">Comunidade</p><h2 className="pg-title mt-2 text-3xl">O que combina com você?</h2><p className="mt-2 text-sm text-white/45">Escolha referências que ajudem a deixar sua descoberta mais relevante. Você pode mudar depois.</p></div>
            <div className="flex max-h-[45vh] flex-wrap gap-2 overflow-y-auto rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-3">
              {tribes.map((tribe: any) => { const active = selectedTribes.includes(Number(tribe.id)); return <button key={tribe.id} onClick={() => setSelectedTribes((current) => active ? current.filter((id) => id !== Number(tribe.id)) : [...current, Number(tribe.id)])} className={`pg-chip ${active ? 'pg-chip-active' : ''}`}>{tribe.name}</button>; })}
            </div>
            <div className="grid grid-cols-2 gap-2"><button onClick={() => setStep(2)} className="pg-btn pg-btn-secondary">Voltar</button><button onClick={() => setStep(4)} className="pg-btn pg-btn-light">Continuar</button></div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <div><p className="pg-eyebrow">Quase lá</p><h2 className="pg-title mt-2 text-3xl">O que você quer dizer agora?</h2><p className="mt-2 text-sm text-white/45">Uma frase curta já ajuda outras pessoas a entenderem sua vibe. É opcional.</p></div>
            <textarea value={statusText} onChange={(e) => setStatusText(e.target.value.slice(0,500))} rows={5} className="pg-field resize-none" placeholder="Ex.: por aqui para conhecer gente e descobrir lugares novos…" />
            <div className="rounded-[22px] border border-[rgba(245,12,105,.18)] bg-[rgba(245,12,105,.07)] p-4 text-sm leading-relaxed text-white/55">Sua localização pública é aproximada e você controla o que aparece no perfil. Álbuns privados só são entregues após autorização.</div>
            <div className="grid grid-cols-[.8fr_1.2fr] gap-2"><button onClick={() => setStep(3)} className="pg-btn pg-btn-secondary" disabled={loading}>Voltar</button><button onClick={finish} className="pg-btn pg-btn-primary" disabled={loading}>{loading ? 'Finalizando…' : 'Explorar agora'}</button></div>
          </section>
        )}
      </div>
    </div>
  );
};

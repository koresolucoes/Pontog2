import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3A12 12 0 1 1 32 14.8l5.7-5.6A20 20 0 1 0 44 24c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#1976D2" d="M43.6 20.1H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C41.6 35 44 29.8 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
);

export const Auth: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const title = useMemo(() => mode === 'signin' ? 'Entre no Ponto G' : mode === 'signup' ? 'Crie sua conta' : 'Recupere seu acesso', [mode]);
  const description = mode === 'forgot'
    ? 'Enviaremos um link seguro para você escolher uma nova senha.'
    : 'Perto. Agora. Conectados.';

  const googleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error('Não foi possível entrar com Google.');
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (honeypot) return;
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?recovery=1`,
        });
        if (error) throw error;
        toast.success('Se este e-mail estiver cadastrado, enviaremos um link de recuperação.');
        setMode('signin');
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          toast.success('Conta criada. Agora vamos configurar seu perfil.');
        } else {
          toast.success('Conta criada. Confira seu e-mail para continuar.');
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error: any) {
      const message = String(error?.message || '');
      if (/invalid login credentials/i.test(message)) toast.error('E-mail ou senha incorretos.');
      else if (/already registered/i.test(message)) toast.error('Este e-mail já possui conta.');
      else if (/password/i.test(message) && /least/i.test(message)) toast.error('Use uma senha com pelo menos 6 caracteres.');
      else toast.error('Não foi possível concluir. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--pg-canvas,#050507)] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(245,12,105,.2),transparent_35%),radial-gradient(circle_at_100%_80%,rgba(129,13,247,.14),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <button type="button" onClick={() => window.location.reload()} className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-white/45 hover:text-white">
          <span className="material-symbols-rounded !text-[18px]">arrow_back</span>Voltar
        </button>

        <div className="mb-7">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--pg-primary,#F50C69)] to-[var(--pg-secondary,#810DF7)] font-bricolage text-3xl font-black shadow-[0_16px_44px_rgba(245,12,105,.22)]">G</div>
          <p className="pg-eyebrow">Ponto G</p>
          <h1 className="pg-title mt-2 text-4xl text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/45">{description}</p>
        </div>

        {mode !== 'forgot' && (
          <button type="button" disabled={loading} onClick={googleLogin} className="pg-btn pg-btn-light w-full !min-h-[52px]">
            <GoogleIcon /> Entrar com Google
          </button>
        )}

        {mode !== 'forgot' && <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-white/[0.07]"/><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/25">ou e-mail</span><div className="h-px flex-1 bg-white/[0.07]"/></div>}

        <form onSubmit={submit} className="space-y-3">
          <input aria-hidden="true" tabIndex={-1} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="absolute -left-[9999px]" autoComplete="off" />
          <label className="block"><span className="pg-eyebrow">E-mail</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pg-field mt-2" placeholder="voce@email.com" /></label>
          {mode !== 'forgot' && (
            <label className="block"><span className="pg-eyebrow">Senha</span><div className="relative mt-2"><input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pg-field pr-12" placeholder="••••••••"/><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-xl text-white/35" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><span className="material-symbols-rounded !text-[19px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button></div></label>
          )}

          <button type="submit" disabled={loading} className="pg-btn pg-btn-primary mt-2 w-full !min-h-[52px]">
            {loading ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link seguro'}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          {mode === 'signin' && <button onClick={() => setMode('forgot')} className="font-bold text-white/45 hover:text-white">Esqueci minha senha</button>}
          {mode !== 'forgot' ? <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="font-black text-[var(--pg-primary,#F50C69)]">{mode === 'signin' ? 'Criar conta' : 'Já tenho conta'}</button> : <button onClick={() => setMode('signin')} className="font-black text-[var(--pg-primary,#F50C69)]">Voltar ao login</button>}
        </div>

        <div className="mt-8 rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-relaxed text-white/35">
          O Ponto G é exclusivo para maiores de 18 anos. Sua privacidade vem primeiro: você controla o que mostra e com quem compartilha. Termos e Política de Privacidade serão apresentados antes de usar o app.
        </div>
      </div>
    </div>
  );
};

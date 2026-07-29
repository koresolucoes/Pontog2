
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.657-3.356-11.303-7.918l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.856 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

export const Auth: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    { icon: "location_on", text: t('auth.feature_find', { defaultValue: 'Encontre caras perto de você' }) },
    { icon: "bolt", text: t('auth.feature_fast', { defaultValue: 'Conexões rápidas e diretas' }) },
    { icon: "admin_panel_settings", text: t('auth.feature_discreet', { defaultValue: 'Discreto e 100% anônimo' }) }
  ];

  // Helper para traduzir erros do Supabase de forma segura
  const getFriendlyErrorMessage = (error: any) => {
    if (!error) return t('auth.error_unknown', { defaultValue: 'Ocorreu um erro desconhecido.' });
    
    // Se for string, retorna ela mesma
    if (typeof error === 'string') return error;

    const msg = error.message || error.error_description || t('auth.error_generic', { defaultValue: 'Erro ao processar solicitação.' });
    
    if (msg.includes('Invalid login credentials')) return t('auth.error_invalid_credentials', { defaultValue: 'Email ou senha incorretos.' });
    if (msg.includes('User already registered')) return t('auth.error_email_registered', { defaultValue: 'Este email já possui cadastro.' });
    if (msg.includes('Password should be at least')) return t('auth.error_password_length', { defaultValue: 'A senha deve ter pelo menos 6 caracteres.' });
    if (msg.includes('rate limit')) return t('auth.error_rate_limit', { defaultValue: 'Muitas tentativas. Aguarde um pouco.' });
    if (msg.includes('network')) return t('auth.error_network', { defaultValue: 'Erro de conexão. Verifique sua internet.' });
    
    return msg; // Retorna a mensagem original se não houver tradução específica
  };

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Anti-bot & Security measures
  const [honeypot, setHoneypot] = useState('');
  const [num1] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [num2] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captchaInput, setCaptchaInput] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
    } catch (error) {
        toast.error(getFriendlyErrorMessage(error));
        setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (isSignUp) {
            // 1. Honeypot check (trap automated scripts)
            if (honeypot) {
                console.warn("Bot submission detected");
                toast.error("Erro no cadastro.");
                setLoading(false);
                return;
            }

            // 2. Anti-bot Challenge Check
            if (parseInt(captchaInput.trim(), 10) !== num1 + num2) {
                toast.error(`Verificação humana incorreta. Quanto é ${num1} + ${num2}?`);
                setLoading(false);
                return;
            }

            // 3. Device Rate Limiting (max 1 signup per 5 minutes per device)
            const lastSignup = localStorage.getItem('ponto_g_last_signup');
            if (lastSignup && Date.now() - parseInt(lastSignup, 10) < 5 * 60 * 1000) {
                toast.error("Muitas tentativas de cadastro neste dispositivo. Por favor, aguarde 5 minutos.");
                setLoading(false);
                return;
            }

            // 4. Perform SignUp
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            // Mark last signup timestamp
            localStorage.setItem('ponto_g_last_signup', Date.now().toString());

            if (data.session) {
                toast.success(t('auth.welcome', { defaultValue: 'Bem-vindo ao Ponto G!' }));
            } else if (data.user) {
                // Instantly sign in with password so user never has to wait or check email
                const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (!signInErr && signInData.session) {
                    toast.success(t('auth.welcome', { defaultValue: 'Bem-vindo ao Ponto G!' }));
                } else {
                    toast.success('Conta criada com sucesso! Acesso liberado sem necessidade de verificação por e-mail.', { duration: 6000, icon: '🔒' });
                }
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        }
    } catch (err: any) {
        console.error("Auth Error:", err);
        toast.error(getFriendlyErrorMessage(err));
    } finally {
        setLoading(false);
    }
  };

  const handleBack = () => {
      // Simple window reload to go back to initial state where Landing Page is shown
      // Or if we passed a prop 'onBack', we could use that. For now, reload works as a "Reset".
      window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
          <img 
            src="https://i.imgur.com/S078zPf.png" 
            className="w-full h-full object-cover opacity-40"
            alt="Background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-primary-900/20 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in-up relative">
        
        {/* Back Button */}
        <button onClick={handleBack} className="absolute -top-16 left-0 text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            <span className="material-symbols-rounded">arrow_back</span>
            {t('common.back', { defaultValue: 'Voltar' })}
        </button>

        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl flex items-center justify-center font-black text-5xl text-white mx-auto shadow-2xl shadow-primary-500/30 mb-4 rotate-3 transform hover:rotate-0 transition-all duration-500">
                G
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg font-outfit">
                Ponto G
            </h1>
            <p className="text-slate-300 mt-1 font-medium text-lg">{t('auth.slogan', { defaultValue: 'Direto ao ponto.' })}</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">
            <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center gap-2 bg-yellow-500/10 border border-yellow-500/20 py-2 px-4 rounded-full text-yellow-400 text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-rounded !text-base">18_up_rating</span>
                    <span>{t('auth.over_18', { defaultValue: 'Maiores de 18 anos' })}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-100 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
            >
                <GoogleIcon className="w-6 h-6" />
                <span className="text-base">{loading ? t('common.loading_wait', { defaultValue: 'Aguarde...' }) : t('auth.login_google', { defaultValue: 'Entrar com Google' })}</span>
            </button>

            <div className="my-6 flex items-center w-full">
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <span className="px-3 text-xs text-slate-400 font-semibold tracking-widest uppercase">{t('auth.or_email', { defaultValue: 'ou email' })}</span>
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                {/* Honeypot field - hidden from humans */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
                    <input 
                        type="text" 
                        name="website_honeypot" 
                        tabIndex={-1} 
                        value={honeypot} 
                        onChange={e => setHoneypot(e.target.value)} 
                        autoComplete="off" 
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Email</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3.5 text-slate-500 material-symbols-rounded">mail</span>
                        <input 
                            type="email" 
                            placeholder={t('auth.email_placeholder', { defaultValue: 'seu@email.com' })} 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                            required
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase">{t('auth.password', { defaultValue: 'Senha' })}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3.5 text-slate-500 material-symbols-rounded">lock</span>
                        <input 
                            type="password" 
                            placeholder={t('auth.password_placeholder', { defaultValue: '••••••••' })} 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                {/* Verification Challenge for Signup */}
                {isSignUp && (
                    <div className="space-y-2 bg-slate-800/50 border border-primary-500/20 p-3.5 rounded-xl animate-fade-in">
                        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                            <span className="flex items-center gap-1 text-primary-400">
                                <span className="material-symbols-rounded text-sm">security</span>
                                Verificação Anti-Bot:
                            </span>
                            <span className="text-white font-bold bg-primary-950/60 px-2 py-0.5 rounded border border-primary-500/30">
                                {num1} + {num2} = ?
                            </span>
                        </div>
                        <input 
                            type="number"
                            placeholder="Sua resposta"
                            value={captchaInput}
                            onChange={e => setCaptchaInput(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                            required
                        />
                    </div>
                )}

                {/* Discretion Guarantee Notice */}
                {isSignUp && (
                    <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-300">
                        <span className="material-symbols-rounded text-base text-emerald-400 shrink-0 mt-0.5">verified_user</span>
                        <span>
                            <strong>Garantia de Sigilo:</strong> Nenhum e-mail de verificação será enviado. Seu cadastro é 100% discreto e imediato.
                        </span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-900/30 hover:shadow-primary-600/40 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                >
                    {loading ? t('common.processing', { defaultValue: 'Processando...' }) : (isSignUp ? t('auth.create_free_account', { defaultValue: 'Criar Conta Grátis' }) : t('auth.login', { defaultValue: 'Entrar na Conta' }))}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                    {isSignUp ? t('auth.already_have_account', { defaultValue: 'Já tem uma conta?' }) : t('auth.dont_have_account', { defaultValue: 'Ainda não tem conta?' })}{' '}
                    <span className="text-primary-400 font-bold underline decoration-primary-400/50 hover:decoration-primary-400">
                        {isSignUp ? t('auth.login_link', { defaultValue: 'Faça login.' }) : t('auth.signup_link', { defaultValue: 'Cadastre-se.' })}
                    </span>
                </button>
            </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-500 px-4 leading-relaxed">
          {t('auth.terms_agreement', { defaultValue: 'Ao continuar, você confirma que tem mais de 18 anos e concorda com nossos Termos de Serviço e Política de Privacidade.' })}
        </p>
      </div>

      {/* Features List */}
      <div className="w-full max-w-md mt-8 space-y-3 text-center z-10 animate-fade-in hidden sm:block" style={{ animationDelay: '0.2s' }}>
        {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-center gap-3 text-slate-300 bg-slate-900/40 backdrop-blur-md py-2 px-4 rounded-full border border-white/5 inline-flex mx-2 mb-2">
                <span className="material-symbols-rounded text-xl text-primary-400">{feature.icon}</span>
                <span className="font-medium text-sm">{feature.text}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

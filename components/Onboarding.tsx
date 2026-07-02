import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAlbumStore } from '../stores/albumStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { calculateAge } from '../lib/utils';
import { useDataStore } from '../stores/dataStore';
import { useTranslation } from 'react-i18next';

export const Onboarding: React.FC = () => {
    const { t } = useTranslation();
    const { profile, completeOnboarding, fetchProfile, signOut } = useAuthStore();
    const { uploadPhoto } = useAlbumStore();
    const { tribes: dbTribes, fetchTribes } = useDataStore();

    useEffect(() => {
        fetchTribes();
    }, [fetchTribes]);
    
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: profile?.username || '',
        date_of_birth: profile?.date_of_birth?.split('T')[0] || '',
        status_text: profile?.status_text || '',
        tribes: profile?.tribes || [],
    });
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [loading, setLoading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(profile) {
            setFormData({
                username: profile.username,
                date_of_birth: profile.date_of_birth?.split('T')[0] || '',
                status_text: profile.status_text || '',
                tribes: profile.tribes || [],
            });
            setAvatarUrl(profile.avatar_url);
        }
    }, [profile]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    

    const handleTribeToggle = (tribe: string) => {
        setFormData(prev => ({
            ...prev,
            tribes: prev.tribes.includes(tribe)
                ? prev.tribes.filter((t: string) => t !== tribe)
                : [...prev.tribes, tribe]
        }));
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile) return;
      
      const toastId = toast.loading(t('onboarding.uploading_photo', { defaultValue: 'Enviando foto...' }));
      const newAvatarPath = await uploadPhoto(file);

      if (!newAvatarPath) {
          toast.error(t('onboarding.error_uploading', { defaultValue: 'Falha ao enviar a foto.' }), { id: toastId });
          return;
      }
      
      const { data, error } = await supabase.from('profiles').update({ avatar_url: newAvatarPath }).eq('id', profile.id).select().single();

      if (error) {
          toast.error(t('onboarding.error_updating', { defaultValue: 'Falha ao atualizar o perfil.' }), { id: toastId });
      } else {
          toast.success(t('onboarding.photo_looks_great', { defaultValue: 'Ficou ótimo!' }), { id: toastId });
          setAvatarUrl(data.avatar_url);
          await fetchProfile(profile as any); // Refresh profile data
      }
    }

    const handleSaveProfile = async () => {
        if (!profile) return;
        
        // Validação
        if (!formData.username.trim()) {
            toast.error(t('onboarding.error_no_name', { defaultValue: 'Como devemos te chamar?' }));
            return;
        }
         if (!formData.date_of_birth) {
            toast.error(t('onboarding.error_no_dob', { defaultValue: 'Qual sua data de nascimento?' }));
            return;
        }

        // Verificação de Idade (Bloqueio de Menores)
        const age = calculateAge(formData.date_of_birth);
        if (age < 18) {
            toast.error(t('onboarding.error_underage', { defaultValue: 'Acesso bloqueado. O Ponto G é exclusivo para maiores de 18 anos.' }), {
                icon: '🚫',
                duration: 4000,
                style: {
                    background: '#450a0a',
                    color: '#fecaca',
                    border: '1px solid #ef4444'
                }
            });
            
            // Desconecta o usuário após um breve delay para leitura da mensagem
            setTimeout(() => {
                signOut();
            }, 2000);
            return;
        }

        setLoading(true);
        const { tribes: formTribes, ...profileUpdates } = formData;
        const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', profile.id);

        if (error) {
            toast.error(t('onboarding.error_saving', { defaultValue: 'Erro ao salvar. Tente novamente.' }));
            console.error(error);
        } else {
            try {
                await supabase.from('profile_tribes').delete().eq('profile_id', profile.id);
                if (formTribes && formTribes.length > 0) {
                    const selectedTribeIds = dbTribes.filter((t: any) => formTribes.includes(t.name)).map((t: any) => t.id);
                    const newProfileTribes = selectedTribeIds.map((tribeId: number) => ({ profile_id: profile.id, tribe_id: tribeId }));
                    await supabase.from('profile_tribes').insert(newProfileTribes);
                }
            } catch (err) {
                console.error("Error saving onboarding tribes:", err);
            }
            await fetchProfile(profile as any);
            setStep(5); // Vai para o Guia (Step 5)
        }
        setLoading(false);
    };

    const renderStep = () => {
        switch(step) {
            case 1: return <WelcomeStep onNext={() => setStep(2)} t={t} />;
            case 2: return (
                <IdentityStep
                    formData={formData}
                    avatarUrl={avatarUrl}
                    onChange={handleChange}
                    onAvatarClick={() => avatarInputRef.current?.click()}
                    onNext={() => {
                        if (!formData.username.trim()) return toast.error(t('onboarding.choose_name', { defaultValue: 'Escolha um nome.' }));
                        setStep(3);
                    }}
                    t={t}
                />
            );
            case 3: return (
                <TribeStep
                    formData={formData}
                    dbTribes={dbTribes}
                    onToggleTribe={handleTribeToggle}
                    onNext={() => setStep(4)}
                    onBack={() => setStep(2)}
                    t={t}
                />
            );
            case 4: return (
                <DetailsStep 
                    formData={formData}
                    onChange={handleChange}
                    loading={loading}
                    onSave={handleSaveProfile}
                    onBack={() => setStep(3)}
                    t={t}
                />
            );
            case 5: return <GuideStep onFinish={completeOnboarding} t={t} />;
            default: return <WelcomeStep onNext={() => setStep(2)} t={t} />;
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-dark-900 text-white overflow-hidden relative">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary-600/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
                
                {step > 1 && step < 5 && (
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-2">
                            {[2, 3, 4].map((s) => (
                                <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-8 bg-primary-500' : 'w-4 bg-slate-700'}`}></div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="animate-fade-in-up">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};

const WelcomeStep: React.FC<{onNext: () => void, t: any}> = ({ onNext, t }) => (
    <div className="text-center space-y-8">
        <div className="relative inline-block">
            <img 
                src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/logo.png" 
                alt="Logo" 
                className="w-24 h-24 object-contain shadow-2xl shadow-primary-500/30 rotate-3 animate-float drop-shadow-lg"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                }}
            />
            <div className="hidden w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-3xl items-center justify-center shadow-2xl shadow-primary-500/30 rotate-3 animate-float" style={{ display: 'none' }}>
                <span className="font-black text-5xl text-white">G</span>
            </div>
            <div className="absolute -bottom-4 -right-4 text-3xl animate-bounce">👋</div>
        </div>
        
        <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-white font-outfit">
                {t('onboarding.welcome', { defaultValue: 'Bem-vindo!' })}
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xs mx-auto">
                {t('onboarding.welcome_desc', { defaultValue: 'Encontros reais, rápidos e diretos. Vamos configurar seu perfil?' })}
            </p>
        </div>

        <button onClick={onNext} className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-transform active:scale-95 shadow-xl">
            {t('common.start', { defaultValue: 'Começar' })}
        </button>
    </div>
);

interface IdentityStepProps {
    formData: { username: string };
    avatarUrl: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAvatarClick: () => void;
    onNext: () => void;
    t: any;
}
const IdentityStep: React.FC<IdentityStepProps> = ({ formData, avatarUrl, onChange, onAvatarClick, onNext, t }) => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white font-outfit mb-2">{t('onboarding.step_photo_title', { defaultValue: 'Primeiro, uma foto.' })}</h2>
            <p className="text-slate-400 text-sm">{t('onboarding.step_photo_desc', { defaultValue: 'Escolha sua melhor foto de rosto.' })}</p>
        </div>

        <div className="flex justify-center">
            <div className="relative group cursor-pointer" onClick={onAvatarClick}>
                <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-primary-500 to-secondary-600 shadow-2xl">
                    <img loading="lazy" src={avatarUrl} alt="Seu perfil" className="w-full h-full rounded-full object-cover border-4 border-dark-900 bg-slate-800" />
                </div>
                <div className="absolute bottom-2 right-2 bg-white text-primary-600 p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                    <span className="material-symbols-rounded text-xl block">photo_camera</span>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <label htmlFor="username" className="block text-xs font-bold text-slate-500 uppercase ml-2 tracking-wide">{t('onboarding.your_name', { defaultValue: 'Seu Nome / Apelido' })}</label>
            <input 
                type="text" 
                name="username" 
                id="username" 
                value={formData.username} 
                onChange={onChange} 
                placeholder={t('onboarding.name_placeholder', { defaultValue: 'Ex: Alex' })}
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-lg font-bold text-center" 
            />
        </div>

        <button onClick={onNext} className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-900/30 hover:shadow-primary-600/40 transition-all active:scale-95">
            {t('common.continue', { defaultValue: 'Continuar' })}
        </button>
    </div>
);


interface TribeStepProps {
    formData: { tribes: string[] };
    dbTribes: { id: number; name: string }[];
    onToggleTribe: (tribe: string) => void;
    onNext: () => void;
    onBack: () => void;
    t: any;
}
const TribeStep: React.FC<TribeStepProps> = ({ formData, dbTribes, onToggleTribe, onNext, onBack, t }) => (
    <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white font-outfit mb-2">{t('onboarding.step_tribe_title', { defaultValue: 'Suas Tribos' })}</h2>
            <p className="text-slate-400 text-sm">{t('onboarding.step_tribe_desc', { defaultValue: 'Selecione os grupos que te representam para encontrarmos pessoas como você.' })}</p>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
            {dbTribes.map((tribe) => {
                const isSelected = formData.tribes.includes(tribe.name);
                return (
                    <button
                        key={tribe.id}
                        onClick={() => onToggleTribe(tribe.name)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            isSelected 
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        {t(`constants.tribes.${tribe.name}`, { defaultValue: tribe.name })}
                    </button>
                );
            })}
        </div>

        <div className="flex gap-3 pt-4">
            <button onClick={onBack} className="flex-1 bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl hover:bg-slate-700 transition-colors">
                {t('common.back', { defaultValue: 'Voltar' })}
            </button>
            <button onClick={onNext} className="flex-[2] bg-white text-primary-600 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg">
                {t('common.continue', { defaultValue: 'Continuar' })}
            </button>
        </div>
    </div>
);

interface DetailsStepProps {
    formData: { date_of_birth: string; status_text: string };
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    loading: boolean;
    onSave: () => void;
    onBack: () => void;
    t: any;
}
const DetailsStep: React.FC<DetailsStepProps> = ({ formData, onChange, loading, onSave, onBack, t }) => (
    <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white font-outfit mb-2">{t('onboarding.step_details_title', { defaultValue: 'Quase lá!' })}</h2>
            <p className="text-slate-400 text-sm">{t('onboarding.step_details_desc', { defaultValue: 'Só mais alguns detalhes.' })}</p>
        </div>

        <div className="space-y-4">
            <div>
                <label htmlFor="date_of_birth" className="block text-xs font-bold text-slate-500 uppercase ml-2 tracking-wide mb-1">{t('onboarding.dob', { defaultValue: 'Data de Nascimento' })}</label>
                <input 
                    type="date" 
                    name="date_of_birth" 
                    id="date_of_birth" 
                    value={formData.date_of_birth} 
                    onChange={onChange} 
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-center font-medium appearance-none" 
                />
                <p className="text-[10px] text-slate-500 text-center mt-2">{t('onboarding.age_public', { defaultValue: 'Sua idade será exibida publicamente.' })}</p>
            </div>
            
            <div>
                <label htmlFor="status_text" className="block text-xs font-bold text-slate-500 uppercase ml-2 tracking-wide mb-1">{t('onboarding.bio_optional', { defaultValue: 'Bio (Opcional)' })}</label>
                <textarea 
                    name="status_text" 
                    id="status_text" 
                    rows={3} 
                    value={formData.status_text} 
                    onChange={onChange} 
                    placeholder={t('onboarding.bio_placeholder', { defaultValue: 'O que você curte? O que procura?' })}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-none text-sm" 
                />
            </div>
        </div>

        <div className="flex gap-3 pt-4">
            <button onClick={onBack} className="flex-1 bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl hover:bg-slate-700 transition-colors">
                {t('common.back', { defaultValue: 'Voltar' })}
            </button>
            <button onClick={onSave} disabled={loading} className="flex-[2] bg-white text-primary-600 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg disabled:opacity-50">
                {loading ? t('common.saving', { defaultValue: 'Salvando...' }) : t('common.finish', { defaultValue: 'Finalizar' })}
            </button>
        </div>
    </div>
);

const GuideStep: React.FC<{onFinish: () => void, t: any}> = ({ onFinish, t }) => (
    <div className="space-y-8 h-full flex flex-col">
        <div className="text-center">
            <h2 className="text-3xl font-black text-white font-outfit mb-2">{t('onboarding.step_guide_title', { defaultValue: 'Tudo pronto!' })}</h2>
            <p className="text-slate-400">{t('onboarding.step_guide_desc', { defaultValue: 'Veja o que você pode fazer:' })}</p>
        </div>

        <div className="space-y-3 flex-1">
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/5 rounded-2xl">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-primary-400 flex-shrink-0">
                    <span className="material-symbols-rounded filled">location_on</span>
                </div>
                <div>
                    <h3 className="font-bold text-white">{t('onboarding.feature_radar', { defaultValue: 'Radar' })}</h3>
                    <p className="text-xs text-slate-400 leading-snug">{t('onboarding.feature_radar_desc', { defaultValue: 'Encontre caras próximos no mapa ou na grade.' })}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/5 rounded-2xl">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-red-500 flex-shrink-0">
                    <span className="material-symbols-rounded filled">local_fire_department</span>
                </div>
                <div>
                    <h3 className="font-bold text-white">{t('onboarding.feature_agora', { defaultValue: 'Modo Agora' })}</h3>
                    <p className="text-xs text-slate-400 leading-snug">{t('onboarding.feature_agora_desc', { defaultValue: 'Ative para mostrar que está buscando algo pra já.' })}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/5 rounded-2xl">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-yellow-400 flex-shrink-0">
                    <span className="material-symbols-rounded filled">auto_awesome</span>
                </div>
                <div>
                    <h3 className="font-bold text-white">{t('onboarding.feature_plus', { defaultValue: 'Seja Plus' })}</h3>
                    <p className="text-xs text-slate-400 leading-snug">{t('onboarding.feature_plus_desc', { defaultValue: 'Descubra quem te viu e navegue invisível.' })}</p>
                </div>
            </div>
        </div>

        <button onClick={onFinish} className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-900/30 hover:scale-105 transition-transform active:scale-95 text-lg">
            {t('onboarding.enter_app', { defaultValue: 'Entrar no Ponto G' })}
        </button>
    </div>
);
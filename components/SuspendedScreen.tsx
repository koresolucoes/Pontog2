
import React from 'react';
import { User } from '../types';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface SuspendedScreenProps {
    user: User;
}

export const SuspendedScreen: React.FC<SuspendedScreenProps> = ({ user }) => {
    const { t } = useTranslation();
    const { signOut } = useAuthStore();
    const isBanned = user.status === 'banned';
    const suspendedUntil = user.suspended_until ? new Date(user.suspended_until) : null;

    return (
        <div className="min-h-screen w-full bg-dark-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600 z-10"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-dark-950 to-dark-950"></div>
            
            <div className="relative z-20 max-w-md w-full text-center space-y-8 animate-fade-in-up">
                
                <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto">
                        <span className="material-symbols-rounded text-5xl text-red-500 filled">
                            {isBanned ? 'block' : 'timer_off'}
                        </span>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-dark-950 px-3 py-1 rounded-full border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
                        {isBanned ? t('suspended.banned_badge', { defaultValue: 'Banido' }) : t('suspended.suspended_badge', { defaultValue: 'Suspenso' })}
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-black text-white font-outfit mb-3">
                        {isBanned ? t('suspended.revoked_title', { defaultValue: 'Acesso Revogado' }) : t('suspended.suspended_title', { defaultValue: 'Conta Suspensa' })}
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed px-4">
                        {isBanned 
                            ? t('suspended.banned_desc', { defaultValue: 'Sua conta foi permanentemente banida por violar nossos Termos de Uso. Esta decisão é definitiva.' })
                            : t('suspended.suspended_desc', { defaultValue: 'O acesso à sua conta foi temporariamente bloqueado devido a uma violação das diretrizes da comunidade.' })
                        }
                    </p>
                </div>

                {!isBanned && suspendedUntil && (
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">{t('suspended.returns_in', { defaultValue: 'Volta em' })}</p>
                        <p className="text-xl font-bold text-white">
                            {format(suspendedUntil, "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-slate-400">
                            {t('suspended.at_time', { defaultValue: 'às {{time}}', time: format(suspendedUntil, "HH:mm") })}
                        </p>
                    </div>
                )}

                <div className="space-y-4 pt-4">
                    <button 
                        onClick={() => signOut()} 
                        className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-all border border-white/10"
                    >
                        {t('common.logout', { defaultValue: 'Sair da Conta' })}
                    </button>
                    
                    <p className="text-[10px] text-slate-600 max-w-xs mx-auto">
                        {t('suspended.support_msg', { defaultValue: 'Se você acredita que isso foi um erro, entre em contato com o suporte em ajuda@pontog.app' })}
                    </p>
                </div>
            </div>
        </div>
    );
};

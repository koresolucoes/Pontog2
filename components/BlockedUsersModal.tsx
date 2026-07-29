import React, { useEffect, useState } from 'react';
import { useUserActionsStore, BlockedUser } from '../stores/userActionsStore';
import { ConfirmationModal } from './ConfirmationModal';
import { getPublicImageUrl } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface BlockedUsersModalProps {
    onClose: () => void;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({ onClose }) => {
    useHardwareBack(true, onClose);
    const { t } = useTranslation();
    const { blockedUsers, isFetchingBlocked, fetchBlockedUsers, unblockUser } = useUserActionsStore();
    const [userToUnblock, setUserToUnblock] = useState<BlockedUser | null>(null);

    useEffect(() => {
        fetchBlockedUsers();
    }, [fetchBlockedUsers]);

    const handleConfirmUnblock = () => {
        if (userToUnblock) {
            unblockUser(userToUnblock.blocked_id);
            setUserToUnblock(null);
        }
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={onClose}>
                <div 
                    className="bg-slate-900/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md mx-auto animate-slide-in-up flex flex-col h-[80vh] sm:h-auto sm:max-h-[80vh] border border-white/10" 
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-rounded text-red-400">block</span>
                            {t('blocked.title', { defaultValue: 'Bloqueados' })}
                        </h2>
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </header>
                    <main className="flex-1 overflow-y-auto p-5">
                        {isFetchingBlocked ? (
                            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : blockedUsers.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <span className="material-symbols-rounded text-4xl mb-2 opacity-50">check_circle</span>
                                <p>{t('blocked.empty', { defaultValue: 'Você não bloqueou ninguém.' })}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {blockedUsers.map(user => (
                                    <div key={user.blocked_id} className="p-3 flex items-center justify-between bg-slate-800/50 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <img loading="lazy" src={getPublicImageUrl(user.avatar_url)} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-slate-600"/>
                                            <span className="font-bold text-slate-200">{user.username}</span>
                                        </div>
                                        <button 
                                            onClick={() => setUserToUnblock(user)}
                                            className="bg-slate-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors border border-white/10"
                                        >
                                            {t('blocked.unblock', { defaultValue: 'Desbloquear' })}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {userToUnblock && (
                <ConfirmationModal
                    isOpen={!!userToUnblock}
                    title={t('blocked.unblock_title', { defaultValue: 'Desbloquear {{name}}', name: userToUnblock.username })}
                    message={t('blocked.unblock_confirm', { defaultValue: 'Tem certeza que deseja desbloquear {{name}}?', name: userToUnblock.username })}
                    onConfirm={handleConfirmUnblock}
                    onCancel={() => setUserToUnblock(null)}
                    confirmText={t('blocked.unblock', { defaultValue: 'Desbloquear' })}
                />
            )}
        </>
    );
};
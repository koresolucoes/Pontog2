import React, { useState } from 'react';
import { User } from '../types';
import { useUserActionsStore, reportReasons } from '../stores/userActionsStore';
import { useTranslation } from 'react-i18next';

interface ReportUserModalProps {
  user: User;
  onClose: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({ user, onClose }) => {
    const { t } = useTranslation();
    const { reportUser } = useUserActionsStore();
    const [reason, setReason] = useState('');
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            alert(t('report.select_reason', { defaultValue: 'Por favor, selecione um motivo.' }));
            return;
        }
        setLoading(true);
        const success = await reportUser(user.id, reason, comments);
        setLoading(false);
        if (success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in p-4" onClick={onClose}>
            <div
                className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/5 bg-yellow-500/10">
                    <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                        <span className="material-symbols-rounded filled">flag</span>
                        {t('report.title', { defaultValue: 'Denunciar Usuário' })}
                    </h2>
                    <p className="text-sm text-yellow-200/70 mt-1">{t('report.subtitle', { defaultValue: 'Denunciando <span className="font-bold text-white">{{username}}</span>. Seu anonimato é garantido.', username: user.username, interpolation: { escapeValue: false } })}</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-2 mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">{t('report.reason_label', { defaultValue: 'Motivo' })}</label>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                            {reportReasons.map(r => (
                                <label key={r.key} className={`flex items-center p-3.5 rounded-xl cursor-pointer transition-all border ${reason === r.key ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-700/50 border-transparent hover:bg-slate-700'}`}>
                                    <div className="relative flex items-center">
                                        <input
                                            type="radio"
                                            name="reason"
                                            value={r.key}
                                            checked={reason === r.key}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="peer sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${reason === r.key ? 'border-red-500' : 'border-slate-500'}`}>
                                            {reason === r.key && <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>}
                                        </div>
                                    </div>
                                    <span className={`ml-3 text-sm font-medium ${reason === r.key ? 'text-white' : 'text-slate-300'}`}>{t(`report.reasons.${r.key}`, { defaultValue: r.label })}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {reason === 'other' && (
                        <div className="animate-fade-in">
                            <label htmlFor="comments" className="text-xs font-bold text-slate-400 uppercase ml-1">
                                {t('report.details_label', { defaultValue: 'Detalhes Adicionais' })}
                            </label>
                            <textarea
                                id="comments"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows={3}
                                className="mt-1 w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all resize-none"
                                placeholder={t('report.details_placeholder', { defaultValue: 'Descreva o ocorrido...' })}
                            />
                        </div>
                    )}

                    <div className="mt-8 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-600 transition-colors"
                        >
                            {t('common.cancel', { defaultValue: 'Cancelar' })}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason}
                            className="flex-[2] bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? t('report.sending', { defaultValue: 'Enviando...' }) : t('report.send', { defaultValue: 'Enviar Denúncia' })}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
import React, { useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useOwnerStore } from '../../../stores/ownerStore';

export const OwnerDashboardView: React.FC = () => {
    const { user } = useAuthStore();
    const { managedVenues, fetchManagedVenues, loading } = useOwnerStore();

    useEffect(() => {
        if (user) {
            fetchManagedVenues(user.id);
        }
    }, [user, fetchManagedVenues]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold font-outfit text-white">Dashboard</h2>
            <p className="text-slate-400">Bem-vindo ao seu painel de controle B2B, {user?.username}.</p>

            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-700 rounded"></div>
                            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center">
                                <span className="material-symbols-rounded">store</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Locais Gerenciados</p>
                                <p className="text-2xl font-bold text-white">{managedVenues.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                                <span className="material-symbols-rounded">qr_code_scanner</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">QR Codes Ativos</p>
                                <p className="text-2xl font-bold text-white">{managedVenues.length}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">Imprima os QRs e coloque nos seus locais.</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                <span className="material-symbols-rounded">people</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Check-ins Totais</p>
                                <p className="text-2xl font-bold text-white">--</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

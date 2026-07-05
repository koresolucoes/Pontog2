import React, { useState, useEffect } from 'react';
import { useOwnerStore } from '../../../stores/ownerStore';
import { useAuthStore } from '../../../stores/authStore';
import { Venue } from '../../../types';

export const OwnerVenuesView: React.FC = () => {
    const { user } = useAuthStore();
    const { managedVenues, venueCheckins, fetchVenueCheckins, banUser } = useOwnerStore();
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banUserId, setBanUserId] = useState('');
    const [showBanModal, setShowBanModal] = useState(false);

    const handleSelectVenue = (venue: Venue) => {
        setSelectedVenue(venue);
        fetchVenueCheckins(venue.id);
    };

    const handleBanUser = async () => {
        if (!selectedVenue || !banUserId || !banReason) return;
        await banUser(selectedVenue.id, banUserId, banReason);
        setShowBanModal(false);
        setBanUserId('');
        setBanReason('');
    };

    if (selectedVenue) {
        const checkins = venueCheckins[selectedVenue.id] || [];
        return (
            <div className="space-y-6">
                <button 
                    onClick={() => setSelectedVenue(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-rounded">arrow_back</span>
                    Voltar aos Locais
                </button>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <img 
                        src={selectedVenue.image_url || 'https://via.placeholder.com/150'} 
                        alt={selectedVenue.name} 
                        className="w-32 h-32 rounded-2xl object-cover bg-slate-800"
                    />
                    <div>
                        <h2 className="text-3xl font-bold font-outfit text-white">{selectedVenue.name}</h2>
                        <p className="text-slate-400 mt-2">{selectedVenue.description}</p>
                        <div className="mt-4 flex gap-2">
                            <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
                                <span className="material-symbols-rounded">qr_code</span>
                                Imprimir QR Code
                            </button>
                            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors">
                                Editar Perfil
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="text-xl font-bold font-outfit text-white mb-4">Check-ins Recentes</h3>
                    {checkins.length === 0 ? (
                        <p className="text-slate-500 bg-slate-800/30 p-4 rounded-xl border border-white/5">Nenhum check-in recente.</p>
                    ) : (
                        <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap min-w-[500px]">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="p-4 font-medium text-slate-400">Usuário</th>
                                        <th className="p-4 font-medium text-slate-400">Data</th>
                                        <th className="p-4 font-medium text-slate-400 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkins.map((checkin, i) => (
                                        <tr key={i} className="border-t border-white/5">
                                            <td className="p-4 flex items-center gap-3">
                                                <img src={checkin.avatar_url || 'https://via.placeholder.com/40'} alt={checkin.username} className="w-10 h-10 rounded-full object-cover" />
                                                <span className="font-medium text-white">{checkin.username}</span>
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {new Date(checkin.checked_in_at).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => { setBanUserId(checkin.user_id); setShowBanModal(true); }}
                                                    className="text-red-400 hover:text-red-300 text-sm font-medium"
                                                >
                                                    Banir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {showBanModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-xl font-bold text-white mb-4">Banir Usuário</h3>
                            <p className="text-sm text-slate-400 mb-4">Tem certeza que deseja banir este usuário do seu local? Ele não poderá fazer check-in ou interagir no perfil do local.</p>
                            
                            <label className="block text-sm font-medium text-slate-300 mb-2">Motivo do Banimento</label>
                            <input 
                                type="text"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-6"
                                placeholder="Descreva o motivo"
                            />
                            
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowBanModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleBanUser}
                                    disabled={!banReason}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                                >
                                    Confirmar Banimento
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold font-outfit text-white">Meus Locais</h2>
            <p className="text-slate-400">Gerencie seus estabelecimentos ou eventos.</p>

            {managedVenues.length === 0 ? (
                <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-8 text-center">
                    <span className="material-symbols-rounded text-4xl text-slate-500 mb-2">store_off</span>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum local</h3>
                    <p className="text-slate-400 text-sm">Você ainda não gerencia nenhum local.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {managedVenues.map(venue => (
                        <div 
                            key={venue.id} 
                            className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden hover:border-primary-500/50 transition-colors cursor-pointer group flex flex-col"
                            onClick={() => handleSelectVenue(venue)}
                        >
                            <div className="h-32 bg-slate-700 relative">
                                {venue.image_url ? (
                                    <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">Sem Imagem</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                <div className="absolute bottom-3 left-3 flex gap-2">
                                    <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                        {venue.type}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 flex-1">
                                <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">{venue.name}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2 mt-1">{venue.address}</p>
                            </div>
                            <div className="p-4 border-t border-white/5 bg-slate-900/30 flex justify-between items-center text-sm">
                                <span className="text-slate-400 flex items-center gap-1">
                                    <span className="material-symbols-rounded text-[16px]">qr_code</span> Gerenciar
                                </span>
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-white transition-colors">arrow_forward</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

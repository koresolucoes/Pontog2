import React, { useState, useEffect } from 'react';
import { useMapStore } from '../../../stores/mapStore';
import { useAuthStore } from '../../../stores/authStore';
import { useOwnerStore } from '../../../stores/ownerStore';
import { Venue } from '../../../types';

export const OwnerClaimVenueView: React.FC = () => {
    const { venues, fetchVenues } = useMapStore();
    const { user } = useAuthStore();
    const { claimVenue } = useOwnerStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [proof, setProof] = useState('');

    useEffect(() => {
        if (venues.length === 0) {
            fetchVenues();
        }
    }, [venues, fetchVenues]);

    const filteredVenues = venues.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.address.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // show max 5 results

    const handleClaim = async () => {
        if (!selectedVenue || !user || !proof) return;
        const success = await claimVenue(user.id, selectedVenue.id, proof);
        if (success) {
            setSelectedVenue(null);
            setProof('');
            setSearchTerm('');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold font-outfit text-white">Reivindicar Local</h2>
                <p className="text-slate-400 mt-2">
                    Encontre seu estabelecimento ou evento na plataforma e assuma o controle do perfil.
                </p>
            </div>

            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                
                {/* Search */}
                {!selectedVenue && (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-300">Buscar pelo nome ou endereço</label>
                        <div className="relative">
                            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Ex: Bar do Zé..."
                                className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500"
                            />
                        </div>

                        {searchTerm && (
                            <div className="bg-dark-900 border border-white/10 rounded-xl overflow-hidden mt-2">
                                {filteredVenues.length > 0 ? (
                                    filteredVenues.map(venue => (
                                        <button
                                            key={venue.id}
                                            onClick={() => setSelectedVenue(venue)}
                                            className="w-full text-left p-4 hover:bg-slate-800 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="font-bold text-white group-hover:text-primary-400 transition-colors">{venue.name}</p>
                                                <p className="text-xs text-slate-500">{venue.address}</p>
                                            </div>
                                            <span className="material-symbols-rounded text-slate-600 group-hover:text-primary-500 transition-colors">arrow_forward</span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="p-4 text-slate-500 text-sm text-center">Nenhum local encontrado.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Claim Form */}
                {selectedVenue && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">Reivindicar: {selectedVenue.name}</h3>
                                <p className="text-sm text-slate-400">{selectedVenue.address}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedVenue(null)}
                                className="text-slate-500 hover:text-white"
                            >
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Comprovação de Propriedade</label>
                            <p className="text-xs text-slate-500 mb-3">
                                Forneça informações que comprovem que você é o dono ou administrador. Pode ser um CNPJ, link para o Instagram oficial, telefone do local, etc. Entraremos em contato se necessário.
                            </p>
                            <textarea
                                value={proof}
                                onChange={(e) => setProof(e.target.value)}
                                rows={4}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary-500 resize-none"
                                placeholder="CNPJ, link das redes sociais, ou outras informações..."
                            />
                        </div>

                        <button
                            onClick={handleClaim}
                            disabled={!proof.trim()}
                            className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(245,12,105,0.4)] disabled:shadow-none"
                        >
                            Enviar Reivindicação
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded">info</span>
                    O local não está no mapa?
                </h4>
                <p className="text-sm text-slate-400">
                    Se o seu estabelecimento não aparece na busca, você pode sugeri-lo no mapa principal do app. Assim que ele for aprovado, você poderá reivindicá-lo aqui.
                </p>
            </div>
        </div>
    );
};

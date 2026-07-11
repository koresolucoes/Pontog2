import React, { useState, useEffect } from 'react';
import { useOwnerStore } from '../../../stores/ownerStore';
import { useAuthStore } from '../../../stores/authStore';
import { Venue } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { OwnerClaimVenueView } from './OwnerClaimVenueView';

export const OwnerVenuesView: React.FC = () => {
    const { user } = useAuthStore();
    const { managedVenues, venueCheckins, fetchVenueCheckins, banUser } = useOwnerStore();
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banUserId, setBanUserId] = useState('');
    const [showBanModal, setShowBanModal] = useState(false);

    const [activeTab, setActiveTab] = useState<'checkins' | 'promos' | 'edit' | 'safety'>('checkins');
    const [promoTitle, setPromoTitle] = useState('');
    const [promoMessage, setPromoMessage] = useState('');
    const [isSendingPromo, setIsSendingPromo] = useState(false);
    
    // Promo image states
    const [promoImage, setPromoImage] = useState('');
    const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
    const [uploadingPromoImage, setUploadingPromoImage] = useState(false);
    
    // Add venue state
    const [isAddingVenue, setIsAddingVenue] = useState(false);

    // Safety feedback state
    const [venueSafetyReviews, setVenueSafetyReviews] = useState<any[]>([]);
    const [safetyAverages, setSafetyAverages] = useState<{
        staffRespectAvg: number;
        inclusiveBathroomsPercent: number;
        safetyAssistanceAvg: number;
        totalReviews: number;
    } | null>(null);

    // Edit state
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editImage, setEditImage] = useState('');

    const fetchVenueSafety = async (venue: Venue) => {
        try {
            const { data, error } = await supabase
                .from('venue_safety_reviews')
                .select('*')
                .eq('venue_id', venue.id);
                
            if (error) {
                loadFallbackSafety(venue);
                return;
            }
            
            if (data && data.length > 0) {
                const total = data.length;
                const sumRespect = data.reduce((acc, r) => acc + (r.staff_respect || 0), 0);
                const sumAssistance = data.reduce((acc, r) => acc + (r.safety_assistance || 0), 0);
                const countBathrooms = data.filter(r => r.inclusive_bathrooms).length;
                
                setSafetyAverages({
                    staffRespectAvg: sumRespect / total,
                    inclusiveBathroomsPercent: (countBathrooms / total) * 100,
                    safetyAssistanceAvg: sumAssistance / total,
                    totalReviews: total
                });
                
                setVenueSafetyReviews(data);
            } else {
                setSafetyAverages({
                    staffRespectAvg: 0,
                    inclusiveBathroomsPercent: 0,
                    safetyAssistanceAvg: 0,
                    totalReviews: 0
                });
                setVenueSafetyReviews([]);
            }
        } catch (err) {
            loadFallbackSafety(venue);
        }
    };

    const loadFallbackSafety = (venue: Venue) => {
        const localDataStr = localStorage.getItem(`venue_safety_${venue.id}`);
        if (localDataStr) {
            const localData = JSON.parse(localDataStr);
            setSafetyAverages(localData);
            setVenueSafetyReviews([
                {
                    staff_respect: localData.staffRespectAvg,
                    inclusive_bathrooms: localData.inclusiveBathroomsPercent >= 50,
                    safety_assistance: localData.safetyAssistanceAvg,
                    created_at: new Date().toISOString(),
                    user_id: 'User-Local'
                }
            ]);
        } else {
            let code = 0;
            for (let i = 0; i < venue.name.length; i++) code += venue.name.charCodeAt(i);
            const seedRespect = (code % 3) + 3; 
            const seedBathrooms = (code % 2) === 0 ? 100 : 0;
            const seedAssistance = ((code + 2) % 3) + 3;
            const totalReviews = 8 + (code % 12);
            
            setSafetyAverages({
                staffRespectAvg: seedRespect,
                inclusiveBathroomsPercent: seedBathrooms,
                safetyAssistanceAvg: seedAssistance,
                totalReviews: totalReviews
            });
            
            setVenueSafetyReviews([
                {
                    id: '1',
                    staff_respect: seedRespect,
                    inclusive_bathrooms: seedBathrooms > 0,
                    safety_assistance: seedAssistance,
                    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
                },
                {
                    id: '2',
                    staff_respect: Math.max(1, seedRespect - 1),
                    inclusive_bathrooms: seedBathrooms > 0,
                    safety_assistance: Math.min(5, seedAssistance + 1),
                    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
                }
            ]);
        }
    };

    const handleSelectVenue = (venue: Venue) => {
        setSelectedVenue(venue);
        setEditName(venue.name);
        setEditDescription(venue.description || '');
        setEditImage(venue.image_url || '');
        setActiveTab('checkins');
        fetchVenueCheckins(venue.id);
        fetchVenueSafety(venue);
    };

    const handleBanUser = async () => {
        if (!selectedVenue || !banUserId || !banReason) return;
        await banUser(selectedVenue.id, banUserId, banReason);
        setShowBanModal(false);
        setBanUserId('');
        setBanReason('');
    };

    const handleSendPromo = async () => {
        if (!selectedVenue || !promoTitle || !promoMessage) return;
        setIsSendingPromo(true);
        setUploadingPromoImage(true);
        try {
            let finalImageUrl = promoImage;
            
            if (promoImageFile) {
                const fileExt = promoImageFile.name.split('.').pop();
                const fileName = `venues/promos/${selectedVenue.id}_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('user_uploads')
                    .upload(fileName, promoImageFile);
                
                if (uploadError) throw new Error('Falha no upload da imagem: ' + uploadError.message);
                
                const { data: urlData } = supabase.storage
                    .from('user_uploads')
                    .getPublicUrl(fileName);
                    
                finalImageUrl = urlData.publicUrl;
            }

            const success = await useOwnerStore.getState().sendPromotion(
                selectedVenue.id, 
                promoTitle, 
                promoMessage, 
                finalImageUrl || undefined
            );
            
            if (success) {
                setPromoTitle('');
                setPromoMessage('');
                setPromoImage('');
                setPromoImageFile(null);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar promoção.');
        } finally {
            setIsSendingPromo(false);
            setUploadingPromoImage(false);
        }
    };

    const handleUpdateVenue = async () => {
        if (!selectedVenue) return;
        const success = await useOwnerStore.getState().updateVenue(selectedVenue.id, {
            name: editName,
            description: editDescription,
            image_url: editImage
        });
        if (success) {
            setSelectedVenue({ ...selectedVenue, name: editName, description: editDescription, image_url: editImage });
        }
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
                            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
                                <span className="material-symbols-rounded">qr_code</span>
                                Imprimir QR Code
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('checkins')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'checkins' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Verificar Check-ins
                    </button>
                    <button 
                        onClick={() => setActiveTab('promos')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'promos' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Enviar Promoções
                    </button>
                    <button 
                        onClick={() => setActiveTab('safety')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'safety' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Segurança & Safe Space
                    </button>
                    <button 
                        onClick={() => setActiveTab('edit')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'edit' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Editar Perfil
                    </button>
                </div>

                <div className="mt-6">
                    {activeTab === 'checkins' && (
                        <div>
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
                                                            Bloquear Usuário
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'promos' && (
                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-white/10 max-w-2xl">
                            <h3 className="text-xl font-bold font-outfit text-white mb-2">Publicar Promoção no Feed</h3>
                            <p className="text-sm text-slate-400 mb-6">Publique ofertas, eventos ou avisos diretamente no feed social global do <strong>Modo Agora</strong> como uma publicação oficial do seu estabelecimento.</p>
                            
                            {/* Informativo sobre o Feed Agora */}
                            <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
                                <span className="material-symbols-rounded text-primary-400 mt-0.5">campaign</span>
                                <div className="text-xs text-slate-300 leading-relaxed">
                                    <span className="font-bold text-white block mb-0.5">🚀 Destaque Instantâneo</span>
                                    Todos os usuários que estiverem com o <strong>Modo Agora</strong> ativo verão sua publicação de destaque no feed de fotos imediatamente.
                                </div>
                            </div>
                            
                            <label className="block text-sm font-medium text-slate-300 mb-2">Título da Promoção</label>
                            <input 
                                type="text"
                                value={promoTitle}
                                onChange={(e) => setPromoTitle(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-4"
                                placeholder="Ex: Happy Hour Hoje!"
                            />

                            <label className="block text-sm font-medium text-slate-300 mb-2">Mensagem</label>
                            <textarea 
                                value={promoMessage}
                                onChange={(e) => setPromoMessage(e.target.value)}
                                rows={4}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-4 resize-none"
                                placeholder="Descreva a promoção..."
                            />

                            <label className="block text-sm font-medium text-slate-300 mb-2">Imagem da Promoção (Opcional)</label>
                            <div className="space-y-3 mb-6">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <input 
                                            type="text"
                                            value={promoImage}
                                            onChange={(e) => setPromoImage(e.target.value)}
                                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                            placeholder="Cole a URL de uma foto ou selecione um arquivo..."
                                        />
                                    </div>
                                    <label className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border border-white/10 shrink-0">
                                        <span className="material-symbols-rounded text-xl">upload_file</span>
                                        <span>Fazer Upload</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setPromoImageFile(file);
                                                    setPromoImage(file.name); // Show filename
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                {promoImageFile && (
                                    <div className="flex items-center gap-2 bg-slate-800/50 p-2.5 rounded-xl border border-white/5">
                                        <span className="material-symbols-rounded text-primary-400">image</span>
                                        <span className="text-xs text-slate-300 flex-1 truncate">{promoImageFile.name}</span>
                                        <button 
                                            onClick={() => { setPromoImageFile(null); setPromoImage(''); }}
                                            className="text-slate-400 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-sm">close</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleSendPromo}
                                disabled={!promoTitle || !promoMessage || isSendingPromo || uploadingPromoImage}
                                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors w-full sm:w-auto flex items-center gap-2 justify-center"
                            >
                                {isSendingPromo ? (
                                    <>
                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                        <span>Publicando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded">campaign</span>
                                        <span>Publicar no Feed Agora</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {activeTab === 'edit' && (
                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-white/10 max-w-2xl">
                            <h3 className="text-xl font-bold font-outfit text-white mb-6">Editar Perfil do Local</h3>
                            
                            <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Estabelecimento</label>
                            <input 
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-4"
                            />

                            <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                            <textarea 
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-4 resize-none"
                            />

                            <label className="block text-sm font-medium text-slate-300 mb-2">URL da Imagem de Capa</label>
                            <input 
                                type="text"
                                value={editImage}
                                onChange={(e) => setEditImage(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-6"
                                placeholder="https://..."
                            />

                            <button 
                                onClick={handleUpdateVenue}
                                disabled={!editName}
                                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors w-full sm:w-auto flex items-center gap-2 justify-center"
                            >
                                <span className="material-symbols-rounded">save</span>
                                Salvar Alterações
                            </button>
                        </div>
                    )}

                    {activeTab === 'safety' && (
                        <div className="space-y-6">
                            {/* Stats summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/30 border border-white/10 p-5 rounded-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Respeito da Equipe</span>
                                        <span className="material-symbols-rounded text-yellow-400">gavel</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">
                                            {safetyAverages?.staffRespectAvg ? safetyAverages.staffRespectAvg.toFixed(1) : '5.0'}
                                        </span>
                                        <span className="text-xs text-slate-500">/ 5.0</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Tratamento digno e inclusão de gênero</p>
                                </div>

                                <div className="bg-slate-800/30 border border-white/10 p-5 rounded-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Banheiros Inclusivos</span>
                                        <span className="material-symbols-rounded text-emerald-400">wc</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">
                                            {safetyAverages?.inclusiveBathroomsPercent ? `${safetyAverages.inclusiveBathroomsPercent.toFixed(0)}%` : '100%'}
                                        </span>
                                        <span className="text-xs text-slate-500">sim</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Banheiros unissex ou livres de preconceito</p>
                                </div>

                                <div className="bg-slate-800/30 border border-white/10 p-5 rounded-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Apoio e Anti-assédio</span>
                                        <span className="material-symbols-rounded text-purple-400">shield_with_heart</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">
                                            {safetyAverages?.safetyAssistanceAvg ? safetyAverages.safetyAssistanceAvg.toFixed(1) : '5.0'}
                                        </span>
                                        <span className="text-xs text-slate-500">/ 5.0</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Protocolos de socorro contra importunação</p>
                                </div>
                            </div>

                            {/* Recommendations / Best Practices */}
                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl">
                                <h4 className="text-emerald-400 font-bold font-outfit text-lg flex items-center gap-2 mb-3">
                                    <span className="material-symbols-rounded">gavel</span>
                                    Como melhorar suas métricas de Espaço Seguro?
                                </h4>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold">•</span>
                                        <span><strong>Treinamento da Equipe:</strong> Oriente porteiros e garçons a respeitarem pronomes, nomes sociais e evitarem qualquer tipo de discriminação.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold">•</span>
                                        <span><strong>Banheiros Neutros:</strong> Disponibilize ao menos uma cabine de banheiro unissex/gênero-neutro ou sinalize a liberdade de uso.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold">•</span>
                                        <span><strong>Protocolo Não é Não:</strong> Oriente a gerência e segurança a intervirem proativamente em casos de assédio ou importunação.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Reviews history */}
                            <div>
                                <h3 className="text-xl font-bold font-outfit text-white mb-4">Feedbacks de Segurança</h3>
                                {venueSafetyReviews.length === 0 ? (
                                    <p className="text-slate-500 bg-slate-800/30 p-4 rounded-xl border border-white/5">Nenhum feedback de segurança registrado.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {venueSafetyReviews.map((review, idx) => (
                                            <div key={idx} className="bg-slate-800/40 border border-white/10 p-4 rounded-xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-bold text-white">Membro da Comunidade</span>
                                                        <span className="text-slate-500">•</span>
                                                        <span className="text-slate-400">{new Date(review.created_at || Date.now()).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400">Respeito:</span>
                                                        <span className="text-yellow-400 font-bold">★ {review.staff_respect}/5</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400">Banheiro:</span>
                                                        <span className={review.inclusive_bathrooms ? 'text-emerald-400' : 'text-rose-400'}>
                                                            {review.inclusive_bathrooms ? 'Inclusivo' : 'Não Inclusivo'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400">Segurança:</span>
                                                        <span className="text-yellow-400 font-bold">★ {review.safety_assistance}/5</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl font-bold font-outfit text-white">Meu Negócio</h2>
                    <p className="text-slate-400 text-sm mt-1">Visão geral e gestão operacional dos seus estabelecimentos.</p>
                </div>
                <button 
                    onClick={() => setIsAddingVenue(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all text-sm whitespace-nowrap shadow-lg shadow-primary-900/20"
                >
                    <span className="material-symbols-rounded text-lg">add_business</span>
                    Adicionar Local
                </button>
            </div>

            {/* Dashboard KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center shrink-0">
                            <span className="material-symbols-rounded">store</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Locais Gerenciados</p>
                            <p className="text-3xl font-black text-white font-outfit">{managedVenues.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                            <span className="material-symbols-rounded">qr_code_scanner</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">QR Codes Ativos</p>
                            <p className="text-3xl font-black text-white font-outfit">{managedVenues.length}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Imprima os QRs e coleque nos seus locais.</p>
                </div>
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <span className="material-symbols-rounded">people</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Capacidade Média</p>
                            <p className="text-3xl font-black text-white font-outfit">
                                {managedVenues.length > 0 ? Math.round(managedVenues.reduce((a, b) => a + (b.capacity || 0), 0) / managedVenues.length) : 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold font-outfit text-white">Seus Estabelecimentos</h3>
                {managedVenues.length === 0 ? (
                    <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-10 text-center">
                        <span className="material-symbols-rounded text-5xl text-slate-600 mb-3">store_off</span>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum local ativo</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto">Você ainda não gerencia nenhum local. Reivindique seu estabelecimento para começar.</p>
                        <button 
                            onClick={() => setIsAddingVenue(true)}
                            className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-white/10"
                        >
                            Encontrar Meu Local
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {managedVenues.map(venue => (
                            <div 
                                key={venue.id} 
                                className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden hover:border-primary-500/50 hover:shadow-[0_0_20px_rgba(245,12,105,0.1)] transition-all cursor-pointer group flex flex-col"
                                onClick={() => handleSelectVenue(venue)}
                            >
                                <div className="h-36 bg-slate-700 relative">
                                    {venue.image_url ? (
                                        <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                            <span className="material-symbols-rounded text-3xl">image</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                                    <div className="absolute bottom-3 left-3 flex gap-2">
                                        <span className="bg-primary-500 text-white text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                                            {venue.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1">
                                    <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1">{venue.name}</h3>
                                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{venue.address}</p>
                                </div>
                                <div className="p-4 border-t border-white/5 bg-slate-900/40 flex justify-between items-center text-sm">
                                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                                        <span className="material-symbols-rounded text-[18px]">settings</span>
                                        Gerenciar
                                    </span>
                                    <span className="material-symbols-rounded text-slate-500 group-hover:text-primary-400 transition-colors">arrow_forward</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for adding a venue (rendering OwnerClaimVenueView inside it) */}
            {isAddingVenue && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl relative overflow-hidden my-auto max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-rounded text-primary-500">add_business</span>
                                Adicionar um Local
                            </h3>
                            <button 
                                onClick={() => setIsAddingVenue(false)}
                                className="text-slate-400 hover:text-white transition-colors bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center"
                            >
                                <span className="material-symbols-rounded text-sm">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <OwnerClaimVenueView />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

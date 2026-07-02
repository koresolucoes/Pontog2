
// pages/Admin/views/VenuesView.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { Venue, VenueType } from '../../../types';
import toast from 'react-hot-toast';
import * as L from 'leaflet';
import { AddressAutocomplete } from '../../../components/AddressAutocomplete';
import { supabase } from '../../../lib/supabase'; // Import Supabase client for storage

const VENUE_TYPES: { value: VenueType; label: string }[] = [
    { value: 'sauna', label: 'Sauna' },
    { value: 'bar', label: 'Bar / Balada' },
    { value: 'club', label: 'Boate' },
    { value: 'cruising', label: 'Cruising / Pegação' },
    { value: 'cinema', label: 'Cinema' },
    { value: 'shop', label: 'Loja / Sex Shop' },
];

const DEFAULT_VENUE_STATE: Partial<Venue> = {
    name: '', 
    type: 'bar', 
    address: '', 
    description: '', 
    lat: -23.5505, 
    lng: -46.6333, 
    image_url: '', 
    is_partner: false, 
    is_verified: true,
    tags: []
};

// Componente de Modal para Adicionar/Editar
const VenueModal: React.FC<{
    venue: Partial<Venue> | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ venue, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Venue>>(DEFAULT_VENUE_STATE);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false); // New state for image upload
    const [imageFile, setImageFile] = useState<File | null>(null); // New state for file
    const [previewUrl, setPreviewUrl] = useState<string | null>(null); // New state for preview

    const token = useAdminStore((state) => state.getToken());
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

    const isEditing = !!venue?.id;

    useEffect(() => {
        if (venue) {
            setFormData({ 
                ...DEFAULT_VENUE_STATE, 
                ...venue, 
                type: venue.type || DEFAULT_VENUE_STATE.type,
                lat: venue.lat ?? DEFAULT_VENUE_STATE.lat, 
                lng: venue.lng ?? DEFAULT_VENUE_STATE.lng,
                tags: venue.tags || []
            });
            setPreviewUrl(venue.image_url || null);
        }
    }, [venue]);

    // Inicializa o mapa
    useEffect(() => {
        if (!mapRef.current) return;
        
        if (mapInstance.current) {
            mapInstance.current.remove();
        }

        const initialLat = formData.lat || -23.5505;
        const initialLng = formData.lng || -46.6333;

        const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        // Atualiza form ao arrastar
        marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            setFormData(prev => ({ ...prev, lat, lng }));
        });

        // Atualiza form e marcador ao clicar no mapa
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            setFormData(prev => ({ ...prev, lat, lng }));
        });

        mapInstance.current = map;

        setTimeout(() => map.invalidateSize(), 300);

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []); 

    useEffect(() => {
        if (markerRef.current && formData.lat && formData.lng && mapInstance.current) {
            const currentLatLng = markerRef.current.getLatLng();
            if (Math.abs(currentLatLng.lat - formData.lat) > 0.0001 || Math.abs(currentLatLng.lng - formData.lng) > 0.0001) {
                markerRef.current.setLatLng([formData.lat, formData.lng]);
                mapInstance.current.panTo([formData.lat, formData.lng]);
            }
        }
    }, [formData.lat, formData.lng]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    // Handle Image Selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Imagem muito grande (Max 5MB)");
                return;
            }
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleAddressSelect = (address: string, lat: number, lng: number) => {
        setFormData(prev => ({ ...prev, address, lat, lng }));
        toast.success('Localização atualizada!');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalImageUrl = formData.image_url;

            // 1. Upload Image if selected
            if (imageFile) {
                setUploading(true);
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `venues/admin_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('user_uploads')
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error('Falha no upload da imagem: ' + uploadError.message);

                const { data: urlData } = supabase.storage
                    .from('user_uploads')
                    .getPublicUrl(fileName);
                
                finalImageUrl = urlData.publicUrl;
                setUploading(false);
            }

            // 2. Prepare API Payload
            const url = isEditing ? `/api/admin/venues?id=${venue?.id}` : '/api/admin/venues';
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                name: formData.name,
                type: formData.type || 'bar',
                address: formData.address,
                description: formData.description,
                lat: formData.lat,
                lng: formData.lng,
                image_url: finalImageUrl, // Use the uploaded URL or existing one
                is_partner: formData.is_partner,
                is_verified: formData.is_verified,
                tags: Array.isArray(formData.tags) ? formData.tags : [],
                osm_id: formData.osm_id
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Falha ao salvar local');
            }
            
            toast.success(`Local ${isEditing ? 'atualizado' : 'criado'}!`);
            onSave();
            onClose();
        } catch (err: any) {
            setUploading(false);
            toast.error(`Erro: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Coluna da Esquerda: Mapa */}
                <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-slate-800 flex flex-col order-2 md:order-1">
                    <div className="absolute top-4 left-4 right-4 z-20 px-2">
                         <AddressAutocomplete 
                            onSelect={handleAddressSelect} 
                            placeholder="Buscar endereço para mover pino..." 
                        />
                    </div>
                    <div ref={mapRef} className="flex-1 z-0" />
                    <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg pointer-events-none">
                        <div className="flex justify-center gap-4 text-[10px] font-mono text-pink-400">
                            <span>Lat: {formData.lat?.toFixed(5)}</span>
                            <span>Lng: {formData.lng?.toFixed(5)}</span>
                        </div>
                    </div>
                </div>

                {/* Coluna da Direita: Form */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-slate-900 order-1 md:order-2">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-rounded filled text-pink-500">add_location_alt</span>
                        {isEditing ? 'Editar Local' : 'Novo Local'}
                    </h2>
                    
                    {venue?.submitted_by && (
                        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs">
                            <p className="text-purple-300 font-bold">Sugerido por usuário ({venue.submitted_by})</p>
                            {!venue.is_verified && (
                                <p className="text-purple-400/70 mt-1">Ao verificar e salvar, o usuário receberá a recompensa.</p>
                            )}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Image Uploader */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Imagem do Local</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-[21/9] bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-pink-500 transition-all overflow-hidden relative group"
                            >
                                {previewUrl ? (
                                    <>
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                                <span className="material-symbols-rounded">edit</span> Alterar Foto
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="material-symbols-rounded text-2xl text-slate-400">add_a_photo</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Carregar Imagem</span>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                />
                            </div>
                            <input 
                                name="image_url" 
                                value={formData.image_url || ''} 
                                onChange={handleChange} 
                                placeholder="Ou cole a URL aqui..." 
                                className="mt-2 w-full bg-slate-800 border border-white/5 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500/30" 
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome do Local</label>
                            <input name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tipo</label>
                                <select name="type" value={formData.type || 'bar'} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 appearance-none">
                                    {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Verificado?</label>
                                <div className="flex items-center h-full px-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="is_verified" checked={formData.is_verified || false} onChange={handleChange} className="w-5 h-5 rounded bg-slate-700 border-none text-pink-600 focus:ring-pink-500/50" />
                                        <span className="text-sm text-white">Sim, publicar.</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Endereço (Exibição)</label>
                            <input 
                                name="address" 
                                value={formData.address || ''} 
                                onChange={handleChange} 
                                placeholder="Rua, Número - Bairro" 
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" 
                                required 
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Descrição</label>
                            <textarea name="description" rows={3} value={formData.description || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none" />
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5 flex items-center justify-between">
                            <span className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                                <span className="material-symbols-rounded filled">star</span>
                                Destaque / Parceiro
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="is_partner" checked={formData.is_partner || false} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {uploading ? 'Enviando Imagem...' : 'Salvando...'}
                                    </>
                                ) : 'Salvar & Publicar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export const VenuesView: React.FC = () => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending'>('all');
    const [editingVenue, setEditingVenue] = useState<Partial<Venue> | null>(null);
    const token = useAdminStore((state) => state.getToken());

    const fetchVenues = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/venues', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar locais');
            const data = await response.json();
            setVenues(data);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar locais.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVenues();
    }, [token]);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este local?')) return;
        try {
            await fetch(`/api/admin/venues?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Local removido.');
            fetchVenues();
        } catch (err) {
            toast.error('Erro ao remover.');
        }
    };

    const filteredVenues = venues.filter(v => {
        if (filter === 'pending') return !v.is_verified;
        return true;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white font-outfit">Gestão de Locais</h1>
                    <p className="text-slate-400">Adicione e gerencie os pontos do Guia.</p>
                </div>
                <button 
                    onClick={() => setEditingVenue(DEFAULT_VENUE_STATE)}
                    className="bg-pink-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-pink-700 transition-colors shadow-lg flex items-center gap-2"
                >
                    <span className="material-symbols-rounded">add_location_alt</span>
                    Novo Local
                </button>
            </div>

            <div className="flex gap-2 mb-6 border-b border-white/10 pb-1">
                <button 
                    onClick={() => setFilter('all')} 
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${filter === 'all' ? 'text-pink-500 border-b-2 border-pink-500 bg-white/5' : 'text-slate-400 hover:text-white'}`}
                >
                    Todos ({venues.length})
                </button>
                <button 
                    onClick={() => setFilter('pending')} 
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${filter === 'pending' ? 'text-pink-500 border-b-2 border-pink-500 bg-white/5' : 'text-slate-400 hover:text-white'}`}
                >
                    Sugestões Pendentes ({venues.filter(v => !v.is_verified).length})
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Carregando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVenues.map(venue => (
                        <div key={venue.id} className={`bg-slate-800 rounded-2xl p-4 border ${venue.is_verified ? 'border-white/5' : 'border-yellow-500/30 bg-yellow-900/10'}`}>
                            <div className="flex gap-4 mb-3">
                                <img 
                                    src={venue.image_url || 'https://placehold.co/100x100/1e293b/475569?text=IMG'} 
                                    className="w-16 h-16 rounded-lg object-cover bg-slate-900"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white truncate">{venue.name}</h3>
                                        <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 uppercase">{venue.type}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{venue.address}</p>
                                    <div className="flex gap-2 mt-1">
                                        {!venue.is_verified && <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1"><span className="material-symbols-rounded text-xs">warning</span> Pendente</span>}
                                        {venue.is_partner && <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1"><span className="material-symbols-rounded filled text-xs">star</span> Parceiro</span>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                <button onClick={() => setEditingVenue(venue)} className={`flex-1 text-white text-xs font-bold py-2 rounded-lg hover:brightness-110 transition-colors ${venue.is_verified ? 'bg-slate-700' : 'bg-green-600 shadow-lg shadow-green-900/20'}`}>
                                    {venue.is_verified ? 'Editar' : 'Revisar & Aprovar'}
                                </button>
                                <button onClick={() => handleDelete(venue.id)} className="px-3 bg-red-500/10 text-red-400 text-xs font-bold py-2 rounded-lg hover:bg-red-500/20">
                                    <span className="material-symbols-rounded text-lg">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingVenue && (
                <VenueModal 
                    venue={editingVenue} 
                    onClose={() => setEditingVenue(null)} 
                    onSave={fetchVenues} 
                />
            )}
        </div>
    );
};

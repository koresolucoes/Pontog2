
import React, { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../stores/mapStore';
import toast from 'react-hot-toast';
import { VenueType } from '../types';
import { AddressAutocomplete } from './AddressAutocomplete';
import { useTranslation } from 'react-i18next';

interface SuggestVenueModalProps {
  onClose: () => void;
}

const VENUE_TYPES: { value: VenueType; label: string }[] = [
    { value: 'sauna', label: 'Sauna' },
    { value: 'bar', label: 'Bar / Balada' },
    { value: 'club', label: 'Boate' },
    { value: 'cruising', label: 'Cruising' },
    { value: 'cinema', label: 'Cinema' },
    { value: 'shop', label: 'Loja' },
];

export const SuggestVenueModal: React.FC<SuggestVenueModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { myLocation, suggestVenue } = useMapStore();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
      name: '',
      type: 'bar' as VenueType,
      address: '',
      description: '',
      lat: myLocation?.lat || 0,
      lng: myLocation?.lng || 0,
  });

  // Se tiver localização inicial, preenche lat/lng (mas não o endereço texto)
  useEffect(() => {
      if (myLocation && formData.lat === 0) {
          setFormData(prev => ({ ...prev, lat: myLocation.lat, lng: myLocation.lng }));
      }
  }, [myLocation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setPhotoFile(file);
          setPreview(URL.createObjectURL(file));
      }
  };

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
      setFormData(prev => ({
          ...prev,
          address,
          lat,
          lng
      }));
      toast.success(t('suggest_venue.address_updated', { defaultValue: 'Localização atualizada pelo endereço!' }));
  };

  const handleUseCurrentLocation = () => {
      setGpsLoading(true);
      if (!navigator.geolocation) {
          toast.error(t('suggest_venue.gps_unsupported', { defaultValue: 'Geolocalização não suportada.' }));
          setGpsLoading(false);
          return;
      }

      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const { latitude, longitude } = position.coords;
              
              let addressText = t('suggest_venue.gps_location', { defaultValue: 'Localização via GPS' });
              try {
                  // Reverse Geocoding to get street, number, etc.
                  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                  const data = await response.json();
                  if (data && data.display_name) {
                      // Prefer display_name or construct a better one if needed
                      // data.address usually has { road, house_number, suburb, city ... }
                      const addr = data.address;
                      if (addr && (addr.road || addr.street)) {
                          const street = addr.road || addr.street;
                          const number = addr.house_number ? `, ${addr.house_number}` : '';
                          const district = addr.suburb || addr.neighbourhood ? ` - ${addr.suburb || addr.neighbourhood}` : '';
                          const city = addr.city || addr.town || addr.municipality ? ` - ${addr.city || addr.town || addr.municipality}` : '';
                          addressText = `${street}${number}${district}${city}`;
                      } else {
                          addressText = data.display_name;
                      }
                  }
              } catch (error) {
                  console.error("Reverse geocoding error:", error);
                  // Fallback keeps previous or default text
              }

              setFormData(prev => ({
                  ...prev,
                  lat: latitude,
                  lng: longitude,
                  address: addressText
              }));
              setGpsLoading(false);
              toast.success(t('suggest_venue.address_autofilled', { defaultValue: 'Endereço preenchido automaticamente!' }));
          },
          (error) => {
              console.error(error);
              toast.error(t('suggest_venue.gps_error', { defaultValue: 'Erro ao obter GPS. Verifique as permissões.' }));
              setGpsLoading(false);
          },
          { enableHighAccuracy: true }
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.address) {
          toast.error(t('suggest_venue.required_fields', { defaultValue: 'Nome e endereço são obrigatórios.' }));
          return;
      }
      setLoading(true);
      const success = await suggestVenue({
          name: formData.name,
          type: formData.type,
          address: formData.address,
          description: formData.description,
          lat: formData.lat,
          lng: formData.lng,
          tags: [], 
      }, photoFile);

      setLoading(false);
      if (success) {
          toast.success(t('suggest_venue.success', { defaultValue: 'Enviado! Se aprovado, você ganha recompensas.' }), { icon: '🏆' });
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-[80] animate-fade-in p-0 sm:p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md mx-auto animate-slide-in-up flex flex-col h-[90vh] sm:max-h-[85vh] border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-rounded filled text-primary-500">add_location_alt</span>
            {t('suggest_venue.title', { defaultValue: 'Sugerir Local' })}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Gamification Banner Compact */}
            <div className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-r from-yellow-600 to-amber-600 shadow-lg flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-full backdrop-blur-md border border-white/20">
                    <span className="material-symbols-rounded filled text-white text-lg">emoji_events</span>
                </div>
                <div>
                    <h3 className="font-black text-white text-xs uppercase tracking-wide">{t('suggest_venue.reward_title', { defaultValue: 'Ganhe Recompensas' })}</h3>
                    <p className="text-[10px] text-yellow-100 leading-tight">
                        {t('suggest_venue.reward_desc', { defaultValue: 'Indique um point novo. Se aprovado, ganhe' })} <span className="font-bold text-white">{t('suggest_venue.reward_plus', { defaultValue: '3 Dias de Ponto G Plus (acumulativo)' })}</span>!
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('suggest_venue.venue_name', { defaultValue: 'Nome do Local' })}</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder={t('suggest_venue.name_placeholder', { defaultValue: 'Ex: Sauna Paradise' })} 
                        className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 border border-white/5 text-sm"
                        required 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('suggest_venue.venue_type', { defaultValue: 'Tipo' })}</label>
                    <div className="relative">
                        <select 
                            name="type" 
                            value={formData.type} 
                            onChange={handleChange}
                            className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 border border-white/5 text-sm appearance-none"
                        >
                            {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-rounded text-lg">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('suggest_venue.address', { defaultValue: 'Endereço / Localização' })}</label>
                <div className="flex gap-2">
                    <div className="flex-1 relative z-20">
                        <AddressAutocomplete 
                            onSelect={handleAddressSelect} 
                            initialValue={formData.address}
                            placeholder={t('suggest_venue.address_placeholder', { defaultValue: 'Busque o endereço...' })} 
                        />
                    </div>
                    <button 
                        type="button" 
                        onClick={handleUseCurrentLocation}
                        disabled={gpsLoading}
                        className="w-12 flex items-center justify-center bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-colors"
                        title={t('suggest_venue.use_current_location', { defaultValue: 'Usar localização atual' })}
                    >
                        {gpsLoading ? (
                            <span className="material-symbols-rounded text-lg animate-spin">refresh</span>
                        ) : (
                            <span className="material-symbols-rounded text-lg filled">my_location</span>
                        )}
                    </button>
                </div>
                <div className="flex items-center gap-2 ml-1 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${formData.lat !== 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] text-slate-500">
                        {formData.lat !== 0 ? t('suggest_venue.pin_marked', { defaultValue: 'Pino marcado:' }) + ` ${formData.lat.toFixed(4)}, ${formData.lng.toFixed(4)}` : t('suggest_venue.pin_not_marked', { defaultValue: 'Pino não marcado no mapa' })}
                    </span>
                </div>
            </div>

            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[21/9] bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-primary-500 transition-all overflow-hidden relative group"
            >
                {preview ? (
                    <>
                        <img loading="lazy" src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-rounded">edit</span> {t('common.edit', { defaultValue: 'Alterar' })}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <span className="material-symbols-rounded text-2xl text-slate-400">add_a_photo</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{t('suggest_venue.take_photo', { defaultValue: 'Tirar Foto ou Galeria' })}</span>
                    </div>
                )}
                {/* accept="image/*" allows choosing between Camera and Gallery on mobile */}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('suggest_venue.description', { defaultValue: 'Descrição' })}</label>
                <textarea 
                    name="description" 
                    rows={2} 
                    value={formData.description} 
                    onChange={handleChange} 
                    placeholder={t('suggest_venue.desc_placeholder', { defaultValue: 'Detalhes: preço, público, horário...' })} 
                    className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 border border-white/5 text-sm resize-none"
                />
            </div>
        </form>

        <div className="p-5 border-t border-white/10 bg-slate-800/30 flex gap-3 flex-shrink-0 pb-6 sm:pb-5">
            <button onClick={onClose} className="flex-1 bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-600 transition-colors text-sm">{t('common.cancel', { defaultValue: 'Cancelar' })}</button>
            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="flex-[2] bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                        <span className="material-symbols-rounded filled text-base">send</span>
                        {t('suggest_venue.send', { defaultValue: 'Enviar Sugestão' })}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

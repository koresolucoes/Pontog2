
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { useAlbumStore } from '../stores/albumStore';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { HIV_STATUSES, KINKS, POSITIONS, LOOKING_FOR } from '../lib/constants';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface EditProfileModalProps {
  onClose: () => void;
}

const getPathFromUrl = (url: string): string => {
    try {
        const urlObject = new URL(url);
        const parts = urlObject.pathname.split('/user_uploads/');
        if (parts.length > 1) return parts[1];
    } catch (e) { /* Not a full URL */ }
    return url;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const { profile, fetchProfile } = useAuthStore();
  const { tribes, fetchTribes } = useDataStore();
  const { uploadPhoto } = useAlbumStore(); // Reusing uploadPhoto since it handles generic file upload
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const publicPhotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData({ 
          ...profile, 
          tribes: profile.tribes || [],
          kinks: profile.kinks || [],
          looking_for: profile.looking_for || [],
          can_host: profile.can_host || false
      });
    }
    if (tribes.length === 0) fetchTribes();
  }, [profile, tribes.length, fetchTribes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (e.target.type === 'number') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : Number(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      redes_sociais: {
        ...(prev.redes_sociais || {}),
        [name]: value
      }
    }));
  };

  const handleTribeToggle = (tribeName: string) => {
    const currentTribes = Array.isArray(formData.tribes) ? formData.tribes : [];
    const newTribes = currentTribes.includes(tribeName)
      ? currentTribes.filter((t: string) => t !== tribeName)
      : [...currentTribes, tribeName];
    setFormData(prev => ({ ...prev, tribes: newTribes }));
  };

  const handleKinkToggle = (kink: string) => {
    const currentKinks = Array.isArray(formData.kinks) ? formData.kinks : [];
    const newKinks = currentKinks.includes(kink)
        ? currentKinks.filter((k: string) => k !== kink)
        : [...currentKinks, kink];
    setFormData(prev => ({ ...prev, kinks: newKinks }));
  }

  const handleLookingForToggle = (item: string) => {
    const current = Array.isArray(formData.looking_for) ? formData.looking_for : [];
    const updated = current.includes(item)
        ? current.filter((i: string) => i !== item)
        : [...current, item];
    setFormData(prev => ({ ...prev, looking_for: updated }));
  }
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile) return;
      
      setLoading(true);
      const toastId = toast.loading(t('edit_profile.uploading_avatar', { defaultValue: 'Enviando nova foto de perfil...' }));
      
      const newAvatarPath = await uploadPhoto(file);

      if (!newAvatarPath) {
          toast.error(t('edit_profile.upload_failed', { defaultValue: 'Falha ao enviar a foto.' }), { id: toastId });
          setLoading(false);
          return;
      }
      
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newAvatarPath }).eq('id', profile.id);

      if (updateError) {
          toast.error(t('edit_profile.update_failed', { defaultValue: 'Falha ao atualizar o perfil.' }), { id: toastId });
      } else {
          toast.success(t('edit_profile.avatar_updated', { defaultValue: 'Foto de perfil atualizada!' }), { id: toastId });
          await fetchProfile(profile as any);
      }
      setLoading(false);
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile) return;

      if (file.size > 20 * 1024 * 1024) { // 20MB limit
          toast.error(t('edit_profile.video_too_large', { defaultValue: 'Vídeo muito grande (Max 20MB).' }));
          return;
      }

      setLoading(true);
      const toastId = toast.loading(t('edit_profile.uploading_video', { defaultValue: 'Enviando vídeo de apresentação...' }));

      const videoPath = await uploadPhoto(file); // Reuse upload mechanism
      if (!videoPath) {
          toast.error(t('edit_profile.video_upload_failed', { defaultValue: 'Falha ao enviar o vídeo.' }), { id: toastId });
          setLoading(false);
          return;
      }

      const { error: updateError } = await supabase.from('profiles').update({ video_url: videoPath }).eq('id', profile.id);

      if (updateError) {
          toast.error(t('edit_profile.video_save_failed', { defaultValue: 'Falha ao salvar o vídeo.' }), { id: toastId });
      } else {
          toast.success(t('edit_profile.video_added', { defaultValue: 'Vídeo adicionado!' }), { id: toastId });
          await fetchProfile(profile as any);
      }
      setLoading(false);
  };

  const handleRemoveVideo = async () => {
      if (!profile) return;
      setLoading(true);
      const { error } = await supabase.from('profiles').update({ video_url: null }).eq('id', profile.id);
      if (error) {
          toast.error(t('edit_profile.video_remove_error', { defaultValue: 'Erro ao remover vídeo.' }));
      } else {
          toast.success(t('edit_profile.video_removed', { defaultValue: 'Vídeo removido.' }));
          await fetchProfile(profile as any);
      }
      setLoading(false);
  };

  const handlePublicPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setLoading(true);
    const toastId = toast.loading(t('edit_profile.uploading_public_photo', { defaultValue: 'Enviando foto pública...' }));
    
    const photoPath = await uploadPhoto(file);
    if (!photoPath) {
        toast.error(t('edit_profile.upload_failed', { defaultValue: 'Falha ao enviar a foto.' }), { id: toastId });
        setLoading(false);
        return;
    }

    const currentPhotoPaths = (profile.public_photos || []).map(getPathFromUrl);
    const newPublicPhotos = [...currentPhotoPaths, photoPath];
    
    const { error: updateError } = await supabase.from('profiles').update({ public_photos: newPublicPhotos }).eq('id', profile.id);

    if (updateError) {
        toast.error(t('edit_profile.photo_add_failed', { defaultValue: 'Falha ao adicionar a foto.' }), { id: toastId });
    } else {
        toast.success(t('edit_profile.photo_added', { defaultValue: 'Foto adicionada!' }), { id: toastId });
        await fetchProfile(profile as any);
    }
    setLoading(false);
  };
  
  const handleRemovePublicPhoto = async (photoUrlToRemove: string) => {
    if (!profile) return;
    setLoading(true);
    const toastId = toast.loading(t('edit_profile.removing_photo', { defaultValue: 'Removendo foto...' }));
    
    const photoPathToRemove = getPathFromUrl(photoUrlToRemove);
    const newPublicPhotos = (profile.public_photos || []).map(getPathFromUrl).filter(path => path !== photoPathToRemove);

    const { error: updateError } = await supabase.from('profiles').update({ public_photos: newPublicPhotos }).eq('id', profile.id);
    
    if (updateError) {
        toast.error(t('edit_profile.photo_remove_failed', { defaultValue: 'Falha ao remover a foto.' }), { id: toastId });
    } else {
        toast.success(t('edit_profile.photo_removed', { defaultValue: 'Foto removida!' }), { id: toastId });
        await fetchProfile(profile as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validation: Heuristic #5 (Error Prevention)
    if (formData.height_cm && (formData.height_cm < 50 || formData.height_cm > 250)) {
        toast.error(t('edit_profile.invalid_height', { defaultValue: 'Altura inválida. Por favor, insira um valor entre 50cm e 250cm.' }));
        return;
    }
    if (formData.weight_kg && (formData.weight_kg < 30 || formData.weight_kg > 300)) {
        toast.error(t('edit_profile.invalid_weight', { defaultValue: 'Peso inválido. Por favor, insira um valor entre 30kg e 300kg.' }));
        return;
    }

    setLoading(true);
    const toastId = toast.loading(t('edit_profile.updating_profile', { defaultValue: 'Atualizando perfil...' }));
    
    const { tribes: formTribes, distance_km, lat, lng, video_url, is_traveling, ...profileUpdates } = formData;

    const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', profile.id);
        
    if (profileError) {
        toast.error(t('edit_profile.update_error', { defaultValue: 'Erro ao atualizar perfil.' }), { id: toastId });
        console.error(profileError);
        setLoading(false);
        return;
    }
    
    await supabase.from('profile_tribes').delete().eq('profile_id', profile.id);
        
    if (formTribes && Array.isArray(formTribes) && formTribes.length > 0) {
        const selectedTribeIds = tribes.filter(t => formTribes.includes(t.name)).map(t => t.id);
        const newProfileTribes = selectedTribeIds.map(tribeId => ({ profile_id: profile.id, tribe_id: tribeId }));
        
        await supabase.from('profile_tribes').insert(newProfileTribes);
    }
    
    toast.success(t('edit_profile.profile_saved', { defaultValue: 'Perfil salvo com sucesso!' }), { id: toastId });
    await fetchProfile(profile as any);
    setLoading(false);
    onClose();
  };

  if (!profile || !formData) return null;

  // Updated InputField to accept generic props like min, max, maxLength etc.
  const InputField = ({ label, name, type = "text", value, onChange, placeholder = "", ...rest }: any) => (
      <div className="space-y-1.5">
          <label htmlFor={name} className="block text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wide">{label}</label>
          <input 
              type={type} 
              name={name} 
              id={name} 
              value={value || ''} 
              onChange={onChange} 
              placeholder={placeholder}
              className="w-full bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm text-sm font-medium" 
              {...rest}
          />
      </div>
  );

  const SelectField = ({ label, name, value, onChange, options }: any) => (
      <div className="space-y-1.5">
          <label htmlFor={name} className="block text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wide">{label}</label>
          <div className="relative">
            <select 
                name={name} 
                id={name} 
                value={value || ''} 
                onChange={onChange} 
                className="w-full bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm text-sm font-medium"
            >
                {options.map((opt: string) => {
                    const translatedText = t(`constants.positions.${opt}`, {
                        defaultValue: t(`constants.hiv_statuses.${opt}`, {
                            defaultValue: t(`constants.options.${opt}`, { defaultValue: opt })
                        })
                    });
                    return (
                        <option key={opt} value={opt === 'Não informado' ? '' : opt} className="bg-slate-800">
                            {translatedText}
                        </option>
                    );
                })}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-rounded text-xl">expand_more</span>
          </div>
      </div>
  );

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-800/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl mx-auto animate-slide-in-up sm:animate-fade-in-up flex flex-col h-[92vh] sm:h-auto sm:max-h-[90vh] border border-white/10" onClick={(e) => e.stopPropagation()}>
        <header className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-primary-500 filled">edit_square</span>
              {t('edit_profile.title', { defaultValue: 'Editar Perfil' })}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
            <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Avatar Section */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => avatarInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary-500 to-secondary-600">
                      <img loading="lazy" src={profile.avatar_url} alt="Seu perfil" className="w-full h-full rounded-full object-cover border-4 border-slate-800" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-rounded text-white text-3xl">photo_camera</span>
                  </div>
                  <div className="absolute bottom-0 right-0 bg-slate-700 text-white p-1.5 rounded-full shadow-lg border border-slate-600">
                    <span className="material-symbols-rounded text-base block">edit</span>
                  </div>
                  <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
                </div>
                
                <div className="flex-1 w-full space-y-3">
                   <InputField label={t('edit_profile.username', { defaultValue: 'Nome de usuário' })} name="username" value={formData.username} onChange={handleChange} />
                   <InputField label={t('edit_profile.display_name', { defaultValue: 'Nome de Exibição (Perfil)' })} name="display_name" value={formData.display_name} onChange={handleChange} />
                   <div className="space-y-1.5">
                        <label htmlFor="status_text" className="block text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wide">Bio</label>
                        <textarea 
                            name="status_text" 
                            id="status_text" 
                            rows={2} 
                            value={formData.status_text || ''} 
                            onChange={handleChange} 
                            className="w-full bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none text-sm" 
                        />
                   </div>
                </div>
              </div>

              {/* Identity Section (Phase 1) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                  <div className="col-span-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                        <span className="material-symbols-rounded text-primary-500 filled">wc</span> {t('profile_modal.identity', { defaultValue: 'Identidade' })}
                    </h3>
                  </div>
                  <SelectField 
                      label={t('edit_profile.gender_identity', { defaultValue: 'Identidade de Gênero' })} 
                      name="gender_identity" 
                      value={formData.gender_identity} 
                      onChange={handleChange} 
                      options={['Não informado', 'Homem Cis', 'Mulher Cis', 'Homem Trans', 'Mulher Trans', 'Não-binário', 'Agênero', 'Outro']}
                  />
                  <SelectField 
                      label={t('edit_profile.pronouns', { defaultValue: 'Pronomes' })} 
                      name="pronouns" 
                      value={formData.pronouns} 
                      onChange={handleChange} 
                      options={['Não informado', 'Ele/Dele', 'Ela/Dela', 'Elu/Delu', 'Qualquer pronome']}
                  />
                  <SelectField 
                      label={t('edit_profile.sexual_orientation', { defaultValue: 'Orientação Sexual' })} 
                      name="sexual_orientation" 
                      value={formData.sexual_orientation} 
                      onChange={handleChange} 
                      options={['Não informado', 'Gay', 'Lésbica', 'Bissexual', 'Pansexual', 'Assexual', 'Queer', 'Heterossexual', 'Outro']}
                  />
                  <SelectField 
                      label={t('edit_profile.relationship_status', { defaultValue: 'Status de Relacionamento' })} 
                      name="relationship_status" 
                      value={formData.relationship_status} 
                      onChange={handleChange} 
                      options={['Não informado', 'Solteiro(a)', 'Casado(a)', 'Em um relacionamento', 'Relacionamento Aberto', 'Poliamor', 'Complicado']}
                  />
              </div>

              {/* Redes Sociais Section */}
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5 space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                      <span className="material-symbols-rounded text-primary-500 filled">share</span> {t('profile_modal.redes_sociais', { defaultValue: 'Redes Sociais' })}
                  </h3>
                  <p className="text-xs text-slate-500">{t('edit_profile.socials_desc', { defaultValue: 'Adicione seus perfis e links externos para que outros membros possam se conectar com você.' })}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField 
                          label="Instagram" 
                          name="instagram" 
                          value={formData.redes_sociais?.instagram || ''} 
                          onChange={handleSocialChange} 
                          placeholder="@seu_instagram" 
                      />
                      <InputField 
                          label="Twitter / X" 
                          name="twitter" 
                          value={formData.redes_sociais?.twitter || ''} 
                          onChange={handleSocialChange} 
                          placeholder="@seu_twitter" 
                      />
                      <InputField 
                          label="Telegram" 
                          name="telegram" 
                          value={formData.redes_sociais?.telegram || ''} 
                          onChange={handleSocialChange} 
                          placeholder="@seu_telegram" 
                      />
                      <InputField 
                          label="OnlyFans / Privacy" 
                          name="onlyfans" 
                          value={formData.redes_sociais?.onlyfans || ''} 
                          onChange={handleSocialChange} 
                          placeholder="Link OnlyFans ou Privacy" 
                      />
                  </div>
              </div>

              {/* Video Presentation Section */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                          <span className="material-symbols-rounded text-primary-500 filled">videocam</span> {t('edit_profile.video_presentation', { defaultValue: 'Vídeo de Apresentação' })}
                      </h3>
                      {profile.video_url && (
                          <button type="button" onClick={handleRemoveVideo} className="text-xs text-red-400 hover:text-red-300 font-bold">
                              {t('edit_profile.remove_video', { defaultValue: 'Remover Vídeo' })}
                          </button>
                      )}
                  </div>
                  
                  {profile.video_url ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black group">
                          <video src={profile.video_url} className="w-full h-full object-cover" controls />
                          <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-bold">
                              {t('edit_profile.active_video', { defaultValue: 'Video Ativo' })}
                          </div>
                      </div>
                  ) : (
                      <button type="button" onClick={() => videoInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white hover:border-primary-500 transition-all gap-2">
                          <span className="material-symbols-rounded text-4xl">upload_file</span>
                          <span className="text-sm font-bold">{t('edit_profile.upload_video_limit', { defaultValue: 'Carregar Vídeo (Max 15s)' })}</span>
                      </button>
                  )}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" />
              </div>

              {/* Logistics Switch */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.can_host ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                          <span className="material-symbols-rounded filled text-xl">home</span>
                      </div>
                      <div>
                          <span className="font-bold text-white block text-sm">{t('edit_profile.can_host', { defaultValue: 'Tenho Local (Hoster)' })}</span>
                          <span className="text-xs text-slate-400">{t('edit_profile.can_host_desc', { defaultValue: 'Pode receber visitas?' })}</span>
                      </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.can_host || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_host: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label={t('edit_profile.dob', { defaultValue: 'Data de Nascimento' })} name="date_of_birth" type="date" value={formData.date_of_birth?.split('T')[0]} onChange={handleChange} />
                <SelectField label={t('edit_profile.position', { defaultValue: 'Posição' })} name="position" value={formData.position} onChange={handleChange} options={[t('edit_profile.not_informed', { defaultValue: 'Não informado' }), ...POSITIONS]} />
                <InputField label={t('edit_profile.height', { defaultValue: 'Altura (cm)' })} name="height_cm" type="number" value={formData.height_cm} onChange={handleChange} min="50" max="250" />
                <InputField label={t('edit_profile.weight', { defaultValue: 'Peso (kg)' })} name="weight_kg" type="number" value={formData.weight_kg} onChange={handleChange} min="30" max="300" />
                <div className="col-span-2">
                    <SelectField label={t('edit_profile.hiv_status', { defaultValue: 'Status HIV' })} name="hiv_status" value={formData.hiv_status} onChange={handleChange} options={HIV_STATUSES} />
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2 tracking-wide ml-1">
                    <span className="material-symbols-rounded text-primary-500 filled text-base">photo_library</span> {t('edit_profile.public_photos', { defaultValue: 'Fotos Públicas' })}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {formData.public_photos?.map(photoUrl => (
                        <div key={photoUrl} className="relative group aspect-[3/4] rounded-xl overflow-hidden shadow-md border border-white/10">
                            <img loading="lazy" src={photoUrl} alt="Foto pública" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <button type="button" onClick={() => handleRemovePublicPhoto(photoUrl)} className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100">
                                <span className="material-symbols-rounded text-base block">close</span>
                            </button>
                        </div>
                    ))}
                     <button type="button" onClick={() => publicPhotoInputRef.current?.click()} className="flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-primary-500 hover:text-primary-500 transition-all group">
                        <div className="w-10 h-10 rounded-full bg-slate-700 group-hover:bg-primary-500/20 flex items-center justify-center mb-1 transition-colors">
                            <span className="material-symbols-rounded text-2xl">add</span>
                        </div>
                        <input type="file" accept="image/*" ref={publicPhotoInputRef} onChange={handlePublicPhotoUpload} className="hidden" />
                    </button>
                </div>
              </div>

              {/* Looking For Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2 tracking-wide ml-1">
                    <span className="material-symbols-rounded text-green-500 filled text-base">search</span> {t('edit_profile.looking_for', { defaultValue: 'O que estou buscando' })}
                </h3>
                <div className="flex flex-wrap gap-2 bg-slate-800/30 p-4 rounded-2xl border border-white/5 max-h-64 overflow-y-auto">
                  {LOOKING_FOR.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleLookingForToggle(item)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                        Array.isArray(formData.looking_for) && formData.looking_for.includes(item)
                          ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/30'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {t(`constants.looking_for.${item}`, { defaultValue: item })}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kinks Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2 tracking-wide ml-1">
                    <span className="material-symbols-rounded text-secondary-500 filled text-base">visibility</span> {t('edit_profile.visibility', { defaultValue: 'Visibilidade na Grade' })}
                </h3>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5 mb-6">
                    <select
                        value={formData.visibility || 'todos'}
                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    >
                        <option value="todos">{t('edit_profile.visibility_all', { defaultValue: 'Todos (Ver todos e ser visto por todos)' })}</option>
                        <option value="tribos">{t('edit_profile.visibility_tribes', { defaultValue: 'Apenas Minhas Tribos' })}</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">{t('edit_profile.visibility_desc', { defaultValue: 'Escolha quem você deseja ver e quem pode ver você. O padrão é "Todos".' })}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2 tracking-wide ml-1">
                    <span className="material-symbols-rounded text-secondary-500 filled text-base">interests</span> {t('edit_profile.kinks', { defaultValue: 'Preferências e Kinks' })}
                </h3>
                <div className="flex flex-wrap gap-2 bg-slate-800/30 p-4 rounded-2xl border border-white/5 max-h-64 overflow-y-auto">
                  {KINKS.map(kink => (
                    <button
                      key={kink}
                      type="button"
                      onClick={() => handleKinkToggle(kink)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                        Array.isArray(formData.kinks) && formData.kinks.includes(kink)
                          ? 'bg-secondary-600 border-secondary-500 text-white shadow-lg shadow-secondary-900/30'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {t(`constants.kinks.${kink}`, { defaultValue: kink })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2 tracking-wide ml-1">
                    <span className="material-symbols-rounded text-primary-500 filled text-base">groups</span> {t('edit_profile.my_tribes', { defaultValue: 'Minhas Tribos' })}
                </h3>
                <div className="flex flex-wrap gap-2 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                  {tribes.map(tribe => (
                    <button
                      key={tribe.id}
                      type="button"
                      onClick={() => handleTribeToggle(tribe.name)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                        Array.isArray(formData.tribes) && formData.tribes.includes(tribe.name)
                          ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/30'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {t(`constants.tribes.${tribe.name}`, { defaultValue: tribe.name })}
                    </button>
                  ))}
                </div>
              </div>
            </form>
        </main>

        <footer className="p-5 border-t border-white/10 bg-slate-800/50 rounded-b-3xl flex-shrink-0 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-6 py-3.5 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-sm">
            {t('common.cancel', { defaultValue: 'Cancelar' })}
          </button>
          <button 
            form="edit-profile-form" 
            type="submit" 
            disabled={loading} 
            className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:shadow-lg hover:shadow-primary-600/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            {loading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{t('common.saving', { defaultValue: 'Salvando...' })}</span>
                </>
            ) : (
                <span>{t('common.save_changes', { defaultValue: 'Salvar Alterações' })}</span>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  ) : null;
};

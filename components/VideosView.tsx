import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useVideoStore, VideoPost, VideoComment } from '../stores/videoStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { handleUserClick } from './postUtils';

export const VideosView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { setActiveView, setChatUser } = useUiStore();
    const { videos, comments, likedVideos, fetchVideos, fetchComments, addVideo, addComment, incrementViews, toggleLike, deleteVideo, editVideo } = useVideoStore();

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadStep, setUploadStep] = useState<number>(1);
    const [uploadCategory, setUploadCategory] = useState<string>('explicito');
    const [agreedLawDisclaimer, setAgreedLawDisclaimer] = useState<boolean>(false);
    const [agreedConsentDisclaimer, setAgreedConsentDisclaimer] = useState<boolean>(false);

    const openUploadModal = () => {
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
        setUploadCategory('explicito');
        setUploadStep(1);
        setAgreedLawDisclaimer(false);
        setAgreedConsentDisclaimer(false);
        setIsUploadOpen(true);
    };

    // Dynamic states for premium video filter and options
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'views' | 'rating'>('recent');
    const [globalNsfwBlur, setGlobalNsfwBlur] = useState<boolean>(() => {
        const saved = localStorage.getItem('globalNsfwBlur');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const toggleNsfwBlur = () => {
        const newValue = !globalNsfwBlur;
        setGlobalNsfwBlur(newValue);
        localStorage.setItem('globalNsfwBlur', JSON.stringify(newValue));
        if (newValue) {
            toast.success('Filtro de conteúdo explícito ativado (NSFW Blur)');
        } else {
            toast.success('Filtro desativado. Todo conteúdo visível.');
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadTitle.trim()) {
            toast.error('Por favor, informe o título do vídeo.');
            return;
        }
        if (!uploadFile) {
            toast.error('Por favor, selecione um arquivo de vídeo.');
            return;
        }

        const finalDescription = `${uploadDescription} #${uploadCategory}`;
        await addVideo(uploadTitle, finalDescription, uploadFile);
        setIsUploadOpen(false);
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
    };

    const categories = [
        { id: 'all', label: 'Todos 🔥', icon: '' },
        { id: 'explicito', label: 'Explícito 🌶️', icon: '' },
        { id: 'amador', label: 'Amador 🔞', icon: '' },
        { id: 'solo', label: 'Solo 👅', icon: '' },
        { id: 'casais', label: 'Casais 👥', icon: '' },
        { id: 'bdsm', label: 'BDSM ⛓️', icon: '' },
        { id: 'sensual', label: 'Sensual ✨', icon: '' },
        { id: 'favorites', label: 'Favoritos ♥', icon: '' },
    ];

    // Filter & Sort computation
    const filteredAndSortedVideos = React.useMemo(() => {
        let list = [...videos];

        // Filter by category
        if (selectedCategory !== 'all') {
            if (selectedCategory === 'favorites') {
                list = list.filter(v => likedVideos[v.id]);
            } else {
                const tag = `#${selectedCategory}`;
                list = list.filter(v => {
                    const titleText = (v.title || '').toLowerCase();
                    const descText = (v.description || '').toLowerCase();
                    return titleText.includes(tag) || descText.includes(tag) || titleText.includes(selectedCategory) || descText.includes(selectedCategory);
                });
            }
        }

        // Sort by
        if (sortBy === 'recent') {
            list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortBy === 'views') {
            list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        } else if (sortBy === 'rating') {
            list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        return list;
    }, [videos, selectedCategory, sortBy, likedVideos]);

    return (
        <div className="h-full w-full bg-dark-950 flex flex-col text-slate-100 overflow-hidden relative">
            {/* Custom Red Header with premium Adult branding */}
            <header className="bg-slate-900 border-b border-white/10 text-white h-16 px-4 flex items-center justify-between shadow-lg z-20 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setActiveView('home')} 
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                        title="Voltar"
                    >
                        <span className="material-symbols-rounded text-2xl text-slate-300">arrow_back</span>
                    </button>
                    <div className="flex flex-col text-left">
                        <h1 className="text-sm font-black tracking-wide bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-1.5 leading-none">
                            <span>VÍDEOS ADULTOS</span>
                            <span className="text-[9px] font-black bg-red-600 text-white px-1 py-0.5 rounded border border-red-500/20 shadow-sm leading-none">18+</span>
                        </h1>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Rede Social de Conteúdo Quente</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* NSFW Blur Shield Toggle */}
                    <button 
                        onClick={toggleNsfwBlur}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${globalNsfwBlur ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'}`}
                        title={globalNsfwBlur ? "Ocultar miniaturas (Blur Ativo)" : "Mostrar tudo sem blur"}
                    >
                        <span className="material-symbols-rounded text-lg">
                            {globalNsfwBlur ? 'visibility_off' : 'visibility'}
                        </span>
                    </button>

                    <button 
                        onClick={openUploadModal}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-pink-600 text-white hover:opacity-90 transition-all shadow-md shadow-red-900/40"
                        title="Enviar Vídeo"
                    >
                        <span className="material-symbols-rounded text-lg">add</span>
                    </button>
                    
                    {user && (
                        <img 
                            src={user.avatar_url} 
                            alt={user.username} 
                            className="w-8 h-8 rounded-full object-cover border border-white/10 cursor-pointer hover:border-red-500/50 transition-colors"
                            onClick={() => setActiveView('profile')}
                        />
                    )}
                </div>
            </header>

            {/* Quick Categories Bar & Sort Controls */}
            <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-4 py-2 flex flex-col gap-2 z-15 flex-shrink-0">
                {/* Horizontal scrolling Categories */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                                selectedCategory === cat.id
                                ? 'bg-red-600/10 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                                : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                            }`}
                        >
                            {cat.icon && <span className="material-symbols-rounded text-sm">{cat.icon}</span>}
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Filter and sorting options */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider px-1">
                    <span>{filteredAndSortedVideos.length} Vídeos Encontrados</span>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500">Ordenar por:</span>
                        <div className="flex gap-2">
                            {[
                                { id: 'recent', label: 'Recentes' },
                                { id: 'views', label: 'Populares' },
                                { id: 'rating', label: 'Avaliados' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSortBy(opt.id as any)}
                                    className={`transition-colors hover:text-white ${sortBy === opt.id ? 'text-red-400 underline underline-offset-4' : ''}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 no-scrollbar">
                {filteredAndSortedVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/20 rounded-3xl border border-white/5">
                        <span className="material-symbols-rounded text-5xl animate-pulse mb-3 text-red-500/40">videocam_off</span>
                        <p className="text-sm font-bold text-slate-400">Nenhum vídeo nesta categoria.</p>
                        <p className="text-xs text-slate-500 mt-1">Seja o primeiro a enviar um vídeo caliente!</p>
                        <button 
                            onClick={openUploadModal}
                            className="mt-4 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-xs font-bold text-slate-200 rounded-xl border border-white/5 transition-all"
                        >
                            Publicar Vídeo
                        </button>
                    </div>
                ) : (
                    filteredAndSortedVideos.map(video => (
                        <VideoCard 
                            key={video.id} 
                            video={video} 
                            comments={comments[video.id] || []}
                            isLiked={likedVideos[video.id] || false}
                            globalNsfwBlur={globalNsfwBlur}
                            onFetchComments={() => fetchComments(video.id)}
                            onAddComment={(text) => addComment(video.id, text)}
                            onIncrementViews={() => incrementViews(video.id)}
                            onLike={() => toggleLike(video.id)}
                            onChatClick={(userToChat) => setChatUser(userToChat)}
                            isOwner={user?.id === video.user_id}
                            onDeleteVideo={() => deleteVideo(video.id)}
                            onEditVideo={(title, desc) => editVideo(video.id, title, desc)}
                        />
                    ))
                )}
            </div>

            {/* Video Upload Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isUploadOpen && (
                        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[300] p-4">
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
                            >
                            <button 
                                onClick={() => setIsUploadOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 transition-colors"
                            >
                                <span className="material-symbols-rounded">close</span>
                            </button>
                            
                            <h2 className="text-lg font-black mb-5 flex items-center gap-2 text-white">
                                <span className="material-symbols-rounded text-red-500 animate-pulse">upload_file</span>
                                Enviar Vídeo Quente
                            </h2>

                            {/* Step Indicator */}
                            <div className="flex items-center justify-between mb-6 px-1">
                                {[
                                    { step: 1, label: "Info" },
                                    { step: 2, label: "Segurança" },
                                    { step: 3, label: "Mídia" }
                                ].map((item, idx) => (
                                    <React.Fragment key={item.step}>
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                                                uploadStep === item.step 
                                                    ? 'bg-gradient-to-tr from-red-600 to-pink-600 text-white shadow-lg shadow-red-900/40 scale-110' 
                                                    : uploadStep > item.step 
                                                        ? 'bg-green-600 text-white' 
                                                        : 'bg-slate-800 text-slate-500 border border-white/5'
                                            }`}>
                                                {uploadStep > item.step ? (
                                                    <span className="material-symbols-rounded text-sm">check</span>
                                                ) : item.step}
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 transition-colors ${
                                                uploadStep === item.step ? 'text-red-400 font-extrabold' : 'text-slate-500'
                                            }`}>{item.label}</span>
                                        </div>
                                        {idx < 2 && (
                                            <div className={`flex-1 h-0.5 mx-2 transition-all rounded-full ${
                                                uploadStep > item.step ? 'bg-green-600/50' : 'bg-slate-800'
                                            }`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            <form onSubmit={handleUploadSubmit} className="space-y-4">
                                {uploadStep === 1 && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Título do Vídeo <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                placeholder="Ex: Brincadeira quente de ontem..." 
                                                value={uploadTitle}
                                                onChange={(e) => setUploadTitle(e.target.value)}
                                                className="w-full bg-slate-850 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                                            />
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Categoria do Vídeo <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'explicito', label: '🌶️ Explícito' },
                                                    { id: 'amador', label: '🔞 Amador' },
                                                    { id: 'solo', label: '👅 Solo' },
                                                    { id: 'casais', label: '👥 Casais' },
                                                    { id: 'bdsm', label: '⛓️ BDSM' },
                                                    { id: 'sensual', label: '✨ Sensual' }
                                                ].map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => setUploadCategory(cat.id)}
                                                        className={`py-2 rounded-xl text-xs font-black transition-all border ${
                                                            uploadCategory === cat.id
                                                                ? 'bg-red-600/20 border-red-500/60 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                                                                : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Descrição (Opcional)</label>
                                            <textarea 
                                                placeholder="Adicione detalhes sobre o vídeo..." 
                                                value={uploadDescription}
                                                onChange={(e) => setUploadDescription(e.target.value)}
                                                className="w-full bg-slate-850 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[70px] text-sm resize-none"
                                            />
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clique para adicionar Tags Rápidas:</label>
                                            <div className="flex flex-wrap gap-1.5 py-1">
                                                {[
                                                    { tag: '#explicito', label: '🌶️ Explícito' },
                                                    { tag: '#amador', label: '🔞 Amador' },
                                                    { tag: '#solo', label: '👅 Solo' },
                                                    { tag: '#casais', label: '👥 Casais' },
                                                    { tag: '#bdsm', label: '⛓️ BDSM' },
                                                    { tag: '#sensual', label: '✨ Sensual' }
                                                ].map(item => (
                                                    <button
                                                        key={item.tag}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!uploadDescription.includes(item.tag)) {
                                                                setUploadDescription(prev => prev ? `${prev} ${item.tag}` : item.tag);
                                                            }
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-xl bg-slate-850 border border-white/5 hover:border-red-500/30 text-[10px] font-bold text-slate-300 hover:text-white transition-all active:scale-95 flex items-center gap-1"
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setIsUploadOpen(false)}
                                                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="button" 
                                                disabled={!uploadTitle.trim()}
                                                onClick={() => setUploadStep(2)}
                                                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-505 transition-all shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                            >
                                                Avançar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {uploadStep === 2 && (
                                    <div className="space-y-4 animate-fade-in text-slate-200">
                                        <div className="p-4 bg-red-550/10 border border-red-500/20 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase tracking-wide">
                                                <span className="material-symbols-rounded text-lg">warning</span>
                                                CONTEÚDO SEGURO & LEI
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                                Esta comunidade tem <strong>TOLERÂNCIA ZERO</strong> para conteúdos ilegais ou abusivos. É terminantemente proibido por lei:
                                            </p>
                                            <ul className="text-[11px] text-slate-300 space-y-1.5 pl-1 list-none font-semibold">
                                                <li className="flex items-start gap-1.5">
                                                    <span className="text-red-500 text-xs">✕</span> 
                                                    <span><strong>Pedofilia / Infantil</strong> ou representação de menores de 18 anos.</span>
                                                </li>
                                                <li className="flex items-start gap-1.5">
                                                    <span className="text-red-500 text-xs">✕</span> 
                                                    <span><strong>Zoofilia</strong>, bestialidade ou crueldade com animais.</span>
                                                </li>
                                                <li className="flex items-start gap-1.5">
                                                    <span className="text-red-500 text-xs">✕</span> 
                                                    <span><strong>Não-consensualidade</strong> (vazamentos de fotos/vídeos).</span>
                                                </li>
                                                <li className="flex items-start gap-1.5">
                                                    <span className="text-red-500 text-xs">✕</span> 
                                                    <span><strong>Violência extrema</strong>, mutilações ou necrofilia.</span>
                                                </li>
                                            </ul>
                                            <p className="text-[10px] text-red-400 font-bold leading-relaxed pt-1 border-t border-red-500/10">
                                                ⚠️ ATENÇÃO: Enviar conteúdo proibido é crime federal. Cooperamos ativamente com investigações policiais enviando endereço IP e dados.
                                            </p>
                                        </div>

                                        <div className="space-y-3 pt-1">
                                            <label className="flex items-start gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={agreedConsentDisclaimer}
                                                    onChange={(e) => setAgreedConsentDisclaimer(e.target.checked)}
                                                    className="mt-0.5 accent-red-600 rounded bg-slate-800 border-white/10 text-red-600"
                                                />
                                                <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                                                    Declaro que sou maior de idade (18+), e que todos os participantes deste vídeo deram seu consentimento explícito.
                                                </span>
                                            </label>

                                            <label className="flex items-start gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={agreedLawDisclaimer}
                                                    onChange={(e) => setAgreedLawDisclaimer(e.target.checked)}
                                                    className="mt-0.5 accent-red-600 rounded bg-slate-800 border-white/10 text-red-600"
                                                />
                                                <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                                                    Estou ciente de que publicar pedofilia, zoofilia ou não-consensual é crime e resultará em denúncia imediata com banimento.
                                                </span>
                                            </label>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setUploadStep(1)}
                                                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                Voltar
                                            </button>
                                            <button 
                                                type="button" 
                                                disabled={!agreedLawDisclaimer || !agreedConsentDisclaimer}
                                                onClick={() => setUploadStep(3)}
                                                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                            >
                                                Aceitar e Avançar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {uploadStep === 3 && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Arquivo de Vídeo <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept="video/mp4,video/quicktime,video/webm,video/*"
                                                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                                    className="w-full bg-slate-850 border border-white/10 rounded-xl px-4 py-3 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500 text-xs cursor-pointer focus:outline-none"
                                                />
                                            </div>
                                            {uploadFile && (
                                                <div className="p-3 bg-slate-800/40 border border-white/5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-300">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="material-symbols-rounded text-green-400 text-base">check_circle</span>
                                                        <span className="truncate">{uploadFile.name}</span>
                                                    </div>
                                                    <span className="text-slate-500 flex-shrink-0 ml-2">{(uploadFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setUploadStep(2)}
                                                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                Voltar
                                            </button>
                                            <button 
                                                type="submit" 
                                                disabled={!uploadFile}
                                                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white font-extrabold py-3 rounded-xl hover:opacity-95 transition-all shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
                                            >
                                                <span className="material-symbols-rounded text-base">rocket_launch</span>
                                                <span>Publicar Vídeo</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>,
            document.body
        )}
        </div>
    );
};

interface VideoCardProps {
    video: VideoPost;
    comments: VideoComment[];
    isLiked: boolean;
    globalNsfwBlur: boolean;
    onFetchComments: () => void;
    onAddComment: (text: string) => void;
    onIncrementViews: () => void;
    onLike: () => void;
    onChatClick: (user: any) => void;
    isOwner?: boolean;
    onDeleteVideo?: () => void;
    onEditVideo?: (title: string, desc: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video: initialVideo, comments: initialComments, isLiked: initialIsLiked, globalNsfwBlur, onFetchComments, onAddComment, onIncrementViews, onLike, onChatClick, isOwner, onDeleteVideo, onEditVideo }) => {
    // Get real-time state data
    const storeVideo = useVideoStore(state => state.videos.find(v => v.id === initialVideo.id));
    const video = storeVideo || initialVideo;
    const comments = useVideoStore(state => state.comments[initialVideo.id] || initialComments);
    const isLiked = useVideoStore(state => state.likedVideos[initialVideo.id] ?? initialIsLiked);
    const toggleCommentLike = useVideoStore(state => state.toggleCommentLike);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [hasIncrementedView, setHasIncrementedView] = useState(false);

    // Click to bypass NSFW blur shield
    const [isRevealed, setIsRevealed] = useState(false);

    // Interactive comments display
    const [showCommentsSection, setShowCommentsSection] = useState(false);
    const userRating = useVideoStore(state => state.userRatings[video.id]);
    const [starRating, setStarRating] = useState(userRating || 5);
    const [newCommentText, setNewCommentText] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(video.title);
    const [editDesc, setEditDesc] = useState(video.description || '');

    // Reset reveal status when global filter changes or video changes
    useEffect(() => {
        setIsRevealed(false);
    }, [globalNsfwBlur, video.id]);

    useEffect(() => {
        if (showCommentsSection) {
            onFetchComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showCommentsSection]);

    useEffect(() => {
        if (userRating) {
            setStarRating(userRating);
        }
    }, [userRating]);

    const handleVideoClick = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().catch(err => console.log('Autoplay blocked:', err));
            setIsPlaying(true);
            if (!hasIncrementedView) {
                onIncrementViews();
                setHasIncrementedView(true);
            }
        }
    };

    const handleStarClick = (rating: number) => {
        setStarRating(rating);
        useVideoStore.getState().addRating(video.id, rating);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddComment(newCommentText);
        setNewCommentText('');
    };

    const handleSaveEdit = () => {
        if (onEditVideo) {
            onEditVideo(editTitle, editDesc);
        }
        setIsEditing(false);
    };

    // Format human-friendly dates
    const formatDateLabel = (isoString: string) => {
        const date = new Date(isoString);
        const diffMs = Date.now() - date.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        return `Hace ${diffDays} días`;
    };

    return (
        <div className="bg-slate-900 rounded-3xl border border-white/5 overflow-hidden shadow-xl flex flex-col">
            {/* Video Player Box */}
            <div className="relative aspect-video w-full bg-black cursor-pointer group overflow-hidden" onClick={globalNsfwBlur && !isRevealed ? undefined : handleVideoClick}>
                <video 
                    ref={videoRef}
                    src={video.video_url} 
                    poster={video.thumbnail_url}
                    className={`w-full h-full object-cover transition-all duration-500 ${globalNsfwBlur && !isRevealed ? 'blur-2xl scale-105 saturate-50' : ''}`} 
                    loop 
                    muted={isMuted}
                    playsInline
                />
                
                {/* Blur Shield / NSFW Confirmation Overlay */}
                {globalNsfwBlur && !isRevealed && (
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsRevealed(true);
                            // Auto-play on reveal
                            setTimeout(() => {
                                if (videoRef.current) {
                                    videoRef.current.play().catch(err => console.log('Autoplay blocked:', err));
                                    setIsPlaying(true);
                                    if (!hasIncrementedView) {
                                        onIncrementViews();
                                        setHasIncrementedView(true);
                                    }
                                }
                            }, 50);
                        }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-4 z-10 transition-colors hover:bg-black/80"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg mb-2.5 animate-pulse">
                            <span className="material-symbols-rounded text-2xl">no_adult_content</span>
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider mb-0.5">CONTEÚDO ADULTO EXPLICÍTO</h4>
                        <p className="text-[10px] text-slate-400 text-center max-w-[260px] mb-3">Este vídeo pode conter nudez ou conteúdo explícito. Toque para assistir.</p>
                        <button className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-95 text-white text-[10px] font-black tracking-wider uppercase transition-all shadow-md shadow-red-900/30 active:scale-95">
                            Revelar (18+)
                        </button>
                    </div>
                )}

                {/* Custom Overlay Controls */}
                {(!globalNsfwBlur || isRevealed) && !isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <span className="material-symbols-rounded text-4xl filled pl-1">play_arrow</span>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-3 right-3 flex gap-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                        }}
                        className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"
                    >
                        <span className="material-symbols-rounded text-lg">
                            {isMuted ? 'volume_off' : 'volume_up'}
                        </span>
                    </button>
                    <div className="bg-black/60 px-2 py-1 rounded-md text-white text-[10px] font-bold backdrop-blur-sm flex items-center justify-center">
                        HD
                    </div>
                </div>

                {/* Edit and Delete Buttons for Owner */}
                {isOwner && (
                    <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                            }}
                            className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 backdrop-blur-sm transition-colors"
                            title="Editar"
                        >
                            <span className="material-symbols-rounded text-sm">edit</span>
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Excluir este vídeo? Esta ação não pode ser desfeita.')) {
                                    if (onDeleteVideo) onDeleteVideo();
                                }
                            }}
                            className="w-8 h-8 rounded-full bg-black/60 text-red-500 flex items-center justify-center hover:bg-black/80 backdrop-blur-sm transition-colors"
                            title="Deletar"
                        >
                            <span className="material-symbols-rounded text-sm">delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Title / Description */}
            <div className="p-4 flex-1 flex flex-col justify-between text-left border-b border-white/5">
                {isEditing ? (
                    <div className="space-y-2 mt-1">
                        <input 
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                            placeholder="Título do vídeo"
                        />
                        <textarea 
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 min-h-[80px]"
                            placeholder="Descrição"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors">Salvar</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-white line-clamp-1">{video.title}</h3>
                        </div>
                        {video.description && (
                            <p className="text-sm text-slate-300 mt-1 line-clamp-2">{video.description}</p>
                        )}
                        
                        {/* Interactive Star Rating Selector - Placed right under the video details */}
                        <div className="mt-3 p-2.5 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Avalie este vídeo:</span>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button 
                                            key={star}
                                            type="button"
                                            onClick={() => handleStarClick(star)}
                                            className="transition-transform hover:scale-120 cursor-pointer active:scale-90 focus:outline-none"
                                            title={`Avaliar com ${star} estrelas`}
                                        >
                                            <span className={`material-symbols-rounded text-lg ${star <= starRating ? 'text-yellow-400 filled' : 'text-slate-600'}`}>
                                                star
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Global dynamic average rating */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-900/60 px-2.5 py-1 rounded-xl border border-white/5">
                                <span className="material-symbols-rounded text-xs text-yellow-400 filled">star</span>
                                <span className="text-xs font-black text-slate-200">{video.rating ? video.rating.toFixed(1) : '5.0'}</span>
                                <span className="text-[10px] text-slate-400 font-bold">({video.ratings_count || 0} avaliações)</span>
                            </div>
                        </div>

                        {/* Video engagement counts */}
                        <div className="flex items-center gap-2 mt-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                            <span>{video.likes_count || 0} curtidas</span>
                            <span>•</span>
                            <span>{comments.length} comentários</span>
                            <span>•</span>
                            <span>{video.views_count || 0} visualizações</span>
                        </div>
                    </div>
                )}

                {/* Profile detail card below like the screenshot */}
                <div 
                    onClick={() => handleUserClick({ id: video.user_id, ...video.user_profile })}
                    className="bg-slate-950/40 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-950/60 transition-all mt-3 gap-3"
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative w-10 h-10 flex-shrink-0">
                            <img 
                                src={video.user_profile?.avatar_url} 
                                alt={video.user_profile?.username} 
                                className="w-full h-full rounded-full object-cover border border-white/10"
                            />
                            <div className="absolute bottom-0 right-0 bg-green-500 w-2.5 h-2.5 rounded-full border border-slate-950 flex items-center justify-center"></div>
                        </div>
                        
                        <div className="text-left min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-sm font-bold text-slate-100 min-w-0">
                                <span className="truncate hover:underline">{video.user_profile?.display_name || video.user_profile?.username}</span>
                                {video.user_profile?.subscription_tier === 'plus' && (
                                    <span className="material-symbols-rounded text-xs text-yellow-400 filled flex-shrink-0">auto_awesome</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-medium">
                                <span className="material-symbols-rounded text-xs text-slate-500 flex-shrink-0">location_on</span>
                                <span className="truncate">{video.user_profile?.location || 'Brasil'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Creator Support Tip Button */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                useUiStore.getState().setDonationModalOpen(true);
                                toast.success(`Apoie o criador ${video.user_profile?.display_name || video.user_profile?.username}!`);
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 active:bg-amber-500/20 border border-amber-500/10 transition-all active:scale-95"
                            title="Apoiar Criador"
                        >
                            <span className="material-symbols-rounded text-[18px] filled">volunteer_activism</span>
                        </button>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onLike();
                            }}
                            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all active:scale-95 ${
                                isLiked 
                                    ? 'bg-pink-500/15 text-pink-400 border-pink-500/20 hover:bg-pink-500/20' 
                                    : 'bg-slate-800/40 text-slate-400 border-white/5 hover:bg-slate-800/60 hover:text-white'
                            }`}
                            title="Curtir"
                        >
                            <span className={`material-symbols-rounded text-[18px] ${isLiked ? 'filled' : ''}`}>favorite</span>
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onChatClick({ id: video.user_id, username: video.user_profile?.username, avatar_url: video.user_profile?.avatar_url });
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/15 text-red-400 active:bg-red-500/20 border border-red-500/10 transition-all active:scale-95"
                            title="Chat"
                        >
                            <span className="material-symbols-rounded text-[18px] filled">chat_bubble</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments Header Bar */}
            <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between cursor-pointer border-b border-white/5" onClick={() => setShowCommentsSection(!showCommentsSection)}>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <span className="material-symbols-rounded text-lg">forum</span>
                    <span>{comments.length} comentários</span>
                </div>
                <span className="material-symbols-rounded text-slate-500 transition-transform">
                    {showCommentsSection ? 'expand_less' : 'expand_more'}
                </span>
            </div>

            {/* Expandable comments list */}
            {showCommentsSection && (
                <div className="bg-slate-950 p-4 space-y-4 animate-fade-in">
                    {/* Add comment box */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Escreva um comentário:</p>
                        
                        <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
                            <input 
                                type="text"
                                placeholder="Escreva um comentário..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                                required
                            />
                            <button 
                                type="submit"
                                className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-900/30 active:scale-95 flex-shrink-0"
                            >
                                <span className="material-symbols-rounded text-lg">send</span>
                            </button>
                        </form>
                    </div>

                    {/* Individual comments list */}
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                        {comments.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">Seja o primeiro a comentar.</p>
                        ) : (
                            comments.map((comment, index) => (
                                <div key={comment.id || index} className="flex gap-3 bg-slate-900/30 p-3 rounded-2xl border border-white/5">
                                    <img 
                                        src={comment.user_profile?.avatar_url} 
                                        alt={comment.user_profile?.username} 
                                        className="w-9 h-9 rounded-xl object-cover border border-white/5 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => handleUserClick({ id: comment.user_id, ...comment.user_profile })}
                                    />
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center justify-between">
                                            <div 
                                                className="flex items-center gap-1 text-xs font-bold text-slate-300 cursor-pointer hover:underline"
                                                onClick={() => handleUserClick({ id: comment.user_id, ...comment.user_profile })}
                                            >
                                                <span className="text-red-500">●</span>
                                                <span>{comment.user_profile?.username}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">, {comment.user_profile?.age || 22}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 mt-1">{comment.comment_text}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[9px] text-slate-500 font-medium">
                                                {formatDateLabel(comment.created_at)}
                                            </span>
                                            
                                            {/* Botão de Curtir Comentário */}
                                            <button 
                                                type="button"
                                                onClick={() => comment.id && toggleCommentLike(video.id, comment.id)}
                                                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-400 transition-colors cursor-pointer group active:scale-95"
                                                title={comment.liked_by_me ? 'Descurtir comentário' : 'Curtir comentário'}
                                            >
                                                <span className={`material-symbols-rounded text-xs ${comment.liked_by_me ? 'text-red-500 filled animate-pulse' : 'text-slate-500 group-hover:text-red-400'}`}>
                                                    favorite
                                                </span>
                                                <span className={comment.liked_by_me ? 'text-red-400' : 'text-slate-400'}>
                                                    {comment.likes_count || 0}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

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
    const [uploadIsPorn, setUploadIsPorn] = useState<boolean>(true);
    const [agreedLawDisclaimer, setAgreedLawDisclaimer] = useState<boolean>(false);
    const [agreedConsentDisclaimer, setAgreedConsentDisclaimer] = useState<boolean>(false);

    const openUploadModal = () => {
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
        setUploadCategory('explicito');
        setUploadIsPorn(true);
        setUploadStep(1);
        setAgreedLawDisclaimer(false);
        setAgreedConsentDisclaimer(false);
        setIsUploadOpen(true);
    };

    // Dynamic states for premium video filter and options
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'relevant' | 'recent' | 'views' | 'rating'>('relevant');
    const [globalNsfwBlur, setGlobalNsfwBlur] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('globalNsfwBlur');
            return saved !== null ? JSON.parse(saved) : true;
        } catch(e) {
            return true;
        }
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

        const finalDescription = `${uploadDescription} #${uploadCategory} ${uploadIsPorn ? '#nsfw' : '#sfw'}`;
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
        if (sortBy === 'relevant') {
            const now = Date.now();
            const getScore = (v: any) => {
                const daysOld = (now - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24);
                const recencyScore = Math.max(0, 30 - daysOld) / 30; // 0 to 1 (newer is better)
                const engagementScore = ((v.likes_count || 0) * 2 + (v.comments_count || 0)) / (v.views_count || 1);
                const ratingScore = (v.rating || 5) / 5; // 0 to 1
                return (ratingScore * 0.4) + (recencyScore * 0.3) + (Math.min(engagementScore, 1) * 0.3);
            };
            list.sort((a, b) => getScore(b) - getScore(a));
        } else if (sortBy === 'recent') {
            list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortBy === 'views') {
            list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        } else if (sortBy === 'rating') {
            list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        return list;
    }, [videos, selectedCategory, sortBy, likedVideos]);

    const [visibleCount, setVisibleCount] = useState(10);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 3) {
            setVisibleCount(prev => prev + 10);
        }
    };

    return (
        <div className="h-full w-full bg-black flex flex-col text-slate-100 overflow-hidden relative">
            {/* Floating Header */}
            <header className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-8 px-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button 
                        onClick={() => setActiveView('home')} 
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shadow-lg"
                        title="Voltar"
                    >
                        <span className="material-symbols-rounded text-2xl text-white drop-shadow-md">arrow_back</span>
                    </button>
                    <div className="flex flex-col text-left drop-shadow-md">
                        <h1 className="text-lg font-black tracking-wide text-white flex items-center gap-1.5 leading-none">
                            <span>VÍDEOS</span>
                            <span className="text-[9px] font-black bg-red-600 text-white px-1 py-0.5 rounded border border-red-500/20 shadow-sm leading-none">18+</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <button 
                        onClick={toggleNsfwBlur}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border shadow-lg ${globalNsfwBlur ? 'bg-red-500/80 border-red-400 text-white' : 'bg-black/50 border-white/20 text-white hover:bg-black/70'}`}
                        title={globalNsfwBlur ? "Ocultar miniaturas (Blur Ativo)" : "Mostrar tudo sem blur"}
                    >
                        <span className="material-symbols-rounded text-xl">
                            {globalNsfwBlur ? 'visibility_off' : 'visibility'}
                        </span>
                    </button>

                    <button 
                        onClick={openUploadModal}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-pink-600 text-white hover:opacity-90 transition-all shadow-lg"
                        title="Enviar Vídeo"
                    >
                        <span className="material-symbols-rounded text-xl">add</span>
                    </button>
                    
                    {user && (
                        <img 
                            src={user.avatar_url} 
                            alt={user.username} 
                            className="w-9 h-9 rounded-full object-cover border-2 border-white/80 cursor-pointer shadow-lg"
                            onClick={() => setActiveView('profile')}
                        />
                    )}
                </div>
            </header>

            {/* Quick Categories Bar (Floating) */}
            <div className="absolute top-20 left-0 right-0 z-20 px-4 pointer-events-none">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pointer-events-auto mask-fade-edges">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-lg backdrop-blur-sm ${
                                selectedCategory === cat.id
                                ? 'bg-white/20 border-white/40 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                                : 'bg-black/40 border-white/10 text-slate-200 hover:bg-black/60'
                            }`}
                        >
                            {cat.icon && <span className="material-symbols-rounded text-sm drop-shadow-md">{cat.icon}</span>}
                            <span className="drop-shadow-md">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main scrollable body (Snap Container) */}
            <div 
                className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black pb-0 relative z-0"
                onScroll={handleScroll}
            >
                {filteredAndSortedVideos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500">
                        <span className="material-symbols-rounded text-5xl animate-pulse mb-3 text-red-500/40">videocam_off</span>
                        <p className="text-sm font-bold text-slate-400">Nenhum vídeo nesta categoria.</p>
                        <button 
                            onClick={openUploadModal}
                            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-white/10 transition-all"
                        >
                            Publicar Vídeo
                        </button>
                    </div>
                ) : (
                    filteredAndSortedVideos.slice(0, visibleCount).map(video => (
                        <MemoizedVideoCard 
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
                                    { step: 1, label: "Mídia" },
                                    { step: 2, label: "Detalhes" },
                                    { step: 3, label: "Publicar" }
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
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Selecione seu Vídeo <span className="text-red-500">*</span></label>
                                            <div className="relative border-2 border-dashed border-white/10 hover:border-red-500/50 transition-colors rounded-2xl bg-slate-850 p-6 flex flex-col items-center justify-center min-h-[140px]">
                                                <input 
                                                    type="file" 
                                                    accept="video/mp4,video/quicktime,video/webm,video/*"
                                                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="w-12 h-12 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mb-3">
                                                    <span className="material-symbols-rounded text-2xl">upload</span>
                                                </div>
                                                <p className="text-xs text-white font-bold mb-1">Toque para escolher um vídeo</p>
                                                <p className="text-[10px] text-slate-500">MP4, WebM ou QuickTime (Max 100MB)</p>
                                            </div>
                                            {uploadFile && (
                                                <div className="p-3 mt-2 bg-slate-800/40 border border-white/5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-300">
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
                                                onClick={() => setIsUploadOpen(false)}
                                                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="button" 
                                                disabled={!uploadFile}
                                                onClick={() => setUploadStep(2)}
                                                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                                            >
                                                <span>Avançar</span>
                                                <span className="material-symbols-rounded text-[18px]">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {uploadStep === 2 && (
                                    <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto no-scrollbar pb-2 pr-1">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Título <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                placeholder="Descreva seu vídeo..." 
                                                value={uploadTitle}
                                                onChange={(e) => setUploadTitle(e.target.value)}
                                                className="w-full bg-slate-850 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Descrição e Tags</label>
                                            <textarea 
                                                placeholder="Adicione hashtags e detalhes..." 
                                                value={uploadDescription}
                                                onChange={(e) => setUploadDescription(e.target.value)}
                                                className="w-full bg-slate-850 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 min-h-[70px] text-sm resize-none"
                                            />
                                        </div>

                                        <div className="bg-slate-850 border border-white/5 p-4 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setUploadIsPorn(!uploadIsPorn)}>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                                    Conteúdo Pornô / NSFW <span className="text-red-500">*</span>
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">Marque se o vídeo contém nudez explícita.</span>
                                            </div>
                                            <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${uploadIsPorn ? 'bg-red-500' : 'bg-slate-700'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${uploadIsPorn ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 pt-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Categoria <span className="text-red-500">*</span></label>
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
                                                        className={`py-2 rounded-xl text-[11px] font-black transition-all border ${
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
                                                disabled={!uploadTitle.trim()}
                                                onClick={() => setUploadStep(3)}
                                                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                                            >
                                                <span>Avançar</span>
                                                <span className="material-symbols-rounded text-[18px]">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {uploadStep === 3 && (
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
                                                ⚠️ ATENÇÃO: Enviar conteúdo proibido é crime federal. Cooperamos ativamente com investigações policiais.
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
                                                onClick={() => setUploadStep(2)}
                                                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                Voltar
                                            </button>
                                            <button 
                                                type="submit" 
                                                disabled={!agreedLawDisclaimer || !agreedConsentDisclaimer}
                                                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white font-extrabold py-3 rounded-xl hover:opacity-95 transition-all shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
                                            >
                                                <span className="material-symbols-rounded text-base">rocket_launch</span>
                                                <span>Publicar</span>
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

const VideoCardComponent: React.FC<VideoCardProps> = ({ video: initialVideo, comments: initialComments, isLiked: initialIsLiked, globalNsfwBlur, onFetchComments, onAddComment, onIncrementViews, onLike, onChatClick, isOwner, onDeleteVideo, onEditVideo }) => {
    // Get real-time state data
    const storeVideo = useVideoStore(state => state.videos.find(v => v.id === initialVideo.id));
    const video = storeVideo || initialVideo;
    const comments = useVideoStore(state => state.comments[initialVideo.id] || initialComments);
    const isLiked = useVideoStore(state => state.likedVideos[initialVideo.id] ?? initialIsLiked);
    const toggleCommentLike = useVideoStore(state => state.toggleCommentLike);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const hasIncrementedViewRef = useRef(false);

    // Click to bypass NSFW blur shield
    const [isRevealed, setIsRevealed] = useState(false);

    // Interactive comments display
    const [showCommentsSection, setShowCommentsSection] = useState(false);
    const [showRatingMenu, setShowRatingMenu] = useState(false);
    const userRating = useVideoStore(state => state.userRatings[video.id]);
    const [starRating, setStarRating] = useState(userRating || 5);
    const [newCommentText, setNewCommentText] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(video.title);
    const [editDesc, setEditDesc] = useState(video.description || '');

    // Optimize DOM by only rendering video src when near viewport
    const [isInViewport, setIsInViewport] = useState(false);

    useEffect(() => {
        const visibilityObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];
            setIsInViewport(entry ? entry.isIntersecting : false);
        }, { rootMargin: '100% 0px' });
        
        if (containerRef.current) {
            visibilityObserver.observe(containerRef.current);
        }
        return () => visibilityObserver.disconnect();
    }, []);

    // Reset reveal status when global filter changes or video changes
    useEffect(() => {
        setIsRevealed(false);
        hasIncrementedViewRef.current = false;
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

    // Intersection Observer for autoplay
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.isIntersecting) {
                if (videoRef.current && (!globalNsfwBlur || isRevealed)) {
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                    }).catch(() => {});
                    if (!hasIncrementedViewRef.current) {
                        hasIncrementedViewRef.current = true;
                        onIncrementViews();
                    }
                }
            } else {
                if (videoRef.current) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                }
                setShowCommentsSection(false); // hide comments when scrolled away
            }
        }, { threshold: 0.3 });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [globalNsfwBlur, isRevealed, onIncrementViews]);

    const handleVideoClick = () => {
        if (!videoRef.current) return;
        if (!videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(err => console.log('Autoplay blocked:', err));
            if (!hasIncrementedViewRef.current) {
                hasIncrementedViewRef.current = true;
                onIncrementViews();
            }
        }
    };

    const handleStarClick = (rating: number) => {
        setStarRating(rating);
        useVideoStore.getState().addRating(video.id, rating);
        toast.success(`Você avaliou com ${rating} estrelas!`);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;
        onAddComment(newCommentText);
        setNewCommentText('');
    };

    const handleSaveEdit = () => {
        if (onEditVideo) {
            onEditVideo(editTitle, editDesc);
        }
        setIsEditing(false);
    };

    const formatDateLabel = (isoString: string) => {
        const date = new Date(isoString);
        const diffMs = Date.now() - date.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        return `Há ${diffDays} dias`;
    };

    return (
        <div ref={containerRef} className="w-full h-full snap-start snap-always relative bg-black flex justify-center items-center overflow-hidden z-0">
            <video 
                ref={videoRef}
                src={isInViewport ? video.video_url : undefined} 
                poster={video.thumbnail_url}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${globalNsfwBlur && !isRevealed ? 'blur-2xl scale-110 saturate-50' : ''}`} 
                loop 
                muted={isMuted}
                playsInline
                onClick={globalNsfwBlur && !isRevealed ? undefined : handleVideoClick}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
            />

            {/* NSFW Shield */}
            {globalNsfwBlur && !isRevealed && (
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsRevealed(true);
                        setTimeout(() => {
                            if (videoRef.current) {
                                videoRef.current.play().then(() => {
                                    setIsPlaying(true);
                                }).catch(err => console.log('Autoplay blocked:', err));
                                if (!hasIncrementedViewRef.current) {
                                    hasIncrementedViewRef.current = true;
                                    onIncrementViews();
                                }
                            }
                        }, 50);
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 z-10 transition-colors cursor-pointer"
                >
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 flex items-center justify-center shadow-lg mb-4 animate-pulse backdrop-blur-sm">
                        <span className="material-symbols-rounded text-3xl">no_adult_content</span>
                    </div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">CONTEÚDO ADULTO</h4>
                    <p className="text-xs text-slate-300 text-center max-w-[260px] mb-5 font-medium leading-relaxed">Este vídeo contém nudez ou conteúdo explícito.</p>
                    <button className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-black tracking-wider uppercase shadow-lg shadow-white/20 active:scale-95 transition-transform">
                        Toque para Revelar
                    </button>
                </div>
            )}

            {/* Play Button Overlay (when paused) */}
            {(!globalNsfwBlur || isRevealed) && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity z-10">
                    <div className="w-20 h-20 rounded-full bg-black/40 text-white/90 flex items-center justify-center backdrop-blur-md shadow-lg">
                        <span className="material-symbols-rounded text-5xl filled pl-2">play_arrow</span>
                    </div>
                </div>
            )}

            {/* Top Bar for Owner Edit/Delete */}
            {isOwner && (
                <div className="absolute top-24 right-4 flex flex-col gap-3 z-10">
                    <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-md shadow-lg border border-white/10 transition-transform active:scale-90">
                        <span className="material-symbols-rounded text-lg">edit</span>
                    </button>
                    <button onClick={() => { if(window.confirm('Excluir este vídeo?')) { if (onDeleteVideo) onDeleteVideo(); } }} className="w-10 h-10 rounded-full bg-black/40 text-red-500 flex items-center justify-center backdrop-blur-md shadow-lg border border-white/10 transition-transform active:scale-90">
                        <span className="material-symbols-rounded text-lg">delete</span>
                    </button>
                </div>
            )}

            {/* Edit Modal Overlay */}
            {isEditing && (
                <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-white/10 p-5 space-y-3">
                        <h3 className="text-white font-bold text-lg mb-2">Editar Vídeo</h3>
                        <input 
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                            placeholder="Título do vídeo"
                        />
                        <textarea 
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 min-h-[100px] resize-none"
                            placeholder="Descrição"
                        />
                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} className="px-6 py-2.5 text-xs font-bold text-black bg-white rounded-full hover:bg-slate-200 transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom-left Content (User, Description, Audio) */}
            <div className="absolute bottom-20 left-4 right-16 z-10 flex flex-col justify-end pointer-events-none drop-shadow-md">
                <div className="pointer-events-auto mb-2 inline-flex items-center gap-1.5 cursor-pointer" onClick={() => handleUserClick({ id: video.user_id, ...video.user_profile })}>
                    <h3 className="text-white font-extrabold text-base hover:underline line-clamp-1">{video.user_profile?.username}</h3>
                    {video.user_profile?.subscription_tier === 'plus' && <span className="material-symbols-rounded text-[14px] text-yellow-400 filled drop-shadow">auto_awesome</span>}
                </div>
                
                {/* Title */}
                <h4 className="text-white font-bold text-sm mb-1 pointer-events-auto leading-tight">{video.title}</h4>
                
                {/* Description */}
                {video.description && (
                    <div className="pointer-events-auto max-h-[60px] overflow-y-auto no-scrollbar mask-fade-edges-vertical">
                        <p className="text-slate-200 text-[13px] font-medium leading-snug pr-2">{video.description}</p>
                    </div>
                )}
                
                {/* Audio track info */}
                <div className="flex items-center gap-2 mt-3 text-white pointer-events-auto overflow-hidden">
                    <span className="material-symbols-rounded text-sm animate-pulse">music_note</span>
                    <div className="whitespace-nowrap overflow-hidden relative w-3/4">
                        <span className="text-xs font-semibold inline-block animate-marquee drop-shadow">
                            Som original - @{video.user_profile?.username} • {video.views_count || 0} visualizações
                        </span>
                    </div>
                </div>
            </div>

            {/* Right-side Actions */}
            <div className="absolute bottom-20 right-2 z-10 flex flex-col items-center justify-end gap-5 pb-2 pointer-events-auto">
                {/* Avatar Profile */}
                <div className="relative mb-3 cursor-pointer group" onClick={() => handleUserClick({ id: video.user_id, ...video.user_profile })}>
                    <div className="w-[46px] h-[46px] rounded-full border-[1.5px] border-white overflow-hidden bg-slate-800 shadow-lg group-active:scale-95 transition-transform">
                        <img src={video.user_profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black shadow-md shadow-red-900/50 group-hover:bg-red-500">
                        +
                    </div>
                </div>

                {/* Like */}
                <div className="flex flex-col items-center gap-1 group">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onLike(); }}
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform active:scale-75 group-hover:bg-white/10"
                    >
                        <span className={`material-symbols-rounded text-[38px] drop-shadow-md transition-colors ${isLiked ? 'text-red-500 filled' : 'text-white'}`}>favorite</span>
                    </button>
                    <span className="text-white text-[11px] font-semibold drop-shadow-md">{video.likes_count || 0}</span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center gap-1 group">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowCommentsSection(true); }}
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform active:scale-75 group-hover:bg-white/10 text-white"
                    >
                        <span className="material-symbols-rounded text-[34px] filled drop-shadow-md">chat_bubble</span>
                    </button>
                    <span className="text-white text-[11px] font-semibold drop-shadow-md">{comments.length}</span>
                </div>

                {/* Star Rating Modal trigger */}
                <div className="flex flex-col items-center gap-1 group relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowRatingMenu(!showRatingMenu); }}
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform active:scale-75 group-hover:bg-white/10 text-white"
                    >
                        <span className="material-symbols-rounded text-[36px] filled drop-shadow-md text-yellow-400">star</span>
                    </button>
                    <span className="text-white text-[11px] font-semibold drop-shadow-md">{video.rating ? video.rating.toFixed(1) : '5.0'}</span>

                    <AnimatePresence>
                        {showRatingMenu && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: -10 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute right-12 top-0 flex flex-row-reverse gap-2 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10"
                            >
                                {[5, 4, 3, 2, 1].map((star) => (
                                    <motion.button
                                        key={star}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); handleStarClick(star); setShowRatingMenu(false); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                                    >
                                        <span className={`material-symbols-rounded text-2xl drop-shadow-md ${starRating >= star ? 'filled text-yellow-400' : 'text-slate-400'}`}>star</span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Support/Donation */}
                <div className="flex flex-col items-center gap-1 group">
                    <button 
                        onClick={(e) => { e.stopPropagation(); useUiStore.getState().setDonationModalOpen(true); }}
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform active:scale-75 group-hover:bg-white/10 text-white"
                    >
                        <span className="material-symbols-rounded text-[34px] filled drop-shadow-md text-amber-500">volunteer_activism</span>
                    </button>
                    <span className="text-white text-[11px] font-semibold drop-shadow-md">Apoiar</span>
                </div>

                {/* Chat direct */}
                <div className="flex flex-col items-center gap-1 group">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onChatClick({ id: video.user_id, username: video.user_profile?.username, avatar_url: video.user_profile?.avatar_url }); }}
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform active:scale-75 group-hover:bg-white/10 text-white"
                    >
                        <span className="material-symbols-rounded text-[30px] drop-shadow-md">forum</span>
                    </button>
                    <span className="text-white text-[11px] font-semibold drop-shadow-md">Chat</span>
                </div>

                {/* Mute/Unmute */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-md mt-1 border border-white/10 active:scale-95"
                >
                    <span className="material-symbols-rounded text-sm">
                        {isMuted ? 'volume_off' : 'volume_up'}
                    </span>
                </button>
            </div>

            {/* Comments Bottom Sheet */}
            <AnimatePresence>
                {showCommentsSection && (
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute bottom-0 left-0 right-0 h-[65%] bg-slate-950/95 backdrop-blur-xl rounded-t-3xl z-40 flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.8)] border-t border-white/10"
                    >
                        {/* Drag handle */}
                        <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setShowCommentsSection(false)}>
                            <div className="w-10 h-1.5 bg-slate-600 rounded-full"></div>
                        </div>

                        <div className="px-4 pb-3 flex items-center justify-between border-b border-white/10 mt-1">
                            <h3 className="text-white font-bold text-sm text-center flex-1">{comments.length} comentários</h3>
                            <button onClick={() => setShowCommentsSection(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-rounded text-xl">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {comments.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-10">Nenhum comentário ainda. Seja o primeiro!</p>
                            ) : (
                                comments.map((comment, index) => (
                                    <div key={comment.id || index} className="flex gap-3">
                                        <img 
                                            src={comment.user_profile?.avatar_url} 
                                            alt={comment.user_profile?.username} 
                                            className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0 cursor-pointer"
                                            onClick={() => handleUserClick({ id: comment.user_id, ...comment.user_profile })}
                                        />
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span 
                                                    className="text-[13px] font-bold text-slate-300 cursor-pointer hover:underline"
                                                    onClick={() => handleUserClick({ id: comment.user_id, ...comment.user_profile })}
                                                >
                                                    {comment.user_profile?.username}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-medium"> • {formatDateLabel(comment.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-white leading-snug">{comment.comment_text}</p>
                                            <div className="flex items-center mt-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => comment.id && toggleCommentLike(video.id, comment.id)}
                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-red-400 transition-colors active:scale-95"
                                                >
                                                    <span className={`material-symbols-rounded text-[14px] ${comment.liked_by_me ? 'text-red-500 filled' : 'text-slate-500'}`}>
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

                        <div className="p-4 pb-[90px] bg-slate-950/80 border-t border-white/5 backdrop-blur-md">
                            <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center bg-slate-900 border border-white/10 rounded-full px-1.5 py-1.5 pl-4">
                                <input 
                                    type="text"
                                    placeholder="Adicione um comentário..."
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newCommentText.trim()}
                                    className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 transition-transform"
                                >
                                    <span className="material-symbols-rounded text-[18px]">arrow_upward</span>
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MemoizedVideoCard = React.memo(VideoCardComponent, (prev, next) => prev.video.id === next.video.id && prev.globalNsfwBlur === next.globalNsfwBlur && prev.isOwner === next.isOwner);

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVideoStore, VideoPost, VideoComment } from '../stores/videoStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export const VideosView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { setActiveView, setChatUser } = useUiStore();
    const { videos, comments, likedVideos, fetchVideos, fetchComments, addVideo, addComment, incrementViews, toggleLike, deleteVideo, editVideo } = useVideoStore();

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [activeVideoCommentId, setActiveVideoCommentId] = useState<number | null>(null);

    // Form states for comments
    const [commentText, setCommentText] = useState('');
    const [commentRating, setCommentRating] = useState(5);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

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

        await addVideo(uploadTitle, uploadDescription, uploadFile);
        setIsUploadOpen(false);
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
    };

    return (
        <div className="h-full w-full bg-dark-950 flex flex-col text-slate-100 overflow-hidden relative">
            {/* Custom Red Header like the screenshot */}
            <header className="bg-red-600 text-white h-16 px-4 flex items-center justify-between shadow-md z-20 flex-shrink-0">
                <button 
                    onClick={() => setActiveView('home')} 
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                >
                    <span className="material-symbols-rounded text-2xl">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold tracking-wide">{t('videos.title', { defaultValue: 'Vídeos' })}</h1>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsUploadOpen(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                        title="Upload Vídeo"
                    >
                        <span className="material-symbols-rounded text-2xl">add_circle</span>
                    </button>
                    {user && (
                        <img 
                            src={user.avatar_url} 
                            alt={user.username} 
                            className="w-9 h-9 rounded-full object-cover border border-white/20 cursor-pointer"
                            onClick={() => setActiveView('profile')}
                        />
                    )}
                </div>
            </header>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 no-scrollbar">
                {videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <span className="material-symbols-rounded text-5xl animate-pulse mb-3">videocam_off</span>
                        <p className="text-sm font-medium">Nenhum vídeo publicado ainda.</p>
                    </div>
                ) : (
                    videos.map(video => (
                        <VideoCard 
                            key={video.id} 
                            video={video} 
                            comments={comments[video.id] || []}
                            isLiked={likedVideos[video.id] || false}
                            onFetchComments={() => fetchComments(video.id)}
                            onAddComment={(text, rating) => addComment(video.id, text, rating)}
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
            <AnimatePresence>
                {isUploadOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
                        >
                            <button 
                                onClick={() => setIsUploadOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <span className="material-symbols-rounded">close</span>
                            </button>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-rounded text-red-500">upload_file</span>
                                Enviar Vídeo
                            </h2>
                            <form onSubmit={handleUploadSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase">Título do Vídeo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Brincadeira quente de ontem..." 
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase">Descrição (Opcional)</label>
                                    <textarea 
                                        placeholder="Adicione detalhes sobre o vídeo..." 
                                        value={uploadDescription}
                                        onChange={(e) => setUploadDescription(e.target.value)}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase">Arquivo de Vídeo</label>
                                    <input 
                                        type="file" 
                                        accept="video/mp4,video/x-m4v,video/*"
                                        onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500"
                                    />
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
                                        type="submit" 
                                        className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/30"
                                    >
                                        Publicar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface VideoCardProps {
    video: VideoPost;
    comments: VideoComment[];
    isLiked: boolean;
    onFetchComments: () => void;
    onAddComment: (text: string, rating: number) => void;
    onIncrementViews: () => void;
    onLike: () => void;
    onChatClick: (user: any) => void;
    isOwner?: boolean;
    onDeleteVideo?: () => void;
    onEditVideo?: (title: string, desc: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video: initialVideo, comments: initialComments, isLiked: initialIsLiked, onFetchComments, onAddComment, onIncrementViews, onLike, onChatClick, isOwner, onDeleteVideo, onEditVideo }) => {
    // Get real-time state data
    const storeVideo = useVideoStore(state => state.videos.find(v => v.id === initialVideo.id));
    const video = storeVideo || initialVideo;
    const comments = useVideoStore(state => state.comments[initialVideo.id] || initialComments);
    const isLiked = useVideoStore(state => state.likedVideos[initialVideo.id] ?? initialIsLiked);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [hasIncrementedView, setHasIncrementedView] = useState(false);

    // Interactive comments display
    const [showCommentsSection, setShowCommentsSection] = useState(false);
    const [starRating, setStarRating] = useState(5);
    const [newCommentText, setNewCommentText] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(video.title);
    const [editDesc, setEditDesc] = useState(video.description || '');

    useEffect(() => {
        if (showCommentsSection) {
            onFetchComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showCommentsSection]);

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
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddComment(newCommentText, starRating);
        setNewCommentText('');
        setStarRating(5);
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
            <div className="relative aspect-video w-full bg-black cursor-pointer group overflow-hidden" onClick={handleVideoClick}>
                <video 
                    ref={videoRef}
                    src={video.video_url} 
                    poster={video.thumbnail_url}
                    className="w-full h-full object-cover" 
                    loop 
                    muted={isMuted}
                    playsInline
                />
                
                {/* Custom Overlay Controls */}
                {!isPlaying && (
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
            </div>

            {/* Video Metadata Panel */}
            <div className="p-4 space-y-3.5 border-b border-white/5">
                {isEditing ? (
                    <div className="space-y-3">
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
                            <h2 className="text-lg font-bold text-white tracking-wide">{video.title}</h2>
                            {isOwner && (
                                <div className="flex gap-2 ml-4">
                                    <button onClick={() => setIsEditing(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Editar">
                                        <span className="material-symbols-rounded text-sm">edit</span>
                                    </button>
                                    <button onClick={onDeleteVideo} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
                                        <span className="material-symbols-rounded text-sm">delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        {(video as any).description && (
                            <p className="text-sm text-slate-300 mt-1 line-clamp-2">{(video as any).description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            {/* Star display */}
                        <div className="flex gap-0.5 text-yellow-400">
                            {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className="material-symbols-rounded text-sm filled">
                                    {star <= Math.round(video.rating) ? 'star' : 'star_border'}
                                </span>
                            ))}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                            {video.likes_count || 0} curtidas • {Math.max(comments.length, video.ratings_count || 0)} avaliações • {video.views_count || 0} vistas
                        </span>
                    </div>
                </div>
                )}

                {/* Profile detail card below like the screenshot */}
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0">
                            <img 
                                src={video.user_profile?.avatar_url} 
                                alt={video.user_profile?.username} 
                                className="w-full h-full rounded-2xl object-cover border border-white/10"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center"></div>
                        </div>
                        
                        <div className="text-left">
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-slate-400 text-sm">location_on</span>
                                <span className="text-xs text-slate-400 font-bold">{video.user_profile?.location || 'Brasil'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-black text-white mt-0.5">
                                <span className="text-green-400">●</span>
                                <span>{video.user_profile?.display_name || video.user_profile?.username}</span>
                                {video.user_profile?.subscription_tier === 'plus' && (
                                    <span className="material-symbols-rounded text-xs text-yellow-400 filled">auto_awesome</span>
                                )}
                            </div>
                            {/* Tags list like • Te la chupo • Tengo sitio */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {video.user_profile?.oral_preference && (
                                    <span>• {video.user_profile?.oral_preference}</span>
                                )}
                                {video.user_profile?.site_preference && (
                                    <span>• {video.user_profile?.site_preference}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onLike}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-md active:scale-95 ${isLiked ? 'bg-pink-600 text-white shadow-pink-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            title="Curtir"
                        >
                            <span className={`material-symbols-rounded text-xl ${isLiked ? 'filled' : ''}`}>favorite</span>
                        </button>
                        <button 
                            onClick={() => onChatClick({ id: video.user_id, username: video.user_profile?.username, avatar_url: video.user_profile?.avatar_url })}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition-colors text-white shadow-md shadow-red-900/20 active:scale-95"
                            title="Chat"
                        >
                            <span className="material-symbols-rounded text-xl filled">chat_bubble</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments Header Bar */}
            <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between cursor-pointer border-b border-white/5" onClick={() => setShowCommentsSection(!showCommentsSection)}>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <span className="material-symbols-rounded text-lg">forum</span>
                    <span>{Math.max(comments.length, video.ratings_count || 0)} comentarios</span>
                </div>
                <span className="material-symbols-rounded text-slate-500 transition-transform">
                    {showCommentsSection ? 'expand_less' : 'expand_more'}
                </span>
            </div>

            {/* Expandable comments list */}
            {showCommentsSection && (
                <div className="bg-slate-950 p-4 space-y-4 animate-fade-in">
                    {/* Interactive review addition */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Toca para evaluar:</p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button 
                                    key={star}
                                    type="button"
                                    onClick={() => handleStarClick(star)}
                                    className="text-2xl transition-transform hover:scale-110"
                                >
                                    <span className={`material-symbols-rounded ${star <= starRating ? 'text-yellow-400 filled' : 'text-slate-600'}`}>
                                        star
                                    </span>
                                </button>
                            ))}
                        </div>
                        
                        <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
                            <input 
                                type="text"
                                placeholder="Su comentario (opcional)..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                            />
                            <button 
                                type="submit"
                                className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-900/30 active:scale-95 flex-shrink-0"
                            >
                                <span className="material-symbols-rounded text-lg">check</span>
                            </button>
                        </form>
                    </div>

                    {/* Individual comments list */}
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                        {comments.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">Escribe la primera evaluación.</p>
                        ) : (
                            comments.map((comment, index) => (
                                <div key={comment.id || index} className="flex gap-3 bg-slate-900/30 p-3 rounded-2xl border border-white/5">
                                    <img 
                                        src={comment.user_profile?.avatar_url} 
                                        alt={comment.user_profile?.username} 
                                        className="w-9 h-9 rounded-xl object-cover border border-white/5 flex-shrink-0"
                                    />
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-300">
                                                <span className="text-yellow-500">●</span>
                                                <span>{comment.user_profile?.username}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">, {comment.user_profile?.age || 22}</span>
                                            </div>
                                            {/* comment stars */}
                                            <div className="flex text-yellow-400 scale-75 transform origin-right">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <span key={star} className="material-symbols-rounded !text-[12px] filled">
                                                        {star <= comment.rating ? 'star' : 'star_border'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 mt-1">{comment.comment_text || 'Delícia!'}</p>
                                        <span className="text-[9px] text-slate-500 font-medium block mt-1">
                                            {formatDateLabel(comment.created_at)}
                                        </span>
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

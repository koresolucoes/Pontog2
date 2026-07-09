
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgoraStore } from '../stores/agoraStore';
import { useAuthStore } from '../stores/authStore';
import { AgoraPost } from '../types';
import { ActivateAgoraModal } from './ActivateAgoraModal';
import { AgoraPostDetailModal } from './AgoraPostDetailModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useTranslation } from 'react-i18next';
import { handleUserClick } from './postUtils';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const AgoraView: React.FC = () => {
    const { t } = useTranslation();
    const { posts, isLoading, agoraUserIds, deactivateAgoraMode, toggleLikePost, loadMorePosts, hasMore, fetchAgoraPosts } = useAgoraStore();
    const user = useAuthStore(state => state.user);
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<AgoraPost | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        fetchAgoraPosts(true);
    }, [fetchAgoraPosts]);

    const lastPostElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMorePosts();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, loadMorePosts]);

    const userIsAgora = user ? agoraUserIds.includes(user.id) : false;

    const handleDeactivateClick = () => setIsConfirmModalOpen(true);
    const handleConfirmDeactivate = async () => {
        await deactivateAgoraMode();
        setIsConfirmModalOpen(false);
    };

    const renderHeader = () => (
        // Header with pl-16 safe zone for hamburger menu
        <div className="px-5 py-4 bg-gradient-to-b from-primary-900/40 to-transparent backdrop-blur-md sticky top-0 z-20 border-b border-white/5 pl-16">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-2 text-white font-outfit tracking-tight">
                        <span className="material-symbols-rounded filled text-3xl text-primary-500 animate-pulse-fire drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">local_fire_department</span>
                        <span>{t('agora.title', { defaultValue: 'Agora' })}</span>
                    </h1>
                    <p className="text-xs text-primary-200/70 font-medium tracking-wide mt-0.5">{t('agora.subtitle', { defaultValue: 'QUEM ESTÁ BUSCANDO JÁ' })}</p>
                </div>
                
                {userIsAgora ? (
                    <button 
                        onClick={handleDeactivateClick} 
                        className="bg-slate-800/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-300 py-2 px-4 rounded-full hover:bg-slate-700 transition-all shadow-lg"
                    >
                        {t('agora.deactivate', { defaultValue: 'Desativar' })}
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsActivateModalOpen(true)} 
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 text-xs font-bold text-white py-2.5 px-5 rounded-full hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg"
                    >
                        <span className="material-symbols-rounded text-base">add_circle</span>
                        {t('agora.activate', { defaultValue: 'Ativar Modo' })}
                    </button>
                )}
            </div>
        </div>
    );
    
    if (isLoading && posts.length === 0) {
        return (
            <div className="h-full flex flex-col bg-dark-900">
                {renderHeader()}
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <div className="w-12 h-12 border-4 border-primary-600/30 border-t-primary-500 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium animate-pulse">{t('agora.warming_up', { defaultValue: 'Aquecendo...' })}</p>
                </div>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <>
                <div className="h-full flex flex-col bg-dark-900 relative overflow-hidden">
                    {renderHeader()}
                    
                    {/* Background com efeito de "brasas" sutil */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-600/10 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-600/5 rounded-full blur-[120px]"></div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
                        <div className="w-24 h-24 bg-gradient-to-br from-dark-800 to-dark-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-white/5 relative group cursor-pointer" onClick={() => setIsActivateModalOpen(true)}>
                            <div className="absolute inset-0 rounded-full border-2 border-primary-500/30 animate-ping opacity-20"></div>
                            <span className="material-symbols-rounded filled text-5xl text-primary-500 group-hover:scale-110 transition-transform duration-300">local_fire_department</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight font-outfit">{t('agora.empty_title', { defaultValue: 'Está tudo frio por aqui.' })}</h2>
                        <p className="mt-3 text-slate-400 max-w-xs leading-relaxed">
                            {t('agora.empty_desc', { defaultValue: 'Seja o primeiro a acender a chama! Publique uma foto e apareça no topo por 1 hora.' })}
                        </p>
                        <button 
                            onClick={() => setIsActivateModalOpen(true)}
                            className="mt-8 bg-white text-primary-600 font-bold py-3.5 px-8 rounded-xl hover:bg-slate-100 transition-all shadow-xl hover:shadow-primary-900/20 transform active:scale-95 flex items-center gap-2"
                        >
                            {t('agora.start_now', { defaultValue: 'Começar Agora' })}
                        </button>
                    </div>
                </div>
                {isActivateModalOpen && <ActivateAgoraModal onClose={() => setIsActivateModalOpen(false)} />}
            </>
        );
    }
    
    return (
        <>
            <div className="h-full flex flex-col bg-dark-900">
                {renderHeader()}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="flex-1 overflow-y-auto p-4 pb-24 space-y-6"
                >
                    <AnimatePresence mode="popLayout">
                        {posts.map((post, index) => (
                            <motion.div 
                                variants={itemVariants}
                                layout
                                key={post.id} 
                                ref={index === posts.length - 1 ? lastPostElementRef : null}
                                className="group relative bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-white/5"
                            >
                                
                                {/* Header do Card */}
                                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                                    <div 
                                        className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUserClick({ id: post.user_id, username: post.username, avatar_url: post.avatar_url });
                                        }}
                                    >
                                        <div className="relative">
                                            <img loading="lazy" src={post.avatar_url} alt={post.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-500/50" />
                                            <div className="absolute -bottom-1 -right-1 bg-primary-600 rounded-full p-0.5 border border-black">
                                                <span className="material-symbols-rounded filled text-[10px] text-white block">local_fire_department</span>
                                            </div>
                                        </div>
                                        <div className="drop-shadow-md">
                                            <h3 className="font-bold text-white text-sm leading-none flex items-center gap-2">
                                                <span>{post.username}, {post.age}</span>
                                                {post.status_text?.includes('📍') && (
                                                    <span className="flex items-center gap-0.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow border border-white/10 animate-pulse">
                                                        <span className="material-symbols-rounded text-[10px] filled">location_on</span>
                                                        <span>Check-in</span>
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-[10px] text-primary-300 font-bold uppercase tracking-wider mt-0.5">{t('agora.online_now', { defaultValue: 'Online Agora' })}</p>
                                        </div>
                                    </div>
                                </div>
    
                                {/* Imagem Principal Full Bleed */}
                                <div 
                                    className="relative w-full aspect-[4/5] cursor-pointer overflow-hidden"
                                    onClick={() => setSelectedPost(post)}
                                >
                                    <motion.img 
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ duration: 0.6 }}
                                        src={post.photo_url} 
                                        alt={`Post de ${post.username}`}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover"
                                    />
                                    
                                    {/* Big Check-In Badge on Image */}
                                    {post.status_text?.includes('📍') && (
                                        <div className="absolute top-4 right-4 bg-primary-600/95 backdrop-blur-md text-white font-extrabold text-[10px] tracking-wider uppercase py-1.5 px-3 rounded-full flex items-center gap-1 shadow-lg z-10 border border-white/20 animate-pulse">
                                            <span className="material-symbols-rounded filled text-xs">location_on</span>
                                            <span>CHECK-IN</span>
                                        </div>
                                    )}
                                    
                                    {/* Status Text Overlay */}
                                    {post.status_text && (
                                        <div className="absolute bottom-0 left-0 right-0 p-5 pt-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                            <p className="text-white text-lg font-medium leading-snug drop-shadow-lg flex items-center gap-1.5">
                                                {post.status_text.includes('📍') && (
                                                    <span className="material-symbols-rounded text-primary-500 filled text-xl animate-bounce">location_on</span>
                                                )}
                                                <span>"{post.status_text}"</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
    
                                {/* Actions Bar */}
                                <div className="p-3 bg-slate-900/50 backdrop-blur-md border-t border-white/5 flex items-center justify-between">
                                    <div className="flex gap-4">
                                        <motion.button 
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => toggleLikePost(post.id)} 
                                            className={`flex items-center gap-1.5 transition-colors ${post.user_has_liked ? 'text-primary-500' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            <span className={`material-symbols-rounded text-2xl ${post.user_has_liked ? 'filled' : ''}`}>favorite</span>
                                            <span className="text-xs font-bold">{post.likes_count}</span>
                                        </motion.button>
                                        <motion.button 
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => setSelectedPost(post)} 
                                            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-2xl">chat_bubble</span>
                                            <span className="text-xs font-bold">{post.comments_count}</span>
                                        </motion.button>
                                    </div>
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-white text-black text-xs font-black py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-wide flex items-center gap-1"
                                    >
                                        {t('agora.call', { defaultValue: 'Chamar' })}
                                        <span className="material-symbols-rounded filled text-sm text-primary-600">favorite</span>
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {isLoading && posts.length > 0 && (
                        <div className="flex justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                        </div>
                    )}
                    
                    {!hasMore && posts.length > 0 && (
                        <div className="text-center py-6 text-slate-500 text-sm font-medium">
                            {t('agora.no_more_fire', { defaultValue: 'Não há mais fogo na fogueira.' })}
                        </div>
                    )}
                </motion.div>
            </div>
            {isActivateModalOpen && <ActivateAgoraModal onClose={() => setIsActivateModalOpen(false)} />}
            {selectedPost && <AgoraPostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
            {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    title={t('agora.extinguish_fire', { defaultValue: 'Apagar Fogo?' })}
                    message={t('agora.extinguish_msg', { defaultValue: 'Ao desativar, seu post será removido e você sairá do modo Agora.' })}
                    onConfirm={handleConfirmDeactivate}
                    onCancel={() => setIsConfirmModalOpen(false)}
                    confirmText={t('agora.deactivate', { defaultValue: 'Desativar' })}
                />
            )}
        </>
    );
};

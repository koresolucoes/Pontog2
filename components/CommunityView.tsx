import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCommunityStore } from '../stores/communityStore';
import { useAuthStore } from '../stores/authStore';
import { Community, CommunityPost } from '../types';
import { toast } from 'react-hot-toast';
import { CommunityPostDetailModal } from './CommunityPostDetailModal';
import { supabase } from '../lib/supabase';


const renderContent = (content: string) => {
    if (!content) return null;
    return content.split(/(#[a-zA-Z0-9_À-ÿ]+)/g).map((part, i) => 
        part.startsWith('#') 
            ? <span key={i} className="text-primary-400 font-medium hover:underline cursor-pointer">{part}</span> 
            : part
    );
};

export const CommunityView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { communities, myCommunities, fetchCommunities, fetchMyCommunities, joinCommunity, leaveCommunity, createCommunity, loading } = useCommunityStore();
    
    const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

    useEffect(() => {
        fetchCommunities();
        fetchMyCommunities();
    }, [fetchCommunities, fetchMyCommunities]);

    const isMember = (communityId: string) => {
        return myCommunities.some(c => c.id === communityId);
    };

    const handleJoinLeave = async (e: React.MouseEvent, communityId: string) => {
        e.stopPropagation();
        if (isMember(communityId)) {
            await leaveCommunity(communityId);
            toast.success('Você saiu da comunidade.');
        } else {
            await joinCommunity(communityId);
            toast.success('Você entrou na comunidade!');
        }
    };

    const displayCommunities = activeTab === 'all' ? communities : myCommunities;

    return (
        <div className="h-full flex flex-col bg-dark-900 text-slate-50 relative">
            <header className="sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 pb-2">
                <div className="pt-16 px-6 pb-2">
                    <h1 className="text-3xl font-outfit font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                        Comunidades
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Conecte-se com pessoas com os mesmos interesses</p>
                </div>

                <div className="flex gap-4 px-6 mt-4">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'all' 
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                        Descobrir
                    </button>
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'my' 
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                        Minhas Comunidades
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                {loading && communities.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayCommunities.map((community) => (
                            <motion.div
                                key={community.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedCommunity(community)}
                                className="bg-slate-800/50 rounded-2xl p-4 border border-white/5 cursor-pointer flex flex-col gap-3"
                            >
                                <div className="flex gap-4">
                                                                        <div className="w-16 h-16 rounded-xl bg-slate-700 overflow-hidden flex-shrink-0 relative">
                                        {community.cover_image_url ? (
                                            <img src={community.cover_image_url} alt={community.name} className="w-full h-full object-cover opacity-50" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500 material-symbols-rounded">groups</div>
                                        )}
                                        {community.avatar_url && (
                                            <img src={community.avatar_url} alt={community.name} className="absolute inset-2 w-12 h-12 object-cover rounded-lg border-2 border-dark-900 shadow-md" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white">{community.name}</h3>
                                        <p className="text-sm text-slate-400 line-clamp-2 mt-1">{community.description}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex flex-wrap gap-2">
                                        {community.tags?.slice(0,2).map(tag => (
                                            <span key={tag} className="text-[10px] uppercase tracking-wider font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={(e) => handleJoinLeave(e, community.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                            isMember(community.id) ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-primary-500 text-white hover:bg-primary-600'
                                        }`}
                                    >
                                        {isMember(community.id) ? 'Membro' : 'Entrar'}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                        {!loading && displayCommunities.length === 0 && (
                            <div className="col-span-full text-center text-slate-400 py-10">
                                Nenhuma comunidade encontrada.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="absolute bottom-24 right-6 w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-primary-500/50 z-30 hover:scale-105 transition-transform"
            >
                <span className="material-symbols-rounded">add</span>
            </button>

            <AnimatePresence>
                {selectedCommunity && (
                    <CommunityDetailModal 
                        community={selectedCommunity} 
                        onClose={() => setSelectedCommunity(null)} 
                        isMember={isMember(selectedCommunity.id)}
                        onJoinLeave={() => {
                            if (isMember(selectedCommunity.id)) {
                                leaveCommunity(selectedCommunity.id);
                                toast.success('Você saiu da comunidade.');
                            } else {
                                joinCommunity(selectedCommunity.id);
                                toast.success('Você entrou na comunidade!');
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCreateModalOpen && (
                    <CreateCommunityModal onClose={() => setIsCreateModalOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

// Modal: Community Details & Posts
const CommunityDetailModal: React.FC<{ community: Community, onClose: () => void, isMember: boolean, onJoinLeave: () => void }> = ({ community, onClose, isMember, onJoinLeave }) => {
    const { currentCommunityPosts, fetchCommunityPosts, createPost, loading } = useCommunityStore();
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
    const [myRole, setMyRole] = useState<string | null>(null);
    const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
    const [isEditCommunityOpen, setIsEditCommunityOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    const [initialPostMedia, setInitialPostMedia] = useState<File | null>(null);

    useEffect(() => {
        fetchCommunityPosts(community.id);
        useCommunityStore.getState().fetchMyRole(community.id).then(r => setMyRole(r));
    }, [community.id, fetchCommunityPosts]);

    return (
        <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-dark-900 flex flex-col"
        >
                        <div className="relative h-48 bg-slate-800 flex-shrink-0">
                {community.cover_image_url ? (
                    <img src={community.cover_image_url} alt={community.name} className="w-full h-full object-cover opacity-60" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/50 to-dark-900"> 
                        <span className="material-symbols-rounded text-6xl text-primary-500/50">groups</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent"></div>
                <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-md z-10">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4 transform translate-y-4">
                    <div className="w-24 h-24 rounded-2xl bg-slate-700 overflow-hidden border-4 border-dark-900 shadow-xl flex-shrink-0 relative z-10">
                        {community.avatar_url ? (
                            <img src={community.avatar_url} alt={community.name} className="w-full h-full object-cover bg-slate-800" />
                        ) : (
                            <span className="material-symbols-rounded w-full h-full flex items-center justify-center text-4xl text-slate-500 bg-slate-800">groups</span>
                        )}
                    </div>
                    <div className="flex-1 pb-4">
                        <h2 className="text-2xl font-bold text-white font-outfit">{community.name}</h2>
                        <p className="text-slate-300 text-sm mt-1 line-clamp-2">{community.description}</p>
                    </div>
                    <button 
                        onClick={onJoinLeave}
                        className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg mb-4 ${
                            isMember ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' : 'bg-white text-black hover:bg-slate-200'
                        }`}
                    >
                        {isMember ? 'Sair' : 'Participar'}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-dark-900 pb-24 pt-6">
                {/* Compose Post Trigger */}
                {isMember ? (
                    <div className="flex gap-3 p-4 border-b border-white/10 hover:bg-slate-800/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
                           <span className="material-symbols-rounded w-full h-full flex items-center justify-center text-slate-500">person</span>
                        </div>
                        <div className="flex-1">
                            <div 
                                onClick={() => {
                                    setInitialPostMedia(null);
                                    setIsCreatePostOpen(true);
                                }}
                                className="w-full bg-transparent text-slate-400 text-base border-none focus:ring-0 resize-none outline-none cursor-text pb-2"
                            >
                                O que está acontecendo?
                            </div>
                            <div className="flex gap-4 mt-2 items-center">
                                <label className="cursor-pointer flex items-center hover:bg-white/10 p-1 rounded-full">
                                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setInitialPostMedia(file);
                                        }
                                        setIsCreatePostOpen(true);
                                    }} />
                                    <span className="material-symbols-rounded text-primary-500 text-xl">image</span>
                                </label>
                                <button onClick={() => { setInitialPostMedia(null); setIsCreatePostOpen(true); }} className="flex items-center hover:bg-white/10 p-1 rounded-full"><span className="material-symbols-rounded text-primary-500 text-xl">gif_box</span></button>
                                <button onClick={() => { setInitialPostMedia(null); setIsCreatePostOpen(true); }} className="flex items-center hover:bg-white/10 p-1 rounded-full"><span className="material-symbols-rounded text-primary-500 text-xl">sentiment_satisfied</span></button>
                                <button onClick={() => { setInitialPostMedia(null); setIsCreatePostOpen(true); }} className="flex items-center hover:bg-white/10 p-1 rounded-full"><span className="material-symbols-rounded text-primary-500 text-xl">location_on</span></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-primary-500/10 text-primary-400 p-4 text-center text-sm border-b border-primary-500/20">
                        Participe da comunidade para interagir e postar.
                    </div>
                )}

                {/* Trending section */}
                <div className="p-4 border-b border-white/10">
                    <h3 className="font-bold text-white text-lg mb-3">Assuntos do momento</h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {['#Orgulho', 'Festas SP', 'Dicas Culturais', '#Diversidade', 'Encontros'].map((trend, i) => (
                            <div key={i} className="flex-shrink-0 bg-slate-800/50 border border-white/5 rounded-xl p-3 min-w-[120px]">
                                <p className="text-xs text-slate-400 mb-1">Trending</p>
                                <p className="font-bold text-white text-sm">{trend}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feed */}
                <div className="flex flex-col">
                    {loading ? (
                        <div className="text-center text-slate-400 py-10">Carregando postagens...</div>
                    ) : currentCommunityPosts.length > 0 ? (
                        currentCommunityPosts.map(post => (
                            <div key={post.id} className="p-4 border-b border-white/5 hover:bg-slate-800/20 transition-colors flex gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                    {post.author?.avatar_url ? (
                                        <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-rounded w-full h-full flex items-center justify-center text-slate-500">person</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-wrap items-baseline gap-1.5 mb-1">
                                            <span className="font-bold text-white text-base truncate">{post.author?.display_name || post.author?.username || 'Usuário'}</span>
                                            <span className="text-slate-500 text-sm truncate">@{post.author?.username || 'user'}</span>
                                            <span className="text-slate-500 text-sm">·</span>
                                            <span className="text-slate-500 text-sm hover:underline cursor-pointer">{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
                                        </div>
                                        <button 
                                            onClick={() => toast('Denúncia enviada.')} 
                                            className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                                            title="Denunciar"
                                        >
                                            <span className="material-symbols-rounded text-lg">more_horiz</span>
                                        </button>
                                    </div>
                                                                        <p className="text-slate-100 text-[15px] leading-relaxed whitespace-pre-wrap break-words">{renderContent(post.content)}</p>
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                            {post.tags.map((tag: string, idx: number) => {
                                                if (tag.startsWith('privacy:')) return null;
                                                if (tag.startsWith('feeling:')) return <span key={idx} className="bg-slate-800 text-yellow-400 text-xs px-2 py-1 rounded-md font-medium border border-yellow-400/20">Sentimento: {tag.split(':')[1]}</span>;
                                                if (tag.startsWith('location:')) return <span key={idx} className="bg-slate-800 text-green-400 text-xs px-2 py-1 rounded-md font-medium border border-green-400/20"><span className="material-symbols-rounded text-[12px] align-middle mr-1">location_on</span>{tag.split(':')[1]}</span>;
                                                return <span key={idx} className="bg-slate-800 text-primary-400 text-xs px-2 py-1 rounded-md font-medium border border-primary-500/20">#{tag}</span>;
                                            })}
                                        </div>
                                    )}
                                    {post.image_url && (
                                        <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
                                            {post.image_url.match(/\.(mp4|webm|ogg|mov|mkv)$/i) ? (
                                                <video src={post.image_url} controls className="w-full h-auto max-h-[400px] bg-black" />
                                            ) : (
                                                <img src={post.image_url} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                                            )}
                                        </div>
                                    )}
                                    {post.repost && (
                                        <div className="mt-3 border border-white/10 rounded-xl p-3 bg-slate-800/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                                                    {post.repost.author?.avatar_url ? (
                                                        <img src={post.repost.author.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-symbols-rounded w-full h-full flex items-center justify-center text-[14px] text-slate-500">person</span>
                                                    )}
                                                </div>
                                                <span className="font-bold text-white text-sm">{post.repost.author?.display_name || post.repost.author?.username}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed">{renderContent(post.repost.content)}</p>
                                        </div>
                                    )}

                                    
                                    {/* Action bar */}
                                    <div className="flex justify-between items-center mt-3 pr-8 text-slate-500 max-w-md">
                                        <button onClick={() => setSelectedPost(post)} className="flex items-center gap-1.5 hover:text-blue-400 transition-colors group">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-blue-400/10 transition-colors">
                                                <span className="material-symbols-rounded text-[18px]">chat_bubble</span>
                                            </div>
                                            <span className="text-xs font-medium">{post.comments_count || 0}</span>
                                        </button>
                                        <button onClick={async () => {
                                            try {
                                                await useCommunityStore.getState().repostPost(post.id, community.id);
                                                toast.success('Repostado com sucesso!');
                                            } catch (e) {
                                                toast.error('Erro ao repostar');
                                            }
                                        }} className="flex items-center gap-1.5 hover:text-green-400 transition-colors group">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-green-400/10 transition-colors">
                                                <span className="material-symbols-rounded text-[18px]">cached</span>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => useCommunityStore.getState().toggleLikePost(post.id)}
                                            className={`flex items-center gap-1.5 transition-colors group ${post.user_has_liked ? 'text-pink-500' : 'hover:text-pink-500'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${post.user_has_liked ? 'bg-pink-500/10' : 'group-hover:bg-pink-500/10'}`}>
                                                <span className={`material-symbols-rounded text-[18px] ${post.user_has_liked ? 'filled' : ''}`}>favorite</span>
                                            </div>
                                            <span className="text-xs font-medium">{post.likes_count || 0}</span>
                                        </button>
                                        <button className="flex items-center gap-1.5 hover:text-primary-400 transition-colors group">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-primary-500/10 transition-colors">
                                                <span className="material-symbols-rounded text-[18px]">ios_share</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-500 py-20 flex flex-col items-center">
                            <span className="material-symbols-rounded text-6xl text-slate-700 mb-4">forum</span>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">Seja o primeiro a postar!</h3>
                            <p className="text-sm">Inicie uma conversa nesta comunidade.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button (Mobile) */}
            {isMember && (
                <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-primary-500/50 z-30 hover:scale-105 transition-transform md:hidden"
                >
                    <span className="material-symbols-rounded">edit_square</span>
                </button>
            )}

            <AnimatePresence>
                {isCreatePostOpen && (
                    <CreatePostModal 
                        communityId={community.id}
                        initialMedia={initialPostMedia}
                        onClose={() => {
                            setIsCreatePostOpen(false);
                            setInitialPostMedia(null);
                        }}
                        onSubmit={async (content, image, tags) => {
                            let imageUrl = undefined;
                            if (image) {
                                try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (user) {
                                        const fileExt = image.name.split('.').pop();
                                        const fileName = `post_${Math.random()}.${fileExt}`;
                                        const filePath = `${user.id}/posts/${fileName}`;
                                        const { error } = await supabase.storage.from('user_uploads').upload(filePath, image);
                                        if (!error) {
                                            const { data } = supabase.storage.from('user_uploads').getPublicUrl(filePath);
                                            imageUrl = data.publicUrl;
                                        }
                                    }
                                } catch (e) {
                                    console.error('Upload error', e);
                                    toast.error('Erro ao fazer upload de mídia');
                                }
                            }
                            await createPost(community.id, content, imageUrl, tags);
                            setIsCreatePostOpen(false);
                            toast.success('Post enviado!');
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedPost && (
                    <CommunityPostDetailModal 
                        post={selectedPost}
                        communityId={community.id}
                        onClose={() => setSelectedPost(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Modal: Create Post (Rich)
const CreatePostModal: React.FC<{ communityId: string, onClose: () => void, onSubmit: (content: string, image?: File, tags?: string[]) => Promise<void>, initialMedia?: File | null }> = ({ communityId, onClose, onSubmit, initialMedia }) => {
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<File | null>(initialMedia || null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    
    useEffect(() => {
        if (initialMedia) {
            setMediaType(initialMedia.type.startsWith('video/') ? 'video' : 'image');
            const reader = new FileReader();
            reader.onloadend = () => setMediaPreview(reader.result as string);
            reader.readAsDataURL(initialMedia);
        }
    }, [initialMedia]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [privacy, setPrivacy] = useState<'public' | 'members'>('public');
    const [feeling, setFeeling] = useState<string>('');
    const [location, setLocation] = useState<string>('');

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMedia(file);
            setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
            const reader = new FileReader();
            reader.onloadend = () => setMediaPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !media) return;
        setIsSubmitting(true);
        const tags: string[] = [];
        if (privacy) tags.push(`privacy:${privacy}`);
        if (feeling) tags.push(`feeling:${feeling}`);
        if (location) tags.push(`location:${location}`);
        
        await onSubmit(content, media || undefined, tags.length > 0 ? tags : undefined);
        setIsSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[70] bg-black flex flex-col"
        >
            {mediaPreview && mediaType === 'image' && (
                <div className="absolute inset-0 z-0">
                    <img src={mediaPreview} alt="bg" className="w-full h-full object-cover opacity-20 blur-xl" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
                </div>
            )}
            <div className="relative z-10 flex justify-between items-center p-4">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg">
                    <span className="material-symbols-rounded">close</span>
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setPrivacy(p => p === 'public' ? 'members' : 'public')}
                        className="h-10 px-4 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors text-sm font-bold shadow-lg gap-2"
                    >
                        <span className="material-symbols-rounded text-[18px]">
                            {privacy === 'public' ? 'public' : 'lock'}
                        </span>
                        {privacy === 'public' ? 'Público' : 'Membros'}
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!content.trim() && !media)}
                        className="bg-primary-500 hover:bg-primary-600 text-white font-bold h-10 px-6 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/30"
                    >
                        {isSubmitting ? 'Enviando...' : 'Publicar'}
                    </button>
                </div>
            </div>
            
            <div className="relative z-10 flex-1 overflow-y-auto flex flex-col p-4">
                {feeling && (
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-white/60 text-sm">Estou me sentindo:</span>
                        <span className="text-white font-bold bg-white/10 px-3 py-1 rounded-full text-sm">{feeling}</span>
                        <button onClick={() => setFeeling('')} className="text-white/40 hover:text-white"><span className="material-symbols-rounded text-sm">close</span></button>
                    </div>
                )}
                {location && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-white/60 text-sm">Em:</span>
                        <span className="text-white font-bold bg-white/10 px-3 py-1 rounded-full text-sm">{location}</span>
                        <button onClick={() => setLocation('')} className="text-white/40 hover:text-white"><span className="material-symbols-rounded text-sm">close</span></button>
                    </div>
                )}

                {mediaPreview ? (
                    <div className="flex-1 flex flex-col justify-center items-center relative">
                        <div className="relative w-full max-h-[50vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/50">
                            {mediaType === 'image' ? (
                                <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                                <video src={mediaPreview} controls className="w-full h-full object-contain" />
                            )}
                            <button 
                                onClick={() => { setMedia(null); setMediaPreview(null); setMediaType(null); }}
                                className="absolute top-4 right-4 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            >
                                <span className="material-symbols-rounded">delete</span>
                            </button>
                        </div>
                        <div className="w-full mt-6">
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Adicione uma legenda..."
                                className="w-full bg-white/10 backdrop-blur-md text-white text-lg border border-white/10 focus:border-primary-500 focus:ring-0 resize-none placeholder-white/50 outline-none p-4 rounded-2xl min-h-[100px]"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="No que você está pensando?"
                            className="w-full bg-transparent text-white text-3xl md:text-4xl font-bold border-none focus:ring-0 resize-none placeholder-white/20 flex-1 outline-none mt-4 placeholder:font-bold"

                        />
                        <div className="mt-auto py-8">
                            <div className="text-white/40 text-sm font-medium flex justify-end">
                                {content.length}/500
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="relative z-10 bg-black/50 backdrop-blur-xl border-t border-white/10 p-4 pb-safe flex items-center justify-around text-white">
                <label className="cursor-pointer hover:bg-white/10 p-3 rounded-full transition-colors flex flex-col items-center gap-1 group">
                    <input type="file" accept="image/*" className="hidden" onChange={handleMediaChange} />
                    <span className="material-symbols-rounded text-2xl group-hover:scale-110 transition-transform text-primary-400">image</span>
                    <span className="text-[10px] font-bold text-white/50">Galeria</span>
                </label>
                <label className="cursor-pointer hover:bg-white/10 p-3 rounded-full transition-colors flex flex-col items-center gap-1 group">
                    <input type="file" accept="video/*" className="hidden" onChange={handleMediaChange} />
                    <span className="material-symbols-rounded text-2xl group-hover:scale-110 transition-transform text-purple-400">videocam</span>
                    <span className="text-[10px] font-bold text-white/50">Vídeo</span>
                </label>
                <button 
                    onClick={() => {
                        const url = prompt('Insira o link (URL) do GIF:');
                        if (url) {
                            setMediaPreview(url);
                            setMediaType('image');
                            // We can use a trick: set a dummy file or modify onSubmit to accept string url
                            fetch(url).then(r => r.blob()).then(blob => {
                                setMedia(new File([blob], 'gif.gif', { type: 'image/gif' }));
                            }).catch(() => alert('Não foi possível carregar o GIF'));
                        }
                    }}
                    className="hover:bg-white/10 p-3 rounded-full transition-colors flex flex-col items-center gap-1 group"
                >
                    <span className="material-symbols-rounded text-2xl group-hover:scale-110 transition-transform text-pink-400">gif_box</span>
                    <span className="text-[10px] font-bold text-white/50">GIF</span>
                </button>
                <button 
                    onClick={() => {
                        const feels = ['😊 Feliz', '😎 Confiante', '🔥 Quente', '😢 Triste', '💪 Focado', '🎉 Festeiro'];
                        const f = prompt('Como você está se sentindo? (ex: ' + feels.join(', ') + ')');
                        if (f) setFeeling(f);
                    }}
                    className="hover:bg-white/10 p-3 rounded-full transition-colors flex flex-col items-center gap-1 group"
                >
                    <span className="material-symbols-rounded text-2xl group-hover:scale-110 transition-transform text-yellow-400">sentiment_satisfied</span>
                    <span className="text-[10px] font-bold text-white/50">Sentimento</span>
                </button>
                <button 
                    onClick={() => {
                        const loc = prompt('Onde você está? (ex: São Paulo, Rio de Janeiro, Festa na Piscina)');
                        if (loc) setLocation(loc);
                    }}
                    className="hover:bg-white/10 p-3 rounded-full transition-colors flex flex-col items-center gap-1 group"
                >
                    <span className="material-symbols-rounded text-2xl group-hover:scale-110 transition-transform text-green-400">location_on</span>
                    <span className="text-[10px] font-bold text-white/50">Local</span>
                </button>
            </div>
        </motion.div>
    );
};

// Modal: Create Community
const CreateCommunityModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { createCommunity } = useCommunityStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [questions, setQuestions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('O nome é obrigatório');
        
        setIsSubmitting(true);

        let cover_image_url = undefined;
        if (coverImage) {
            try {
                const { supabase } = await import('../lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const ext = coverImage.name.split('.').pop();
                    const path = `${user.id}/community_covers/${Math.random()}.${ext}`;
                    const { error } = await supabase.storage.from('user_uploads').upload(path, coverImage);
                    if (!error) {
                        const { data } = supabase.storage.from('user_uploads').getPublicUrl(path);
                        cover_image_url = data.publicUrl;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
        const newCommunity = await createCommunity({
            name,
            description,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
            is_private: isPrivate,
            cover_image_url,
            rules: isPrivate && questions.length > 0 ? JSON.stringify({ questions }) : null
        });
        setIsSubmitting(false);

        if (newCommunity) {
            toast.success('Comunidade criada!');
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-dark-800 rounded-3xl p-6 w-full max-w-md border border-white/10"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-outfit text-white">Criar Comunidade</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white">
                        <span className="material-symbols-rounded text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Comunidade</label>
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                            placeholder="Ex: Lésbicas Tech SP"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Capa da Comunidade</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" id="isPrivate" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-5 h-5 accent-primary-500 rounded bg-dark-900 border-white/10" />
                        <label htmlFor="isPrivate" className="text-sm font-medium text-slate-300">Comunidade Privada (Requer aprovação)</label>
                    </div>
                    {isPrivate && (
                        <div className="space-y-2 p-4 bg-dark-900 rounded-xl border border-white/5">
                            <label className="block text-sm font-medium text-slate-400">Perguntas para Inscrição (Formulário)</label>
                            {questions.map((q, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="text" value={q} onChange={e => { const n = [...questions]; n[i] = e.target.value; setQuestions(n); }} placeholder="Ex: Por que quer entrar?" className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
                                    <button type="button" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} className="text-red-500 p-2"><span className="material-symbols-rounded">delete</span></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setQuestions([...questions, ''])} className="text-sm text-primary-500 font-bold flex items-center gap-1 mt-2"><span className="material-symbols-rounded text-sm">add</span> Adicionar Pergunta</button>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:outline-none min-h-[100px]"
                            placeholder="Sobre o que é esta comunidade?"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tags (separadas por vírgula)</label>
                        <input 
                            type="text" 
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                            placeholder="Ex: tecnologia, networking, mulheres"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold mt-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Criando...' : 'Criar Comunidade'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
};


// Modal: Manage Members
const ManageMembersModal: React.FC<{ community: Community, onClose: () => void, myRole: string | null }> = ({ community, onClose, myRole }) => {
    const { fetchCommunityMembers, updateMemberRole, removeMember, fetchJoinRequests, handleJoinRequest } = useCommunityStore();
    const [members, setMembers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        const m = await fetchCommunityMembers(community.id);
        setMembers(m);
        const r = await fetchJoinRequests(community.id);
        setRequests(r);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-800 rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-outfit text-white">Gerenciar Comunidade</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"><span className="material-symbols-rounded text-[20px]">close</span></button>
                </div>
                
                <div className="flex gap-4 mb-4 border-b border-white/10">
                    <button onClick={() => setActiveTab('members')} className={`pb-2 font-bold ${activeTab === 'members' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400'}`}>Membros ({members.length})</button>
                    <button onClick={() => setActiveTab('requests')} className={`pb-2 font-bold ${activeTab === 'requests' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400'}`}>Solicitações ({requests.length})</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {activeTab === 'members' && members.map(m => (
                        <div key={m.user_id} className="flex items-center justify-between bg-dark-900 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <img src={m.profile?.avatar_url || 'https://placehold.co/100x100/1f2937/d1d5db/png?text=U'} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <p className="text-white font-bold">{m.profile?.username || 'Usuário'}</p>
                                    <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                                </div>
                            </div>
                            {myRole === 'admin' && m.role !== 'admin' && (
                                <div className="flex gap-2">
                                    <button onClick={async () => { await updateMemberRole(community.id, m.user_id, m.role === 'moderator' ? 'member' : 'moderator'); load(); }} className="text-xs px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 text-white font-medium">
                                        {m.role === 'moderator' ? 'Remover Mod' : 'Fazer Mod'}
                                    </button>
                                    <button onClick={async () => { if(confirm('Remover usuário?')) { await removeMember(community.id, m.user_id); load(); } }} className="text-xs px-3 py-1 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/30 font-medium">Banir</button>
                                </div>
                            )}
                            {myRole === 'moderator' && m.role === 'member' && (
                                <button onClick={async () => { if(confirm('Remover usuário?')) { await removeMember(community.id, m.user_id); load(); } }} className="text-xs px-3 py-1 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/30 font-medium">Remover</button>
                            )}
                        </div>
                    ))}
                    {activeTab === 'requests' && requests.length === 0 && <p className="text-slate-400 text-center py-8">Nenhuma solicitação pendente.</p>}
                    {activeTab === 'requests' && requests.map(req => {
                        let answers = [];
                        try { answers = JSON.parse(req.content) || []; } catch(e){}
                        return (
                        <div key={req.id} className="bg-dark-900 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3 mb-3">
                                <img src={req.author?.avatar_url || 'https://placehold.co/100x100'} className="w-10 h-10 rounded-full" />
                                <p className="text-white font-bold">{req.author?.username || 'Usuário'}</p>
                            </div>
                            <div className="space-y-2 mb-4">
                                {Array.isArray(answers) && answers.map((ans: any, i: number) => (
                                    <div key={i} className="bg-dark-800 p-3 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">{ans.q}</p>
                                        <p className="text-sm text-white">{ans.a}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={async () => { await handleJoinRequest(community.id, req.id, req.author_id, true); load(); }} className="flex-1 py-2 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600">Aprovar</button>
                                <button onClick={async () => { await handleJoinRequest(community.id, req.id, req.author_id, false); load(); }} className="flex-1 py-2 bg-white/10 text-white rounded-full font-bold hover:bg-white/20">Recusar</button>
                            </div>
                        </div>
                    )})}
                </div>
            </motion.div>
        </motion.div>
    );
};

// Modal: Edit Community
const EditCommunityModal: React.FC<{ community: Community, onClose: () => void }> = ({ community, onClose }) => {
    const { updateCommunity } = useCommunityStore();
    const [name, setName] = useState(community.name);
    const [description, setDescription] = useState(community.description || '');
    const [tags, setTags] = useState(community.tags?.join(', ') || '');
    const [isPrivate, setIsPrivate] = useState(community.is_private);
    
    // Parse rules for join questions
    let parsedRules = community.rules || '';
    let parsedQuestions: string[] = [];
    try {
        if (parsedRules.startsWith('{')) {
            const data = JSON.parse(parsedRules);
            parsedRules = data.text || '';
            parsedQuestions = data.questions || [];
        }
    } catch(e) {}
    
    const [rulesText, setRulesText] = useState(parsedRules);
    const [questions, setQuestions] = useState<string[]>(parsedQuestions);
    const [coverImage, setCoverImage] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            name, description, is_private: isPrivate, tags: tags.split(',').map(t => t.trim()).filter(t => t),
            rules: JSON.stringify({ text: rulesText, questions })
        };
        if (coverImage) {
            try {
                const { supabase } = await import('../lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const ext = coverImage.name.split('.').pop();
                    const path = `${user.id}/community_covers/${Math.random()}.${ext}`;
                    const { error } = await supabase.storage.from('user_uploads').upload(path, coverImage);
                    if (!error) {
                        const { data } = supabase.storage.from('user_uploads').getPublicUrl(path);
                        payload.cover_image_url = data.publicUrl;
                    }
                }
            } catch (e) { }
        }
        await updateCommunity(community.id, payload);
        onClose();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-800 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-outfit text-white">Editar Comunidade</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"><span className="material-symbols-rounded text-[20px]">close</span></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tags</label>
                        <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Capa (Opcional)</label>
                        <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="editPrivate" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-5 h-5 accent-primary-500 rounded bg-dark-900 border-white/10" />
                        <label htmlFor="editPrivate" className="text-sm font-medium text-slate-300">Comunidade Privada (Requer aprovação)</label>
                    </div>
                    {isPrivate && (
                        <div className="space-y-2 p-4 bg-dark-900 rounded-xl border border-white/5">
                            <label className="block text-sm font-medium text-slate-400">Perguntas de Inscrição</label>
                            {questions.map((q, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="text" value={q} onChange={e => { const n = [...questions]; n[i] = e.target.value; setQuestions(n); }} className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
                                    <button type="button" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} className="text-red-500 p-2"><span className="material-symbols-rounded">delete</span></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setQuestions([...questions, ''])} className="text-sm text-primary-500 font-bold flex items-center gap-1 mt-2"><span className="material-symbols-rounded text-sm">add</span> Adicionar Pergunta</button>
                        </div>
                    )}
                    <button type="submit" className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25 mt-4">Salvar Alterações</button>
                </form>
            </motion.div>
        </motion.div>
    );
};

// Modal: Join Private Community
const JoinPrivateCommunityModal: React.FC<{ community: Community, onClose: () => void }> = ({ community, onClose }) => {
    const { submitJoinRequest } = useCommunityStore();
    
    let parsedRules = community.rules || '';
    let parsedQuestions: string[] = [];
    try {
        if (parsedRules.startsWith('{')) {
            const data = JSON.parse(parsedRules);
            parsedQuestions = data.questions || [];
        }
    } catch(e) {}

    const [answers, setAnswers] = useState<string[]>(Array(parsedQuestions.length).fill(''));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = parsedQuestions.map((q, i) => ({ q, a: answers[i] }));
        await submitJoinRequest(community.id, payload);
        setIsSubmitting(false);
        import('react-hot-toast').then(({ default: toast }) => toast.success('Solicitação enviada!'));
        onClose();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-800 rounded-3xl p-6 w-full max-w-md border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-outfit text-white">Entrar em {community.name}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"><span className="material-symbols-rounded text-[20px]">close</span></button>
                </div>
                {parsedQuestions.length > 0 ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-slate-400 mb-4">Responda às perguntas abaixo para solicitar entrada:</p>
                        {parsedQuestions.map((q, i) => (
                            <div key={i}>
                                <label className="block text-sm font-medium text-white mb-1">{q}</label>
                                <textarea required value={answers[i]} onChange={e => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 outline-none min-h-[80px]" />
                            </div>
                        ))}
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors mt-4 disabled:opacity-50">Enviar Solicitação</button>
                    </form>
                ) : (
                    <div className="text-center">
                        <p className="text-slate-400 mb-6">Esta comunidade é privada. Deseja solicitar entrada?</p>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors">Solicitar Entrada</button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

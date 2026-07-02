import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useCommunityStore } from '../stores/communityStore';
import { toast } from 'react-hot-toast';
import type { CommunityPost, CommunityComment } from '../types';

export const CommunityPostDetailModal: React.FC<{ post: CommunityPost, onClose: () => void, communityId: string }> = ({ post, onClose, communityId }) => {
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { fetchCommunityPosts } = useCommunityStore();

    useEffect(() => {
        loadComments();
    }, [post.id]);

    const loadComments = async () => {
        try {
            const { data, error } = await supabase
                .from('community_comments')
                .select('*, author:profiles!community_comments_author_id_fkey(*)')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setComments(data as any[]);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');
            
            const { error } = await supabase.from('community_comments').insert({
                post_id: post.id,
                author_id: user.id,
                content: newComment
            });
            if (error) throw error;
            
            setNewComment('');
            await loadComments();
            // Update comments count in post
            await fetchCommunityPosts(communityId);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao enviar comentário');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string, authorId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id !== authorId) return; // Note: admins can also delete, handled by RLS if configured
            const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
            if (error) throw error;
            await loadComments();
            await fetchCommunityPosts(communityId);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-bold text-white">Comentários</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"><span className="material-symbols-rounded text-[20px]">close</span></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Main post reference (optional, could just be comments) */}
                    <div className="mb-6 pb-6 border-b border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <img src={post.author?.avatar_url || 'https://placehold.co/100'} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                                <p className="font-bold text-white text-sm">{post.author?.display_name || post.author?.username}</p>
                                <p className="text-slate-500 text-xs">@{post.author?.username}</p>
                            </div>
                        </div>
                        <p className="text-slate-200 text-sm whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {comments.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-rounded text-4xl text-slate-600 mb-2">chat_bubble</span>
                            <p className="text-slate-400 text-sm">Seja o primeiro a comentar!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <img src={c.author?.avatar_url || 'https://placehold.co/100'} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                    <div className="flex-1 bg-dark-900 rounded-2xl p-3 border border-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <span className="font-bold text-white text-sm mr-2">{c.author?.display_name || c.author?.username}</span>
                                                <span className="text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <button onClick={() => handleDelete(c.id, c.author_id)} className="text-slate-500 hover:text-red-400"><span className="material-symbols-rounded text-sm">delete</span></button>
                                        </div>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 shrink-0 bg-dark-900/50">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Adicione um comentário..." className="flex-1 bg-dark-900 border border-white/10 rounded-full px-4 py-3 text-white text-sm focus:border-primary-500 outline-none" />
                        <button type="submit" disabled={!newComment.trim() || isSubmitting} className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 shrink-0"><span className="material-symbols-rounded">send</span></button>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
};

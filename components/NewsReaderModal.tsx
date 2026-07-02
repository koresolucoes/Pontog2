

import React, { useEffect, useState } from 'react';
import { NewsArticle } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { AnimatedBackground } from './AnimatedBackground';
import { useNewsStore } from '../stores/newsStore';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';

interface NewsReaderModalProps {
    article: NewsArticle;
    onClose: () => void;
}

export const NewsReaderModal: React.FC<NewsReaderModalProps> = ({ article, onClose }) => {
    const { t } = useTranslation();
    const { activeComments, loadingComments, fetchComments, addComment, toggleLikeComment } = useNewsStore();
    const { user } = useAuthStore();
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (article.id) {
            fetchComments(article.id);
        }
    }, [article.id, fetchComments]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        await addComment(article.id, newComment);
        setNewComment('');
    };

    return (
        <div className="fixed inset-0 z-[70] animate-fade-in flex justify-center overflow-y-auto">
            {/* Fundo Animado Fixo - Não rola com o texto */}
            <AnimatedBackground className="z-0" />
            
            {/* Backdrop escuro semi-transparente para focar no conteúdo */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-0" onClick={onClose}></div>

            <div className="w-full max-w-2xl min-h-screen bg-slate-900/95 backdrop-blur-xl shadow-2xl relative z-10 border-x border-white/10">
                
                {/* Hero Image */}
                <div className="relative h-72 md:h-96 w-full">
                    <img 
                        src={article.image_url} 
                        alt={article.title} 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/60 transition-colors border border-white/10 z-20"
                    >
                        <span className="material-symbols-rounded text-2xl">arrow_back</span>
                    </button>
                </div>

                <div className="px-6 md:px-10 -mt-20 relative z-10 pb-20">
                    {/* Tags & Meta */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">
                            {article.type === 'blog' ? t('news.type_blog', { defaultValue: 'Blog Ponto G' }) : t('news.type_news', { defaultValue: 'Notícia' })}
                        </span>
                        {article.tags.map(tag => (
                            <span key={tag} className="bg-slate-800/80 backdrop-blur-md text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-white font-outfit leading-tight mb-4 drop-shadow-lg">
                        {article.title}
                    </h1>

                    <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center font-bold text-white">
                                {article.source.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{article.author || article.source}</p>
                                <p className="text-xs text-slate-400 capitalize">
                                    {format(new Date(article.published_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: article.title,
                                        text: article.summary,
                                        url: window.location.href
                                    });
                                }
                            }}
                            className="text-slate-400 hover:text-primary-500 transition-colors"
                        >
                            <span className="material-symbols-rounded">share</span>
                        </button>
                    </div>

                    {/* Content Body */}
                    <div 
                        className="prose prose-invert prose-lg max-w-none prose-headings:font-outfit prose-headings:text-white prose-p:text-slate-300 prose-a:text-primary-400 prose-strong:text-white prose-li:text-slate-300"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                    
                    {/* Comments Section */}
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <h3 className="text-xl font-bold text-white mb-6 font-outfit flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary-500">forum</span>
                            {t('news.comments_title', { defaultValue: 'Comentários ({{count}})', count: activeComments.length })}
                        </h3>

                        {/* Input */}
                        {user ? (
                            <form onSubmit={handlePostComment} className="mb-8 flex gap-3 items-start">
                                <img loading="lazy" src={user.avatar_url} className="w-10 h-10 rounded-full object-cover border border-white/10" alt={user.username} />
                                <div className="flex-1 relative">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={t('news.comment_placeholder', { defaultValue: 'Escreva seu comentário...' })}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-2xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-sm"
                                        rows={2}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!newComment.trim()}
                                        className="absolute bottom-2 right-2 p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-0 disabled:scale-50 transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-rounded text-xl block">send</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-slate-800/30 p-4 rounded-xl text-center mb-8 border border-white/5">
                                <p className="text-slate-400 text-sm">{t('news.login_to_comment', { defaultValue: 'Faça login para comentar.' })}</p>
                            </div>
                        )}

                        {/* List */}
                        <div className="space-y-6">
                            {loadingComments ? (
                                <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : activeComments.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center italic">{t('news.be_first_comment', { defaultValue: 'Seja o primeiro a comentar!' })}</p>
                            ) : (
                                activeComments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <img loading="lazy" src={comment.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white/5 flex-shrink-0" alt={comment.username} />
                                        <div className="flex-1">
                                            <div className="bg-slate-800/40 p-3 rounded-2xl rounded-tl-none border border-white/5">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-bold text-white text-sm">{comment.username}</span>
                                                    <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true } as any)}</span>
                                                </div>
                                                <p className="text-slate-300 text-sm leading-relaxed">{comment.content}</p>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 ml-2">
                                                <button 
                                                    onClick={() => toggleLikeComment(comment.id, comment.user_has_liked)}
                                                    className={`text-xs font-bold flex items-center gap-1 transition-colors ${comment.user_has_liked ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <span className={`material-symbols-rounded text-sm ${comment.user_has_liked ? 'filled' : ''}`}>favorite</span>
                                                    {comment.likes_count > 0 && <span className="text-[10px]">{comment.likes_count}</span>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Footer CTA */}
                    <div className="mt-12 text-center">
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-sm font-bold underline decoration-slate-600 hover:decoration-white">
                            {t('news.close_article', { defaultValue: 'Fechar Artigo' })}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
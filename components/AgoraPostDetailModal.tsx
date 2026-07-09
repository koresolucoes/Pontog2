import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AgoraPost, AgoraComment } from '../types';
import { useAgoraStore } from '../stores/agoraStore';
import { useAuthStore } from '../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { handleUserClick } from './postUtils';

interface AgoraPostDetailModalProps {
  post: AgoraPost;
  onClose: () => void;
}

export const AgoraPostDetailModal: React.FC<AgoraPostDetailModalProps> = ({ post, onClose }) => {
  const { addComment, fetchCommentsForPost, toggleLikePost, toggleLikeComment } = useAgoraStore();
  const currentPost = useAgoraStore(state => state.posts.find(p => p.id === post.id)) || post;
  
  const currentUser = useAuthStore(state => state.user);
  const [comments, setComments] = useState<AgoraComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadComments = async () => {
      setIsLoadingComments(true);
      const fetchedComments = await fetchCommentsForPost(post.id);
      setComments(fetchedComments);
      setIsLoadingComments(false);
    };
    loadComments();
  }, [post.id, fetchCommentsForPost]);
  
  useEffect(() => {
    if (!isLoadingComments) {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, isLoadingComments]);


  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() === '' || !currentUser) return;
    
    const tempContent = newComment.trim();
    setNewComment('');

    const tempComment: AgoraComment = {
        id: Date.now(), post_id: post.id, user_id: currentUser.id,
        content: tempContent, created_at: new Date().toISOString(),
        profiles: { username: currentUser.username, avatar_url: currentUser.avatar_url },
        likes_count: 0, user_has_liked: false,
    };
    setComments(prev => [...prev, tempComment]);

    await addComment(post.id, tempContent);
    const updatedComments = await fetchCommentsForPost(post.id);
    setComments(updatedComments);
  };

  const handleToggleCommentLike = async (commentId: number) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const hasLiked = comment.user_has_liked;
    setComments(prevComments =>
      prevComments.map(c =>
        c.id === commentId ? { ...c, user_has_liked: !hasLiked, likes_count: hasLiked ? Math.max(0, (Number(c.likes_count) || 0) - 1) : (Number(c.likes_count) || 0) + 1 } : c
      )
    );
    await toggleLikeComment(commentId, hasLiked);
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-dark-900/95 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] animate-fade-in p-0 sm:p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md mx-auto animate-slide-in-up flex flex-col h-[90vh] border border-white/10" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-white/5 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleUserClick({ id: currentPost.user_id, username: currentPost.username, avatar_url: currentPost.avatar_url })}
          >
            <img loading="lazy" src={currentPost.avatar_url} alt={currentPost.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500" />
            <div>
              <h2 className="font-bold text-white leading-none">{currentPost.username}</h2>
              <p className="text-xs text-red-400 font-bold uppercase tracking-wider mt-1">Modo Agora 🔥</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
            <div className="relative">
                <img loading="lazy" src={currentPost.photo_url} alt={`Post de ${currentPost.username}`} className="w-full h-auto object-contain bg-black" />
                {currentPost.status_text?.includes('📍') && (
                    <div className="absolute top-4 right-4 bg-primary-600/95 backdrop-blur-md text-white font-extrabold text-[10px] tracking-wider uppercase py-1.5 px-3 rounded-full flex items-center gap-1 shadow-lg z-10 border border-white/20 animate-pulse">
                        <span className="material-symbols-rounded filled text-xs">location_on</span>
                        <span>CHECK-IN</span>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                     {currentPost.status_text && (
                        <p className="text-white text-lg font-medium italic flex items-center gap-1.5">
                            {currentPost.status_text.includes('📍') && (
                                <span className="material-symbols-rounded text-primary-500 filled text-xl animate-bounce">location_on</span>
                            )}
                            <span>"{currentPost.status_text}"</span>
                        </p>
                     )}
                </div>
            </div>
            
            <div className="p-4 flex items-center gap-6 border-b border-white/5 bg-slate-800/30">
                <button onClick={() => toggleLikePost(currentPost.id)} className="flex items-center gap-2 group">
                    <span className={`material-symbols-rounded text-3xl transition-transform group-active:scale-75 ${currentPost.user_has_liked ? 'text-primary-500 filled' : 'text-slate-400 hover:text-white'}`}>
                        favorite
                    </span>
                    <span className="font-bold text-sm text-slate-300">{currentPost.likes_count}</span>
                </button>
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-rounded text-3xl">chat_bubble</span>
                    <span className="font-bold text-sm">{comments.length}</span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {isLoadingComments ? (
                    <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <span className="material-symbols-rounded text-3xl mb-2 opacity-50">forum</span>
                        <p className="text-sm">Nenhum comentário ainda.</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex items-start space-x-3 group">
                            <img 
                                loading="lazy" 
                                src={comment.profiles.avatar_url} 
                                alt={comment.profiles.username} 
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1 border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handleUserClick({ id: comment.user_id, username: comment.profiles.username, avatar_url: comment.profiles.avatar_url })}
                            />
                            <div className="flex-1">
                                <div className="bg-slate-800/50 rounded-2xl rounded-tl-none px-4 py-2 border border-white/5">
                                    <div className="flex items-baseline justify-between">
                                        <span 
                                            className="font-bold text-white text-sm cursor-pointer hover:underline"
                                            onClick={() => handleUserClick({ id: comment.user_id, username: comment.profiles.username, avatar_url: comment.profiles.avatar_url })}
                                        >
                                            {comment.profiles.username}
                                        </span>
                                        <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true } as any)}</span>
                                    </div>
                                    <p className="text-slate-300 text-sm mt-0.5 break-words leading-relaxed">{comment.content}</p>
                                </div>
                                <div className="px-2 py-1 flex items-center gap-4">
                                    <button onClick={() => handleToggleCommentLike(comment.id)} className={`flex items-center gap-1 text-xs font-semibold transition-colors ${comment.user_has_liked ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}>
                                        {comment.user_has_liked ? 'Curtiu' : 'Curtir'}
                                        {comment.likes_count > 0 && <span className="text-[10px] bg-slate-800 px-1.5 rounded-full border border-white/5 ml-1">{comment.likes_count}</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} />
            </div>
        </div>

        <form onSubmit={handleAddComment} className="p-3 border-t border-white/5 bg-slate-900 flex-shrink-0 pb-5 sm:pb-3">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Comentar..."
              className="flex-1 bg-slate-800 rounded-full py-3 pl-5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 border border-white/5 text-sm"
            />
            <button 
                type="submit" 
                disabled={!newComment.trim()}
                className="absolute right-2 p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-0 disabled:scale-50 transform duration-200"
            >
                <span className="material-symbols-rounded text-xl block">arrow_upward</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  ) : null;
};
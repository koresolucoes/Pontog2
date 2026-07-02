
// pages/Admin/views/AdminNewsView.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { NewsArticle, ArticleType } from '../../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';

const ARTICLE_TYPES: { value: ArticleType; label: string }[] = [
    { value: 'news', label: 'Notícia Externa (Link)' },
    { value: 'blog', label: 'Blog Interno (HTML)' },
];

const DEFAULT_ARTICLE_STATE: Partial<NewsArticle> = {
    title: '',
    summary: '',
    content: '',
    image_url: '',
    source: '',
    type: 'blog',
    tags: [],
    author: 'Equipe Ponto G'
};

const ArticleModal: React.FC<{
    article: Partial<NewsArticle> | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ article, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<NewsArticle>>(DEFAULT_ARTICLE_STATE);
    const [tagsInput, setTagsInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    const token = useAdminStore((state) => state.getToken());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEditing = !!article?.id;

    useEffect(() => {
        if (article) {
            setFormData({
                ...DEFAULT_ARTICLE_STATE,
                ...article
            });
            setTagsInput(article.tags ? article.tags.join(', ') : '');
            setPreviewUrl(article.image_url || null);
        }
    }, [article]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Imagem muito grande (Max 5MB)");
                return;
            }
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            let finalImageUrl = formData.image_url;

            // 1. Upload Image if selected
            if (imageFile) {
                setUploading(true);
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `news_images/admin_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('user_uploads')
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error('Falha no upload da imagem: ' + uploadError.message);

                const { data: urlData } = supabase.storage
                    .from('user_uploads')
                    .getPublicUrl(fileName);
                
                finalImageUrl = urlData.publicUrl;
                setUploading(false);
            }

            const url = isEditing ? `/api/admin/news?id=${article?.id}` : '/api/admin/news';
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                image_url: finalImageUrl,
                tags: tagsInput.split(',').map(t => t.trim()).filter(t => t !== '')
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar artigo');
            }

            toast.success(`Artigo ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            onSave();
            onClose();
        } catch (err: any) {
            setUploading(false);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Artigo' : 'Novo Artigo'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Image Uploader */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Imagem de Capa</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-[21/9] bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-pink-500 transition-all overflow-hidden relative group"
                            >
                                {previewUrl ? (
                                    <>
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                                <span className="material-symbols-rounded">edit</span> Alterar Foto
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="material-symbols-rounded text-2xl text-slate-400">add_a_photo</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Carregar Imagem</span>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                />
                            </div>
                            <input 
                                name="image_url" 
                                value={formData.image_url || ''} 
                                onChange={handleChange} 
                                placeholder="Ou cole a URL aqui..." 
                                className="mt-2 w-full bg-slate-800 border border-white/5 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500/30" 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Título</label>
                                <input name="title" value={formData.title || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tipo</label>
                                <select name="type" value={formData.type || 'blog'} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 appearance-none">
                                    {ARTICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Resumo (Card)</label>
                            <textarea name="summary" rows={2} value={formData.summary || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none" required />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">
                                {formData.type === 'news' ? 'URL da Notícia' : 'Conteúdo HTML'}
                            </label>
                            {formData.type === 'news' ? (
                                <input name="content" value={formData.content || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" required />
                            ) : (
                                <textarea name="content" rows={10} value={formData.content || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none" required />
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Fonte / Autor</label>
                                <input name="source" value={formData.source || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tags (separadas por vírgula)</label>
                                <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Saúde, Eventos, Dicas" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading} className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {uploading ? 'Enviando Imagem...' : 'Salvando...'}
                                    </>
                                ) : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export const AdminNewsView: React.FC = () => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingArticle, setEditingArticle] = useState<Partial<NewsArticle> | null>(null);
    const token = useAdminStore((state) => state.getToken());

    // Search & Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/news', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar artigos');
            const data = await response.json();
            setArticles(data);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar notícias.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, [token]);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este artigo?')) return;
        try {
            await fetch(`/api/admin/news?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Artigo removido.');
            fetchArticles();
        } catch (err) {
            toast.error('Erro ao remover.');
        }
    };

    // Filter Logic
    const filteredArticles = useMemo(() => {
        return articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [articles, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
    const currentArticles = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredArticles.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredArticles, currentPage]);

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white font-outfit">G News & Blog</h1>
                    <p className="text-slate-400">Gerencie o conteúdo editorial do app.</p>
                </div>
                <button 
                    onClick={() => setEditingArticle(DEFAULT_ARTICLE_STATE)}
                    className="w-full sm:w-auto bg-pink-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-pink-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-rounded">add_circle</span>
                    Novo Artigo
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <span className="material-symbols-rounded">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por título, resumo ou tags..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Carregando...</div>
            ) : (
                <>
                    <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto border border-white/5">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Capa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Título / Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Publicado em</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {currentArticles.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            Nenhum artigo encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    currentArticles.map(article => (
                                        <tr key={article.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <img 
                                                    src={article.image_url} 
                                                    className="w-16 h-12 rounded-lg object-cover bg-slate-900 border border-white/10"
                                                    alt="thumbnail"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-white mb-1 line-clamp-1">{article.title}</div>
                                                <div className="text-xs text-gray-400 line-clamp-1">{article.summary}</div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {article.tags.map((t, idx) => (
                                                        <span key={idx} className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-white/5">{t}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${article.type === 'blog' ? 'bg-purple-600/20 text-purple-300' : 'bg-blue-600/20 text-blue-300'}`}>
                                                    {article.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {format(new Date(article.published_at), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => setEditingArticle(article)} 
                                                        className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-rounded text-lg block">edit</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(article.id)} 
                                                        className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-rounded text-lg block">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="py-4 flex justify-between items-center">
                        <span className="text-sm text-gray-400">
                            Página {currentPage} de {totalPages || 1}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1} 
                                className="px-4 py-2 bg-slate-800 rounded-lg text-sm text-white font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/5"
                            >
                                Anterior
                            </button>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages || totalPages === 0} 
                                className="px-4 py-2 bg-slate-800 rounded-lg text-sm text-white font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/5"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </>
            )}

            {editingArticle && (
                <ArticleModal 
                    article={editingArticle} 
                    onClose={() => setEditingArticle(null)} 
                    onSave={fetchArticles} 
                />
            )}
        </div>
    );
};

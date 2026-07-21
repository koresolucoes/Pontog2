

import React, { useEffect, useState } from 'react';
import { useNewsStore } from '../stores/newsStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { NewsArticle } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { NewsReaderModal } from './NewsReaderModal';
import { AdSenseUnit } from './AdSenseUnit';
import { useTranslation } from 'react-i18next';
import { cleanTag, parseTags } from '../lib/utils';

export const NewsView: React.FC = () => {
    const { articles, loading, fetchArticles } = useNewsStore();
    const { user } = useAuthStore();
    const { setActiveView } = useUiStore();
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [filter, setFilter] = useState<'all' | 'blog' | 'news'>('all');
    const { t, i18n } = useTranslation();

    const getLocale = () => {
        if (i18n.language.startsWith('en')) return enUS;
        if (i18n.language.startsWith('es')) return es;
        return ptBR;
    };

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleArticleClick = (article: NewsArticle) => {
        if (article.type === 'news') {
            // Notícias externas abrem em nova aba
            window.open(article.content, '_blank', 'noopener,noreferrer');
        } else {
            // Blog interno abre no modal
            setSelectedArticle(article);
        }
    };

    const handleBack = () => {
        setActiveView('home'); // Vai voltar para a Landing Page pois não tem user
    };

    const filteredArticles = articles.filter(a => filter === 'all' || a.type === filter);

    const FeaturedCard = ({ article }: { article: NewsArticle }) => (
        <div 
            onClick={() => handleArticleClick(article)}
            className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl border border-white/5 mb-8"
        >
            <img 
                src={article.image_url} 
                alt={article.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${article.type === 'blog' ? 'bg-primary-600 text-white' : 'bg-blue-600 text-white'}`}>
                        {article.type === 'blog' ? t('news.editorial', { defaultValue: 'Editorial' }) : t('news.world', { defaultValue: 'Mundo' })}
                    </span>
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wide">
                        {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: getLocale() } as any)}
                    </span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white font-outfit leading-tight mb-2 group-hover:text-primary-200 transition-colors">
                    {article.title}
                </h2>
                <p className="text-sm md:text-base text-slate-300 line-clamp-2 max-w-2xl">
                    {article.summary}
                </p>
            </div>
        </div>
    );

    const NewsCard = ({ article }: { article: NewsArticle }) => (
        <div 
            onClick={() => handleArticleClick(article)}
            className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-slate-800/60 transition-all cursor-pointer group flex flex-col h-full"
        >
            <div className="relative aspect-video overflow-hidden">
                <img 
                    src={article.image_url} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                    {article.source}
                </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${article.type === 'blog' ? 'bg-primary-500' : 'bg-blue-500'}`}></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                        {cleanTag(parseTags(article.tags)[0]) || t('news.general', { defaultValue: 'Geral' })}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-white font-outfit leading-tight mb-2 group-hover:text-primary-400 transition-colors">
                    {article.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                    {article.summary}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] text-slate-500 font-medium">
                        {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: getLocale() } as any)}
                    </span>
                    <span className="text-xs font-bold text-primary-500 group-hover:underline flex items-center gap-1">
                        {article.type === 'blog' ? t('news.read_article', { defaultValue: 'Ler Artigo' }) : t('news.access_link', { defaultValue: 'Acessar Link' })}
                        <span className="material-symbols-rounded text-sm">{article.type === 'blog' ? 'article' : 'open_in_new'}</span>
                    </span>
                </div>
            </div>
        </div>
    );

    // Se não estiver logado, não adiciona o padding extra para o menu hambúrguer
    const headerPadding = user ? 'pl-16' : 'px-5';

    return (
        <>
            <div className="h-full flex flex-col bg-dark-900 pb-20">
                {/* Header */}
                <div className={`${headerPadding} py-4 bg-dark-900/90 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5 flex flex-wrap gap-3 justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        {!user && (
                            <button 
                                onClick={handleBack}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <span className="material-symbols-rounded">arrow_back</span>
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-white font-outfit tracking-tight flex items-center gap-2">
                                <span className="material-symbols-rounded text-3xl text-primary-500">newspaper</span>
                                {t('news.title', { defaultValue: 'G News' })}
                            </h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">{t('news.subtitle', { defaultValue: 'Notícias & Lifestyle' })}</p>
                        </div>
                    </div>
                    
                    {/* Filter Tabs */}
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('news.filter_all', { defaultValue: 'Tudo' })}
                        </button>
                        <button 
                            onClick={() => setFilter('blog')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'blog' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('news.filter_blog', { defaultValue: 'Blog' })}
                        </button>
                        <button 
                            onClick={() => setFilter('news')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'news' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('news.filter_news', { defaultValue: 'Mundo' })}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                            <p className="text-sm text-slate-500 animate-pulse">{t('news.loading', { defaultValue: 'Carregando novidades...' })}</p>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto">
                            {/* Featured Article (First one) */}
                            {filter === 'all' && articles.length > 0 && (
                                <FeaturedCard article={articles[0]} />
                            )}

                            {/* Grid for the rest */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredArticles.slice(filter === 'all' ? 1 : 0).map((article, index) => (
                                    <React.Fragment key={article.id}>
                                        <NewsCard article={article} />
                                        {/* Insert Ad periodically */}
                                        {index === 2 && (
                                            <div className="sm:col-span-2 lg:col-span-3 bg-slate-800/20 rounded-2xl p-1 border border-white/5 overflow-hidden flex justify-center items-center min-h-[100px]">
                                                <AdSenseUnit
                                                    client="ca-pub-9015745232467355"
                                                    slot="4962199596"
                                                    format="auto"
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                            
                            {filteredArticles.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <p>{t('news.not_found', { defaultValue: 'Nenhum artigo encontrado nesta categoria.' })}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {selectedArticle && (
                <NewsReaderModal 
                    article={selectedArticle} 
                    onClose={() => setSelectedArticle(null)} 
                />
            )}
        </>
    );
};
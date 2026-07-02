
import React, { useEffect, useState } from 'react';
import { AdSenseUnit } from './AdSenseUnit';
import { useMapStore } from '../stores/mapStore';
import { useNewsStore } from '../stores/newsStore';
import { useUiStore } from '../stores/uiStore';
import { PublicMap } from './PublicMap';
import { Coordinates } from '../types';
import { LegalModal, LegalDocType } from './LegalModals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { AnimatedBackground } from './AnimatedBackground';
import { useTranslation } from 'react-i18next';

const getDateLocale = (lng: string) => {
  if (lng.startsWith('en')) return enUS;
  if (lng.startsWith('es')) return es;
  return ptBR;
};

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { venues, fetchVenues } = useMapStore();
  const { articles, fetchArticles } = useNewsStore();
  const { setActiveView } = useUiStore();
  const { t, i18n } = useTranslation();
  
  const [locating, setLocating] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [cityName, setCityName] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: -23.5505, lng: -46.6333 }); // Default SP
  
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);

  const fetchCityName = async (lat: number, lng: number) => {
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.state;
          if (city) {
              setCityName(city);
          }
      } catch (error) {
          console.error("Erro ao buscar nome da cidade:", error);
      }
  };

  useEffect(() => {
      fetchArticles();
      
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const { latitude, longitude } = position.coords;
                  const coords = { lat: latitude, lng: longitude };
                  setMapCenter(coords);
                  fetchVenues(coords);
                  fetchCityName(latitude, longitude); 
                  setLocationAllowed(true);
                  setLocating(false);
              },
              (error) => {
                  console.log("Location for Landing Page denied/error:", error);
                  fetchVenues();
                  setLocating(false);
                  setLocationAllowed(false);
              }
          );
      } else {
          fetchVenues();
          setLocating(false);
      }
  }, [fetchVenues, fetchArticles]);

  const handleOpenNews = () => {
      setActiveView('news');
  };

  return (
    <div className="min-h-screen text-white flex flex-col font-inter overflow-x-hidden selection:bg-primary-500 selection:text-white relative">
      {/* Global Animated Background */}
      <AnimatedBackground className="z-0" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="flex justify-between items-center p-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onEnter}>
                <img 
                    src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/Logo.png" 
                    alt="Logo Ponto G" 
                    className="h-9 w-auto object-contain drop-shadow-md"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                    }}
                />
                <div className="hidden items-center gap-3" style={{ display: 'none' }}>
                    <div className="w-9 h-9 bg-gradient-to-tr from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-primary-900/20">
                        G
                    </div>
                    <span className="font-outfit font-bold text-lg tracking-tight hidden sm:block">Ponto G</span>
                </div>
                
                {cityName && (
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 border border-white/10 rounded-full animate-fade-in">
                        <span className="material-symbols-rounded text-primary-500 text-sm filled animate-pulse">location_on</span>
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">{cityName}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button onClick={handleOpenNews} className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden md:block">News</button>
                <a href="#guide" className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden md:block">Guia Local</a>
                <button 
                    onClick={() => setShowLangModal(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white border border-white/5"
                    title={t('settings.language', { defaultValue: 'Idioma' })}
                >
                    <span className="material-symbols-rounded">language</span>
                </button>
                <button 
                    onClick={onEnter}
                    className="px-5 py-2 rounded-full bg-white text-dark-950 hover:bg-slate-200 transition-all font-bold text-sm shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-2"
                >
                    {t('landing.enter', { defaultValue: 'Entrar' })}
                    <span className="material-symbols-rounded text-lg">login</span>
                </button>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-16 px-6 flex flex-col items-center text-center z-10 min-h-[85vh] justify-center">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-8 animate-fade-in-up backdrop-blur-md shadow-xl">
            <span className={`w-2 h-2 rounded-full ${locationAllowed ? 'bg-green-500 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-yellow-500'} animate-pulse`}></span>
            {locationAllowed 
              ? t('landing.located_city', { defaultValue: 'Localizado: {{city}}', city: cityName || t('landing.your_region', { defaultValue: 'Sua Região' }) }) 
              : t('landing.enable_location_desc', { defaultValue: 'Ative a localização para ver sua cidade' })
            }
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-outfit tracking-tight mb-6 leading-[1] max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {cityName ? (
                <>
                    {t('landing.title_city_prefix', { defaultValue: 'A cena gay em' })}<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-secondary-500 to-indigo-500 animate-gradient-x">{cityName}.</span>
                </>
            ) : (
                <>
                    {t('landing.title_discover', { defaultValue: 'Descubra.' })}<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-secondary-500 to-indigo-500 animate-gradient-x">{t('landing.title_connect', { defaultValue: 'Conecte-se.' })}</span><br/>
                    {t('landing.title_live', { defaultValue: 'Viva.' })}
                </>
            )}
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up font-light drop-shadow-md" style={{ animationDelay: '0.2s' }}>
            {cityName 
                ? t('landing.desc_city', { city: cityName, defaultValue: `Encontros, saunas, festas e os melhores pontos de ${cityName}. Tudo no Ponto G.` })
                : t('landing.desc_default', { defaultValue: 'Muito mais que encontros. O Ponto G é o seu radar para as melhores saunas, bares e pessoas interessantes na sua região.' })
            }
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up w-full justify-center" style={{ animationDelay: '0.3s' }}>
            <button 
                onClick={onEnter}
                className="group relative px-8 py-4 bg-white text-dark-950 rounded-2xl font-bold text-lg hover:bg-slate-100 transition-all duration-300 active:scale-95 w-full sm:w-auto shadow-xl shadow-white/10"
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {cityName ? t('landing.view_map_city', { city: cityName, defaultValue: `Ver Mapa de ${cityName}` }) : t('landing.view_map_now', { defaultValue: 'Ver Mapa Agora' })}
                    <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform filled">map</span>
                </span>
            </button>
            <button 
                onClick={() => document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-slate-800/50 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all border border-white/5 w-full sm:w-auto backdrop-blur-md flex items-center justify-center gap-2"
            >
                <span className="material-symbols-rounded text-primary-500">place</span>
                {t('landing.local_highlights', { defaultValue: 'Destaques Locais' })}
            </button>
        </div>
      </header>

      {/* News Section */}
      <section id="news" className="py-20 px-6 bg-slate-900/30 backdrop-blur-sm border-t border-white/5 relative z-10">
          <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                  <div>
                      <h2 className="text-3xl md:text-4xl font-black font-outfit text-white mb-2 flex items-center gap-3">
                          <span className="material-symbols-rounded text-primary-500 text-4xl">newspaper</span>
                          {t('landing.news_title', { defaultValue: 'G News & Blog' })}
                      </h2>
                      <p className="text-slate-400 text-lg">
                          {t('landing.news_desc', { defaultValue: 'Fique por dentro do que rola na comunidade, cultura pop e dicas de saúde.' })}
                      </p>
                  </div>
                  <button 
                    onClick={handleOpenNews} 
                    className="text-primary-500 font-bold hover:text-primary-400 flex items-center gap-1 transition-colors"
                  >
                      {t('landing.view_all_news', { defaultValue: 'Ver todas as notícias' })}
                      <span className="material-symbols-rounded">arrow_forward</span>
                  </button>
              </div>

              {articles.length === 0 ? (
                  <div className="text-center text-slate-500 py-10 bg-slate-800/30 rounded-2xl border border-white/5">
                      <p>{t('landing.loading_news', { defaultValue: 'Carregando novidades...' })}</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {articles.slice(0, 3).map(article => (
                          <div 
                            key={article.id}
                            onClick={handleOpenNews}
                            className="group cursor-pointer bg-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all hover:-translate-y-1 shadow-lg"
                          >
                              <div className="relative aspect-video overflow-hidden">
                                  <img 
                                    src={article.image_url} 
                                    alt={article.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  />
                                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide border border-white/10">
                                      {article.type === 'blog' ? 'Blog' : 'News'}
                                  </div>
                              </div>
                              <div className="p-6">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center justify-between">
                                      <span>{article.source}</span>
                                      <span>{format(new Date(article.published_at), 'dd MMM', { locale: getDateLocale(i18n.language) })}</span>
                                  </p>
                                  <h3 className="text-xl font-bold text-white font-outfit mb-2 group-hover:text-primary-500 transition-colors leading-tight">
                                      {article.title}
                                  </h3>
                                  <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                                      {article.summary}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </section>

      {/* City Guide Section */}
      <section id="guide" className="py-20 px-6 bg-dark-900/50 backdrop-blur-md border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black font-outfit text-white mb-2 flex items-center gap-3">
                        <span className="material-symbols-rounded text-primary-500 filled text-4xl drop-shadow-lg">hub</span>
                        {locationAllowed ? t('landing.hotspots_city', { city: cityName || t('landing.your_area', { defaultValue: 'Sua Área' }), defaultValue: `Hotspots em ${cityName || 'Sua Área'}` }) : t('landing.hotspots_global', { defaultValue: 'Em Destaque Global' })}
                    </h2>
                    <p className="text-slate-400 text-lg">
                        {locationAllowed 
                            ? t('landing.hotspots_city_desc', { defaultValue: 'Encontramos estes locais incríveis perto de você.' }) 
                            : t('landing.hotspots_global_desc', { defaultValue: 'Explore os locais mais quentes avaliados pela nossa comunidade.' })}
                    </p>
                </div>
                {locating && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                        {t('common.locating', { defaultValue: 'Localizando...' })}
                    </div>
                )}
            </div>

            <div className="mb-12 animate-fade-in-up">
                <PublicMap 
                    venues={venues} 
                    center={mapCenter} 
                    cityName={cityName} 
                    onVenueClick={onEnter} 
                />
            </div>

            {venues.length === 0 && !locating ? (
                 <div className="text-center py-12 bg-slate-800/30 rounded-3xl border border-white/5">
                    <span className="material-symbols-rounded text-5xl text-slate-600 mb-4">explore_off</span>
                    <h3 className="text-xl font-bold text-white mb-2">{t('landing.no_venues_city_title', { defaultValue: 'Nenhum local cadastrado aqui ainda' })}</h3>
                    <p className="text-slate-400">{t('landing.no_venues_city_desc', { defaultValue: 'Seja o primeiro a adicionar um local entrando no app.' })}</p>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {venues.slice(0, 6).map((venue) => (
                        <div 
                            key={venue.id}
                            className="group relative bg-slate-800/80 backdrop-blur-md rounded-3xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-primary-900/20 transition-all duration-500 border border-white/5 transform hover:-translate-y-1"
                            onClick={onEnter}
                        >
                            <div className="relative aspect-[16/10] overflow-hidden">
                                <img 
                                    src={venue.image_url || 'https://placehold.co/600x400/1f2937/ffffff?text=Venue'} 
                                    alt={venue.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>
                                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wide border border-white/10 shadow-lg">
                                        {venue.type}
                                    </span>
                                    {venue.is_partner && (
                                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1 shadow-lg shadow-yellow-900/20">
                                            <span className="material-symbols-rounded text-[12px] filled">star</span> Top
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 relative">
                                <h3 className="text-2xl font-bold text-white font-outfit mb-2 group-hover:text-primary-500 transition-colors leading-tight">{venue.name}</h3>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                                    {venue.description}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                        <span className="material-symbols-rounded text-primary-500 text-sm">location_on</span>
                                        <span className="truncate max-w-[180px]">{venue.address}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-primary-600 transition-colors text-white">
                                        <span className="material-symbols-rounded text-lg">arrow_forward</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-16 p-8 md:p-12 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md rounded-[2rem] border border-white/5 text-center relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 font-outfit">{t('landing.city_not_on_map', { defaultValue: 'Sua cidade está no mapa?' })}</h3>
                    <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto leading-relaxed">
                        {t('landing.city_not_on_map_desc', { defaultValue: 'O Ponto G é construído pela comunidade. Entre agora para cadastrar saunas, bares e pontos de encontro na sua região.' })}
                    </p>
                    <button onClick={onEnter} className="px-8 py-4 bg-white text-dark-950 font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-lg active:scale-95">
                        {t('landing.add_venue', { defaultValue: 'Adicionar Local' })}
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-dark-950/80 backdrop-blur-xl relative z-10">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Column 1: Features Text */}
                  <div>
                      <span className="text-primary-500 font-bold tracking-widest uppercase text-xs mb-2 block">{t('landing.safety_community', { defaultValue: 'Segurança & Comunidade' })}</span>
                      <h2 className="text-3xl md:text-4xl font-black font-outfit text-white mb-6 leading-tight">
                          {t('landing.real_encounters', { defaultValue: 'Encontros reais com' })} <br/>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">{t('landing.total_discretion', { defaultValue: 'total discrição.' })}</span>
                      </h2>
                      <p className="text-slate-400 text-lg leading-relaxed mb-8">
                          {t('landing.safety_desc', { defaultValue: 'O Ponto G foi desenhado para a comunidade gay moderna. Priorizamos sua privacidade e segurança enquanto facilitamos conexões autênticas.' })}
                      </p>
                      
                      <div className="space-y-6">
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-green-400">
                                  <span className="material-symbols-rounded filled text-2xl">verified_user</span>
                              </div>
                              <div>
                                  <h4 className="text-white font-bold text-lg">{t('landing.safety_first', { defaultValue: 'Segurança em Primeiro Lugar' })}</h4>
                                  <p className="text-slate-400 text-sm leading-relaxed">
                                      {t('landing.safety_first_desc', { defaultValue: 'Ferramentas de denúncia, bloqueio e verificação de perfil.' })}
                                  </p>
                              </div>
                          </div>
                          {/* ... more items ... */}
                      </div>
                  </div>

                  {/* Column 2: Visual/Ad Placeholder */}
                  <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <span className="material-symbols-rounded text-6xl text-slate-700 mb-6">mobile_friendly</span>
                      <h3 className="text-2xl font-bold text-white mb-4">{t('landing.download_app', { defaultValue: 'Baixe o App (PWA)' })}</h3>
                      <p className="text-slate-400 mb-8 max-w-md">
                          {t('landing.download_app_desc', { defaultValue: 'Para a melhor experiência, instale o Ponto G na tela inicial do seu celular.' })}
                      </p>
                      <div className="w-full max-w-xs relative group">
                           <img 
                                src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/Logo.png"
                                alt="Ponto G App"
                                className="relative w-full h-auto rounded-xl shadow-2xl border border-white/10 transform transition-transform duration-500 hover:scale-[1.02]"
                           />
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-dark-950/90 backdrop-blur-xl text-slate-400 text-sm relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <img 
                            src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/Logo.png" 
                            alt="Logo Ponto G" 
                            className="h-10 w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                            }}
                        />
                        <div className="hidden items-center gap-2" style={{ display: 'none' }}>
                            <div className="w-8 h-8 bg-gradient-to-tr from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center font-black text-white text-lg">G</div>
                            <span className="font-outfit font-black text-2xl text-white">Ponto G</span>
                        </div>
                    </div>
                    <p className="text-slate-500 leading-relaxed max-w-xs">
                        {t('landing.footer_desc', { defaultValue: 'A plataforma mais completa para encontros e estilo de vida gay.' })}
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">{t('legal.legal', { defaultValue: 'Legal' })}</h4>
                    <ul className="space-y-2">
                        <li><button onClick={() => setActiveLegalDoc('terms')} className="hover:text-primary-500 transition-colors text-left">{t('legal.terms', { defaultValue: 'Termos de Uso' })}</button></li>
                        <li><button onClick={() => setActiveLegalDoc('privacy')} className="hover:text-primary-500 transition-colors text-left">{t('legal.privacy', { defaultValue: 'Política de Privacidade' })}</button></li>
                        <li><button onClick={() => setActiveLegalDoc('guidelines')} className="hover:text-primary-500 transition-colors text-left">{t('legal.guidelines', { defaultValue: 'Diretrizes' })}</button></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">{t('settings.language', { defaultValue: 'Idioma' })}</h4>
                    <div className="flex gap-2">
                        <button onClick={() => i18n.changeLanguage('pt')} className={`w-10 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${i18n.language === 'pt' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>PT</button>
                        <button onClick={() => i18n.changeLanguage('en')} className={`w-10 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${i18n.language === 'en' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>EN</button>
                        <button onClick={() => i18n.changeLanguage('es')} className={`w-10 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${i18n.language === 'es' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>ES</button>
                    </div>
                </div>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs opacity-50">© 2024 Ponto G. {t('legal.all_rights', { defaultValue: 'Todos os direitos reservados.' })}</p>
            </div>
        </div>
      </footer>
      
      {/* Language Modal */}
      {showLangModal && (
          <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4" onClick={() => setShowLangModal(false)}>
              <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <header className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="material-symbols-rounded text-primary-500">language</span>
                          {t('settings.language', { defaultValue: 'Idioma' })}
                      </h2>
                      <button onClick={() => setShowLangModal(false)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                          <span className="material-symbols-rounded">close</span>
                      </button>
                  </header>
                  <div className="p-4 space-y-2">
                      <button onClick={() => { i18n.changeLanguage('pt'); setShowLangModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${i18n.language === 'pt' ? 'bg-primary-500/20 border border-primary-500/50' : 'bg-slate-800 hover:bg-slate-700 border border-transparent'}`}>
                          <span className="font-bold text-white flex items-center gap-3">
                              <span className="text-xl">🇧🇷</span> Português
                          </span>
                          {i18n.language === 'pt' && <span className="material-symbols-rounded text-primary-500">check_circle</span>}
                      </button>
                      <button onClick={() => { i18n.changeLanguage('en'); setShowLangModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${i18n.language === 'en' ? 'bg-primary-500/20 border border-primary-500/50' : 'bg-slate-800 hover:bg-slate-700 border border-transparent'}`}>
                          <span className="font-bold text-white flex items-center gap-3">
                              <span className="text-xl">🇺🇸</span> English
                          </span>
                          {i18n.language === 'en' && <span className="material-symbols-rounded text-primary-500">check_circle</span>}
                      </button>
                      <button onClick={() => { i18n.changeLanguage('es'); setShowLangModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${i18n.language === 'es' ? 'bg-primary-500/20 border border-primary-500/50' : 'bg-slate-800 hover:bg-slate-700 border border-transparent'}`}>
                          <span className="font-bold text-white flex items-center gap-3">
                              <span className="text-xl">🇪🇸</span> Español
                          </span>
                          {i18n.language === 'es' && <span className="material-symbols-rounded text-primary-500">check_circle</span>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Legal Modals */}
      {activeLegalDoc && (
          <LegalModal 
            type={activeLegalDoc} 
            onClose={() => setActiveLegalDoc(null)} 
          />
      )}
    </div>
  );
};

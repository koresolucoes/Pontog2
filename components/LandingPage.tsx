import React, { useEffect, useState } from 'react';
import { AdSenseUnit } from './AdSenseUnit';
import { useMapStore } from '../stores/mapStore';
import { useNewsStore } from '../stores/newsStore';
import { useAdStore } from '../stores/adStore';
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
import { PartyAtmosphere3D } from './PartyAtmosphere3D';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  MapPin, 
  Languages, 
  LogIn, 
  Map, 
  Compass, 
  MessageSquare, 
  Shield, 
  Activity, 
  Lock, 
  Unlock, 
  UserCheck, 
  BadgeCheck, 
  Newspaper, 
  ArrowRight, 
  Check, 
  Smartphone, 
  Star, 
  X,
  Compass as RadarIcon
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'agora' | 'map' | 'private' | 'verify'>('agora');

  // Interactive mock simulation state for the tabs
  const [isLocked, setIsLocked] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

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
      useAdStore.getState().fetchAds();
      
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
    <div className="min-h-screen text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-pink-600 selection:text-white relative bg-[#04050a]">
      {/* 3D Interactive Party Canvas & Animated Blending Background */}
      <PartyAtmosphere3D />
      <AnimatedBackground className="z-[-1] opacity-60" />

      {/* Floating Top Glow line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-80 z-50"></div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#04050a]/80 backdrop-blur-3xl border-b border-white/5 transition-all duration-300">
        <div className="flex justify-between items-center p-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onEnter}>
                <img 
                    src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/logo.png" 
                    alt="Logo Ponto G" 
                    className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                    }}
                />
                <div className="hidden items-center gap-3" style={{ display: 'none' }}>
                    <div className="w-10 h-10 bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-pink-900/40 border border-white/10">
                        G
                    </div>
                    <span className="font-syne font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">Ponto G</span>
                </div>
                
                {cityName && (
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full shadow-lg shadow-pink-500/5">
                        <MapPin className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                        <span className="text-xs font-space font-bold text-pink-300 uppercase tracking-wider">{cityName}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-6">
                <button onClick={handleOpenNews} className="text-sm font-space font-medium text-slate-300 hover:text-pink-400 hover:scale-105 transition-all hidden md:block">News & Blog</button>
                <a href="#guide" className="text-sm font-space font-medium text-slate-300 hover:text-pink-400 hover:scale-105 transition-all hidden md:block">{t('landing.local_highlights', { defaultValue: 'Guia Local' })}</a>
                <button 
                    onClick={() => setShowLangModal(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 hover:text-pink-400 transition-colors text-slate-300 border border-white/5"
                    title={t('settings.language', { defaultValue: 'Idioma' })}
                >
                    <Languages className="w-4 h-4" />
                </button>
                <button 
                    onClick={onEnter}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all font-space font-bold text-sm shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center gap-2 border border-white/10"
                >
                    {t('landing.enter', { defaultValue: 'Entrar' })}
                    <LogIn className="w-4 h-4" />
                </button>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-36 pb-20 px-6 flex flex-col items-center text-center z-10 min-h-[95vh] justify-center max-w-7xl mx-auto w-full">
        {/* Soft neon gradient orbs behind text */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full filter blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[150px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[10px] font-space font-bold uppercase tracking-widest mb-8 shadow-[0_0_15px_rgba(236,72,153,0.15)] backdrop-blur-md"
        >
            <span className={`w-2 h-2 rounded-full ${locationAllowed ? 'bg-green-500 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]'} animate-pulse`}></span>
            {locationAllowed 
              ? t('landing.located_city', { defaultValue: 'Localizado: {{city}}', city: cityName || t('landing.your_region', { defaultValue: 'Sua Região' }) }) 
              : t('landing.enable_location_desc', { defaultValue: 'Ative a localização para ver sua cidade' })
            }
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-8xl lg:text-9xl font-syne font-black tracking-tighter mb-8 leading-[0.9] max-w-5xl mx-auto select-none"
        >
            {cityName ? (
                <>
                    <span className="text-slate-400 text-2xl md:text-4xl font-space font-bold tracking-widest uppercase block mb-3">{t('landing.title_city_prefix', { defaultValue: 'A cena gay em' })}</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-400 drop-shadow-[0_0_35px_rgba(236,72,153,0.2)]">
                      {cityName}.
                    </span>
                </>
            ) : (
                <>
                    <span className="text-slate-100 font-bold">{t('landing.title_discover', { defaultValue: 'Descubra.' })}</span><br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-400 drop-shadow-[0_0_35px_rgba(236,72,153,0.25)]">{t('landing.title_connect', { defaultValue: 'Conecte-se.' })}</span><br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{t('landing.title_live', { defaultValue: 'Viva.' })}</span>
                </>
            )}
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-2xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed font-normal drop-shadow-md px-4"
        >
            {cityName 
                ? t('landing.desc_city', { city: cityName, defaultValue: `Encontros rápidos, saunas, festas vibrantes e os hotspots gays mais quentes de ${cityName}. Tudo com total discrição no Ponto G.` })
                : t('landing.desc_default', { defaultValue: 'Muito mais que encontros. O Ponto G é o seu radar definitivo para as melhores saunas, bares, baladas, áreas de cruising e conexões autênticas ao seu redor.' })
            }
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center px-4"
        >
            <button 
                onClick={onEnter}
                className="group relative px-8 py-4.5 bg-white text-slate-950 rounded-2xl font-space font-bold text-lg hover:scale-[1.03] transition-all duration-300 active:scale-95 w-full sm:w-auto shadow-[0_0_35px_rgba(255,255,255,0.25)] overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center justify-center gap-3">
                    {cityName ? t('landing.view_map_city', { city: cityName, defaultValue: `Explorar ${cityName}` }) : t('landing.view_map_now', { defaultValue: 'Explorar Mapa Agora' })}
                    <Map className="w-5 h-5 group-hover:translate-x-1.5 transition-transform text-pink-500 fill-pink-500" />
                </span>
            </button>
            <button 
                onClick={() => document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth' })}
                className="group px-8 py-4.5 bg-white/5 text-white hover:text-pink-400 rounded-2xl font-space font-bold text-lg hover:bg-white/10 transition-all border border-white/10 w-full sm:w-auto backdrop-blur-md flex items-center justify-center gap-2 shadow-2xl"
            >
                <MapPin className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
                {t('landing.local_highlights', { defaultValue: 'Destaques Locais' })}
            </button>
        </motion.div>

        {/* Live Interactive Stats Counter with futuristic space details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto w-full px-4"
        >
            <div className="bg-[#0b0e1e]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 shadow-xl group cursor-pointer" onClick={onEnter}>
                <div className="flex justify-center mb-3 text-pink-500 group-hover:scale-110 transition-transform">
                    <Activity className="w-8 h-8 text-pink-500 animate-pulse" />
                </div>
                <div className="text-3xl font-space font-bold text-white group-hover:text-pink-400 transition-colors">
                    1.420+
                </div>
                <div className="text-[10px] text-slate-400 font-space font-bold uppercase tracking-widest mt-1.5">
                    {t('landing.stats_online', { defaultValue: 'Ativos Hoje' })}
                </div>
            </div>
            
            <div className="bg-[#0b0e1e]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 shadow-xl group cursor-pointer" onClick={onEnter}>
                <div className="flex justify-center mb-3 text-purple-500 group-hover:scale-110 transition-transform">
                    <Map className="w-8 h-8 text-purple-500" />
                </div>
                <div className="text-3xl font-space font-bold text-white group-hover:text-purple-400 transition-colors">
                    480+
                </div>
                <div className="text-[10px] text-slate-400 font-space font-bold uppercase tracking-widest mt-1.5">
                    {t('landing.stats_venues', { defaultValue: 'Pontos Mapeados' })}
                </div>
            </div>

            <div className="bg-[#0b0e1e]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 shadow-xl group cursor-pointer" onClick={onEnter}>
                <div className="flex justify-center mb-3 text-indigo-400 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="text-3xl font-space font-bold text-white group-hover:text-indigo-400 transition-colors">
                    25+
                </div>
                <div className="text-[10px] text-slate-400 font-space font-bold uppercase tracking-widest mt-1.5">
                    {t('landing.stats_communities', { defaultValue: 'Comunidades' })}
                </div>
            </div>

            <div className="bg-[#0b0e1e]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-green-400/30 transition-all duration-300 shadow-xl group cursor-pointer" onClick={onEnter}>
                <div className="flex justify-center mb-3 text-green-400 group-hover:scale-110 transition-transform">
                    <Shield className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-3xl font-space font-bold text-white group-hover:text-green-400 transition-colors">
                    100%
                </div>
                <div className="text-[10px] text-slate-400 font-space font-bold uppercase tracking-widest mt-1.5">
                    {t('landing.stats_discrete', { defaultValue: 'Seguro & Privado' })}
                </div>
            </div>
        </motion.div>
      </header>

      {/* INTERACTIVE PLATFORM SHOWCASE (Bento Grid) with Premium Typography & Icons */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-[#060812]/50 to-[#04050a] relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-pink-500 font-space font-bold tracking-widest uppercase text-xs mb-2 block">{t('landing.safety_community', { defaultValue: 'RECURSOS DE ELITE' })}</span>
            <h2 className="text-4xl md:text-6xl font-syne font-black tracking-tight text-white mb-4 leading-tight">
              Explore o Novo Ecossistema do Ponto G
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-normal">
              Desenvolvemos funcionalidades avançadas para que você se conecte com rapidez, total segurança e controle absoluto de privacidade.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Interactive Feature Controls */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-4">
              <button 
                onClick={() => setActiveTab('agora')}
                className={`w-full text-left p-5 rounded-2xl transition-all border flex items-center gap-4 ${activeTab === 'agora' ? 'bg-gradient-to-r from-pink-500/10 to-transparent border-pink-500/40 shadow-lg shadow-pink-500/5' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${activeTab === 'agora' ? 'bg-pink-500 text-white border-pink-400 shadow-lg shadow-pink-500/30' : 'bg-slate-900 text-pink-500 border-white/5'}`}>
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-space font-bold text-lg flex items-center gap-2">
                    Modo Agora (Instant Now 🔥)
                  </h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed font-normal">Encontros instantâneos com posts de destaque ativos por exatamente 1 hora.</p>
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('map')}
                className={`w-full text-left p-5 rounded-2xl transition-all border flex items-center gap-4 ${activeTab === 'map' ? 'bg-gradient-to-r from-purple-500/10 to-transparent border-purple-500/40 shadow-lg shadow-purple-500/5' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${activeTab === 'map' ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/30' : 'bg-slate-900 text-purple-500 border-white/5'}`}>
                  <Map className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-space font-bold text-lg">Guia de Hotspots & Check-in</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed font-normal">Mapa interativo com cálculo de distância e presença ao vivo nos locais parceiros.</p>
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('private')}
                className={`w-full text-left p-5 rounded-2xl transition-all border flex items-center gap-4 ${activeTab === 'private' ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${activeTab === 'private' ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30' : 'bg-slate-900 text-indigo-500 border-white/5'}`}>
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-space font-bold text-lg">Álbuns Privados com Senha</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed font-normal">Proteja suas fotos íntimas e conceda acesso apenas a quem você escolher.</p>
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('verify')}
                className={`w-full text-left p-5 rounded-2xl transition-all border flex items-center gap-4 ${activeTab === 'verify' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${activeTab === 'verify' ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-slate-900 text-cyan-400 border-white/5'}`}>
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-space font-bold text-lg">Verificação Biométrica Inteligente</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed font-normal">Selo azul verificado por IA cruzando biometria facial com foto de perfil.</p>
                </div>
              </button>
            </div>

            {/* Right Column: Animated Tab Previews with High-tech Party visuals */}
            <div className="lg:col-span-7 bg-[#0b0e1f]/80 backdrop-blur-2xl rounded-3xl border border-white/5 p-8 flex items-center justify-center relative overflow-hidden min-h-[400px] shadow-2xl">
              <div className="absolute top-[-50px] right-[-50px] w-80 h-80 bg-pink-500/10 rounded-full filter blur-[80px] pointer-events-none"></div>
              <div className="absolute bottom-[-50px] left-[-50px] w-80 h-80 bg-purple-500/10 rounded-full filter blur-[80px] pointer-events-none"></div>

              <AnimatePresence mode="wait">
                {activeTab === 'agora' && (
                  <motion.div 
                    key="agora"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex flex-col items-center max-w-sm text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-pink-500/20 border-2 border-pink-500/50 rounded-full flex items-center justify-center text-pink-500 shadow-lg shadow-pink-500/20">
                        <Flame className="w-12 h-12 animate-pulse" />
                      </div>
                      <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-space font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#04050a] animate-bounce">
                        Ativo
                      </div>
                    </div>
                    <h3 className="text-2xl font-syne font-black text-white mb-2">QUEM QUER AGORA? 🔥</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed font-normal">
                      Ao postar no Modo Agora, sua foto aparece em destaque absoluto no topo para todos da região. Mas seja rápido: o contador decresce e o post se autodestrói em exatos 60 minutos!
                    </p>
                    <div className="w-full bg-slate-900 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                      <span className="text-xs font-space font-bold text-slate-400">Tempo Restante:</span>
                      <div className="flex gap-2 text-pink-400 font-mono font-black text-lg animate-pulse">
                        <span>59</span>
                        <span>:</span>
                        <span>24</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'map' && (
                  <motion.div 
                    key="map"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex flex-col items-center max-w-md text-center"
                  >
                    <div className="w-20 h-20 bg-purple-500/20 border-2 border-purple-500/50 rounded-full flex items-center justify-center text-purple-500 mb-6 shadow-lg shadow-purple-500/20">
                      <MapPin className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-syne font-black text-white mb-2">RADAR DE HOTSPOTS 🗺️</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed font-normal">
                      Encontre saunas, bares, cinemas, pontos de cruising e baladas com indicação de distância em tempo real. E saiba exatamente quais estabelecimentos parceiros têm pessoas no local com o recurso Check-in Seguro.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="bg-[#04050a] p-3.5 rounded-xl border border-white/5 text-left">
                        <div className="text-[10px] text-purple-400 font-space font-bold uppercase mb-1">Thermas Paris (Sauna)</div>
                        <div className="text-sm font-space font-bold text-white flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 text-purple-400" /> 0.8 km
                        </div>
                      </div>
                      <div className="bg-[#04050a] p-3.5 rounded-xl border border-white/5 text-left">
                        <div className="text-[10px] text-green-400 font-space font-bold uppercase mb-1">Presença ao Vivo</div>
                        <div className="text-sm font-space font-bold text-white flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-green-400" /> 18 presentes
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'private' && (
                  <motion.div 
                    key="private"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex flex-col items-center max-w-sm text-center"
                  >
                    <button 
                      onClick={() => setIsLocked(!isLocked)}
                      className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 transition-all duration-500 ${isLocked ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10' : 'bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/10'}`}
                    >
                      {isLocked ? <Lock className="w-9 h-9" /> : <Unlock className="w-9 h-9" />}
                    </button>
                    <h3 className="text-2xl font-syne font-black text-white mb-2">ÁLBUM PRIVADO SEGURO 🔒</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed font-normal">
                      Sua privacidade é inegociável. Publique fotos do dia a dia no álbum público, mas reserve fotos mais quentes em seu Álbum Privado protegido por chave. Outros usuários só visualizam se você aceitar o convite!
                    </p>
                    <button 
                      onClick={() => setIsLocked(!isLocked)}
                      className="px-5 py-2.5 bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-space font-bold text-xs rounded-xl hover:bg-indigo-600/50 transition-colors"
                    >
                      {isLocked ? 'Simular Desbloqueio' : 'Simular Bloqueio'}
                    </button>
                  </motion.div>
                )}

                {activeTab === 'verify' && (
                  <motion.div 
                    key="verify"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex flex-col items-center max-w-sm text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-cyan-500/20 border-2 border-cyan-500/50 rounded-full flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
                        {isVerifying ? (
                          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          isVerified ? <BadgeCheck className="w-12 h-12 text-cyan-400" /> : <UserCheck className="w-12 h-12 text-cyan-400" />
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-syne font-black text-white mb-2">BIOMETRIA COM IA (SELO AZUL 👑)</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed font-normal">
                      Diga adeus aos perfis fakes. O Ponto G utiliza captura biométrica facial em tempo real no próprio navegador (face-api.js) cruzada com análise de inteligência artificial (Gemini) para confirmar sua identidade e liberar seu selo azul de verificação de elite.
                    </p>
                    <button 
                      disabled={isVerifying}
                      onClick={() => {
                        setIsVerifying(true);
                        setTimeout(() => {
                          setIsVerifying(false);
                          setIsVerified(true);
                        }, 2000);
                      }}
                      className="px-5 py-2.5 bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 font-space font-bold text-xs rounded-xl hover:bg-cyan-600/50 transition-colors disabled:opacity-50"
                    >
                      {isVerified ? 'Perfil Verificado ✓' : 'Testar Scanner de Face'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="py-24 px-6 bg-[#04050a] relative z-10">
          <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                  <div>
                      <h2 className="text-3xl md:text-5xl font-syne font-black tracking-tight text-white mb-2 flex items-center gap-3">
                          <Newspaper className="w-9 h-9 text-pink-500" />
                          {t('landing.news_title', { defaultValue: 'G News & Blog' })}
                      </h2>
                      <p className="text-slate-400 text-lg font-normal">
                          {t('landing.news_desc', { defaultValue: 'Fique por dentro do que rola na comunidade gay, cultura pop, saúde, dicas de prevenção e entretenimento.' })}
                      </p>
                  </div>
                  <button 
                    onClick={handleOpenNews} 
                    className="text-pink-500 font-space font-bold hover:text-pink-400 flex items-center gap-1 transition-colors text-sm hover:scale-105"
                  >
                      {t('landing.view_all_news', { defaultValue: 'Ver todas as notícias' })}
                      <ArrowRight className="w-4 h-4" />
                  </button>
              </div>

              {articles.length === 0 ? (
                  <div className="text-center text-slate-500 py-16 bg-[#0b0e1f]/50 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm font-space font-bold">{t('landing.loading_news', { defaultValue: 'Buscando novidades do radar...' })}</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {articles.slice(0, 3).map(article => (
                          <div 
                            key={article.id}
                            onClick={handleOpenNews}
                            className="group cursor-pointer bg-[#0b0e1f]/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 hover:border-pink-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                          >
                              <div className="relative aspect-video overflow-hidden">
                                  <img 
                                    src={article.image_url} 
                                    alt={article.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  />
                                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-white text-[10px] font-space font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-white/10 shadow-lg">
                                      {article.type === 'blog' ? 'Blog' : 'News'}
                                  </div>
                              </div>
                              <div className="p-6">
                                  <div className="text-[10px] text-slate-400 font-space font-bold uppercase mb-3 flex items-center justify-between">
                                      <span>{article.source}</span>
                                      <span>{format(new Date(article.published_at), 'dd MMM', { locale: getDateLocale(i18n.language) })}</span>
                                  </div>
                                  <h3 className="text-lg font-space font-bold text-white mb-2.5 group-hover:text-pink-500 transition-colors leading-snug">
                                      {article.title}
                                  </h3>
                                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed font-normal">
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
      <section id="guide" className="py-24 px-6 bg-[#060812]/90 backdrop-blur-md border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-syne font-black tracking-tight text-white mb-2 flex items-center gap-3">
                        <Compass className="w-9 h-9 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.4)]" />
                        {locationAllowed ? t('landing.hotspots_city', { city: cityName || t('landing.your_area', { defaultValue: 'Sua Área' }), defaultValue: `Hotspots em ${cityName || 'Sua Área'}` }) : t('landing.hotspots_global', { defaultValue: 'Hotspots Globais em Destaque' })}
                    </h2>
                    <p className="text-slate-400 text-lg font-normal">
                        {locationAllowed 
                            ? t('landing.hotspots_city_desc', { defaultValue: 'Estes são os locais mais comentados e movimentados bem perto de você.' }) 
                            : t('landing.hotspots_global_desc', { defaultValue: 'Explore os principais hotspots cadastrados e avaliados pela comunidade do Ponto G.' })}
                    </p>
                </div>
                {locating && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-900/50 px-4 py-2 border border-white/5 rounded-full">
                        <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-space font-bold text-xs uppercase tracking-wider">{t('common.locating', { defaultValue: 'Rastreando cena local...' })}</span>
                    </div>
                )}
            </div>

            <div className="mb-14 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-pink-500/5 relative">
                <PublicMap 
                    venues={venues} 
                    center={mapCenter} 
                    cityName={cityName} 
                    onVenueClick={onEnter} 
                />
            </div>

            {venues.length === 0 && !locating ? (
                 <div className="text-center py-16 bg-[#0b0e1f]/30 rounded-3xl border border-white/5">
                    <RadarIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-space font-bold text-white mb-2">{t('landing.no_venues_city_title', { defaultValue: 'Ainda sem locais cadastrados aqui' })}</h3>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed font-normal">{t('landing.no_venues_city_desc', { defaultValue: 'Seja o pioneiro! Cadastre saunas, clubes, bares e pontos de encontro da sua região.' })}</p>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {venues.slice(0, 6).map((venue) => (
                        <div 
                            key={venue.id}
                            className="group relative bg-[#0b0e1f]/50 backdrop-blur-md rounded-[2rem] overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-500 border border-white/5 transform hover:-translate-y-1"
                            onClick={onEnter}
                        >
                            <div className="relative aspect-[16/10] overflow-hidden">
                                <img 
                                    src={venue.image_url || 'https://placehold.co/600x400/1f2937/ffffff?text=Venue'} 
                                    alt={venue.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1f] via-transparent to-transparent opacity-90"></div>
                                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                    <span className="bg-black/80 backdrop-blur-md text-white text-[10px] font-space font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-white/10 shadow-lg">
                                        {venue.type}
                                    </span>
                                    {venue.is_partner && (
                                        <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] font-space font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-yellow-900/20">
                                            <Star className="w-3 h-3 text-black fill-black" /> Parcerias G
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 relative">
                                <h3 className="text-2xl font-syne font-black text-white mb-2 group-hover:text-pink-500 transition-colors leading-tight">{venue.name}</h3>
                                <p className="text-slate-400 text-sm mb-5 line-clamp-2 leading-relaxed font-normal">
                                    {venue.description}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                        <MapPin className="w-3.5 h-3.5 text-pink-500" />
                                        <span className="truncate max-w-[180px]">{venue.address}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-pink-600 transition-colors text-white">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-20 p-8 md:p-14 bg-gradient-to-br from-[#0c0f22]/80 to-[#080b18]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-pink-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                    <h3 className="text-2xl md:text-4xl font-syne font-black text-white mb-4">{t('landing.city_not_on_map', { defaultValue: 'Sua cidade ainda não está mapeada?' })}</h3>
                    <p className="text-slate-400 text-base mb-8 max-w-xl mx-auto leading-relaxed font-normal">
                        {t('landing.city_not_on_map_desc', { defaultValue: 'O Ponto G é alimentado de forma colaborativa pela nossa comunidade gay de elite. Cadastre-se agora de graça para inserir saunas, cinemas, bares e pontos de cruising na sua região.' })}
                    </p>
                    <button onClick={onEnter} className="px-8 py-4 bg-white text-slate-950 font-space font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-lg active:scale-95 text-sm uppercase tracking-wider">
                        {t('landing.add_venue', { defaultValue: 'Adicionar Local de Encontro' })}
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* Safety & Premium Features Section with Modern Typography & Icons */}
      <section className="py-24 px-6 bg-[#04050a] relative z-10 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  {/* Column 1: Custom Copy Grid */}
                  <div>
                      <span className="text-pink-500 font-space font-bold tracking-widest uppercase text-xs mb-2 block">{t('landing.safety_community', { defaultValue: 'Segurança & Discrição Pessoal' })}</span>
                      <h2 className="text-4xl md:text-6xl font-syne font-black text-white mb-6 leading-none tracking-tight">
                          {t('landing.real_encounters', { defaultValue: 'Conexões reais com' })} <br/>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">{t('landing.total_discretion', { defaultValue: 'total discrição.' })}</span>
                      </h2>
                      <p className="text-slate-400 text-lg leading-relaxed mb-10 font-normal">
                          {t('landing.safety_desc', { defaultValue: 'Desenvolvemos o Ponto G sob rígidos protocolos de privacidade. Você decide quem vê suas fotos de álbum, se comunica com fotos autodestrutivas de visualização única, e garante conversas livres de fakes ou bots.' })}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-green-400 shadow-lg">
                                  <Shield className="w-6 h-6 text-green-400" />
                              </div>
                              <div>
                                  <h4 className="text-white font-space font-bold text-base">{t('landing.safety_first', { defaultValue: 'Foco na Segurança' })}</h4>
                                  <p className="text-slate-400 text-xs leading-relaxed mt-1 font-normal">
                                      {t('landing.safety_first_desc', { defaultValue: 'Sistemas inteligentes de denúncia, bloqueio completo instantâneo e canais criptografados.' })}
                                  </p>
                              </div>
                          </div>
                          
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-pink-500 shadow-lg">
                                  <Lock className="w-6 h-6 text-pink-500" />
                              </div>
                              <div>
                                  <h4 className="text-white font-space font-bold text-base">{t('landing.private_albums', { defaultValue: 'Álbuns Privados' })}</h4>
                                  <p className="text-slate-400 text-xs leading-relaxed mt-1 font-normal">
                                      {t('landing.private_albums_desc', { defaultValue: 'Apenas os contatos aceitos por você terão acesso às suas fotos mais íntimas.' })}
                                  </p>
                              </div>
                          </div>

                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-amber-500 shadow-lg">
                                  <Flame className="w-6 h-6 text-amber-500" />
                              </div>
                              <div>
                                  <h4 className="text-white font-space font-bold text-base">{t('landing.instant_now', { defaultValue: 'Modo Agora 🔥' })}</h4>
                                  <p className="text-slate-400 text-xs leading-relaxed mt-1 font-normal">
                                      {t('landing.instant_now_desc', { defaultValue: 'Destaque-se no radar local por 1 hora e faça conexões imediatas.' })}
                                  </p>
                              </div>
                          </div>

                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-blue-400 shadow-lg">
                                  <Compass className="w-6 h-6 text-blue-400" />
                              </div>
                              <div>
                                  <h4 className="text-white font-space font-bold text-base">{t('landing.live_radar', { defaultValue: 'Radar Ativo' })}</h4>
                                  <p className="text-slate-400 text-xs leading-relaxed mt-1 font-normal">
                                      {t('landing.live_radar_desc', { defaultValue: 'Rastreamento de hotspots com distâncias reais e confirmação de check-in.' })}
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Column 2: Gorgeous Mobile Presentation Mockup */}
                  <div className="bg-gradient-to-br from-[#0c0f24] to-[#060814] p-10 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                      <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-pink-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>
                      <Smartphone className="w-14 h-14 text-pink-500 mb-6 animate-bounce" />
                      <h3 className="text-2xl md:text-3xl font-syne font-black text-white mb-3">{t('landing.download_app', { defaultValue: 'Ponto G no seu Celular' })}</h3>
                      <p className="text-slate-400 mb-8 max-w-sm text-sm leading-relaxed font-normal">
                          {t('landing.download_app_desc', { defaultValue: 'O Ponto G foi desenvolvido como um Progressive Web App (PWA). Instale diretamente na sua tela inicial sem gastar memória da App Store.' })}
                      </p>
                      
                      <button 
                        onClick={onEnter}
                        className="w-full max-w-xs group relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl shadow-pink-500/5 cursor-pointer hover:scale-[1.01] transition-transform duration-500"
                      >
                           <img 
                                src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/logo.png"
                                alt="Ponto G App Logo"
                                className="w-28 h-28 mx-auto object-contain drop-shadow-[0_0_20px_rgba(236,72,153,0.3)] mb-4"
                           />
                           <div className="bg-white/5 py-3 text-slate-300 font-space font-bold text-xs uppercase tracking-wider group-hover:bg-pink-600 group-hover:text-white transition-colors">
                               Adicionar à Tela de Início
                           </div>
                      </button>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5 bg-[#020204] text-slate-400 text-sm relative z-10">
        <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <img 
                            src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/logo.png" 
                            alt="Logo Ponto G" 
                            className="h-10 w-auto object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                            }}
                        />
                        <div className="hidden items-center gap-2" style={{ display: 'none' }}>
                            <div className="w-8 h-8 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-lg flex items-center justify-center font-black text-white text-lg">G</div>
                            <span className="font-syne font-black text-2xl text-white">Ponto G</span>
                        </div>
                    </div>
                    <p className="text-slate-500 leading-relaxed max-w-sm font-normal">
                        {t('landing.footer_desc', { defaultValue: 'A plataforma gay em tempo real mais veloz, discreta e completa para encontros, hotspots e estilo de vida.' })}
                    </p>
                </div>
                <div>
                    <h4 className="font-space font-bold text-slate-200 mb-4 uppercase text-xs tracking-widest">{t('legal.legal', { defaultValue: 'Documentos' })}</h4>
                    <ul className="space-y-3 font-space font-medium text-slate-500">
                        <li><button onClick={() => setActiveLegalDoc('terms')} className="hover:text-pink-500 transition-colors text-left">{t('legal.terms', { defaultValue: 'Termos de Uso' })}</button></li>
                        <li><button onClick={() => setActiveLegalDoc('privacy')} className="hover:text-pink-500 transition-colors text-left">{t('legal.privacy', { defaultValue: 'Política de Privacidade' })}</button></li>
                        <li><button onClick={() => setActiveLegalDoc('guidelines')} className="hover:text-pink-500 transition-colors text-left">{t('legal.guidelines', { defaultValue: 'Diretrizes de Comunidade' })}</button></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-space font-bold text-slate-200 mb-4 uppercase text-xs tracking-widest">{t('settings.language', { defaultValue: 'Selecionar Idioma' })}</h4>
                    <div className="flex gap-2.5">
                        <button onClick={() => i18n.changeLanguage('pt')} className={`w-11 h-9 rounded-xl flex items-center justify-center font-space font-bold text-xs border ${i18n.language === 'pt' ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-500/20' : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'}`}>PT</button>
                        <button onClick={() => i18n.changeLanguage('en')} className={`w-11 h-9 rounded-xl flex items-center justify-center font-space font-bold text-xs border ${i18n.language === 'en' ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-500/20' : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'}`}>EN</button>
                        <button onClick={() => i18n.changeLanguage('es')} className={`w-11 h-9 rounded-xl flex items-center justify-center font-space font-bold text-xs border ${i18n.language === 'es' ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-500/20' : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'}`}>ES</button>
                    </div>
                </div>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600">
                <p className="text-xs font-space font-medium">© 2026 Ponto G. {t('legal.all_rights', { defaultValue: 'Todos os direitos reservados.' })}</p>
                <div className="flex items-center gap-1.5 text-xs font-space font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span>Todos os sistemas online</span>
                </div>
            </div>
        </div>
      </footer>
      
      {/* Language Modal */}
      {showLangModal && (
          <div className="fixed inset-0 bg-[#04050a]/95 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in p-4" onClick={() => setShowLangModal(false)}>
              <div className="bg-[#0b0e1f] rounded-3xl shadow-2xl w-full max-w-sm border border-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <header className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                      <h2 className="text-lg font-space font-bold text-white flex items-center gap-2">
                          <Languages className="w-5 h-5 text-pink-500" />
                          {t('settings.language', { defaultValue: 'Idioma' })}
                      </h2>
                      <button onClick={() => setShowLangModal(false)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </header>
                  <div className="p-4 space-y-2.5">
                      <button onClick={() => { i18n.changeLanguage('pt'); setShowLangModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${i18n.language === 'pt' ? 'bg-pink-500/10 border-pink-500/40 text-white font-space font-bold' : 'bg-slate-900 hover:bg-slate-800 border-transparent text-slate-400'}`}>
                          <span className="font-space font-bold flex items-center gap-3">
                              <span className="text-xl">🇧🇷</span> Português
                          </span>
                          {i18n.language === 'pt' && <Check className="w-5 h-5 text-pink-500" />}
                      </button>
                      <button onClick={() => { i18n.changeLanguage('en'); setShowLangModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${i18n.language === 'en' ? 'bg-pink-500/10 border-pink-500/40 text-white font-space font-bold' : 'bg-slate-900 hover:bg-slate-800 border-transparent text-slate-400'}`}>
                          <span className="font-space font-bold flex items-center gap-3">
                              <span className="text-xl">🇺🇸</span> English
                          </span>
                          {i18n.language === 'en' && <Check className="w-5 h-5 text-pink-500" />}
                      </button>
                      <button onClick={() => { i18n.changeLanguage('es'); setShowLangModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${i18n.language === 'es' ? 'bg-pink-500/10 border-pink-500/40 text-white font-space font-bold' : 'bg-slate-900 hover:bg-slate-800 border-transparent text-slate-400'}`}>
                          <span className="font-space font-bold flex items-center gap-3">
                              <span className="text-xl">🇪🇸</span> Español
                          </span>
                          {i18n.language === 'es' && <Check className="w-5 h-5 text-pink-500" />}
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

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Compass,
  EyeOff,
  Flame,
  Globe2,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import { PublicMap } from './PublicMap';
import { LegalModal, type LegalDocType } from './LegalModals';
import type { Coordinates } from '../types';

interface LandingPageProps {
  onEnter: () => void;
}

type LandingCopy = {
  navHow: string;
  navPlaces: string;
  navSafety: string;
  enter: string;
  heroEyebrow: string;
  heroTitleA: string;
  heroTitleB: string;
  heroText: string;
  heroCta: string;
  heroSecondary: string;
  proofLabel: string;
  proofNow: string;
  proofNear: string;
  proofConversation: string;
  productEyebrow: string;
  productTitle: string;
  productText: string;
  placesEyebrow: string;
  placesTitle: string;
  placesText: string;
  locate: string;
  locating: string;
  locationDenied: string;
  safetyEyebrow: string;
  safetyTitle: string;
  safetyText: string;
  finalEyebrow: string;
  finalTitle: string;
  finalText: string;
  terms: string;
  privacy: string;
  guidelines: string;
  adults: string;
};

const COPY: Record<'pt' | 'en' | 'es', LandingCopy> = {
  pt: {
    navHow: 'Como funciona',
    navPlaces: 'Locais',
    navSafety: 'Segurança',
    enter: 'Entrar',
    heroEyebrow: 'O radar LGBTQ+ da sua cidade',
    heroTitleA: 'Perto. Agora.',
    heroTitleB: 'Conectados.',
    heroText: 'Pessoas, lugares e momentos LGBTQ+ ao seu redor — com você no controle do que mostra e de quando aparece.',
    heroCta: 'Entrar no Ponto G',
    heroSecondary: 'Ver como funciona',
    proofLabel: 'Preview do app',
    proofNow: 'Disponível agora',
    proofNear: 'Perto de você',
    proofConversation: 'Conversa liberada',
    productEyebrow: 'Uma cidade mais viva quando você sabe onde olhar',
    productTitle: 'Não é só mais um app de encontros.',
    productText: 'O Ponto G une descoberta, intenção em tempo real, lugares LGBTQ+ e conversa em uma experiência só.',
    placesEyebrow: 'Guia local',
    placesTitle: 'A cidade também faz parte da conversa.',
    placesText: 'Descubra bares, festas, saunas e outros pontos LGBTQ+ cadastrados na plataforma. Sua localização só é solicitada quando você decidir usar.',
    locate: 'Ver perto de mim',
    locating: 'Localizando…',
    locationDenied: 'Não foi possível usar sua localização. Você ainda pode explorar os locais disponíveis.',
    safetyEyebrow: 'Você decide como aparecer',
    safetyTitle: 'Conexão sem abrir mão do controle.',
    safetyText: 'Privacidade não é um slogan. O produto foi desenhado para dar escolhas claras sobre presença, localização, acesso a mídia e contato.',
    finalEyebrow: 'Seu próximo ponto pode estar perto',
    finalTitle: 'Entre e veja o que está acontecendo agora.',
    finalText: 'Crie seu perfil, escolha como quer aparecer e descubra pessoas e lugares no seu ritmo.',
    terms: 'Termos',
    privacy: 'Privacidade',
    guidelines: 'Diretrizes',
    adults: 'Somente para maiores de 18 anos.',
  },
  en: {
    navHow: 'How it works',
    navPlaces: 'Places',
    navSafety: 'Safety',
    enter: 'Sign in',
    heroEyebrow: 'Your city’s LGBTQ+ radar',
    heroTitleA: 'Nearby. Now.',
    heroTitleB: 'Connected.',
    heroText: 'People, places and LGBTQ+ moments around you — with you in control of what you share and when you appear.',
    heroCta: 'Enter Ponto G',
    heroSecondary: 'See how it works',
    proofLabel: 'App preview',
    proofNow: 'Available now',
    proofNear: 'Near you',
    proofConversation: 'Conversation unlocked',
    productEyebrow: 'A more alive city when you know where to look',
    productTitle: 'Not just another dating app.',
    productText: 'Ponto G brings discovery, real-time intent, LGBTQ+ places and conversation into one experience.',
    placesEyebrow: 'Local guide',
    placesTitle: 'The city is part of the conversation too.',
    placesText: 'Discover bars, parties, saunas and other LGBTQ+ places listed on the platform. We only ask for your location when you choose to use it.',
    locate: 'See what’s near me',
    locating: 'Locating…',
    locationDenied: 'We could not use your location. You can still explore available places.',
    safetyEyebrow: 'You decide how to appear',
    safetyTitle: 'Connect without giving up control.',
    safetyText: 'Privacy is not a slogan. The product gives you clear choices over presence, location, media access and contact.',
    finalEyebrow: 'Your next point may be nearby',
    finalTitle: 'Come in and see what is happening now.',
    finalText: 'Create your profile, choose how you want to appear and discover people and places at your own pace.',
    terms: 'Terms',
    privacy: 'Privacy',
    guidelines: 'Guidelines',
    adults: 'For adults 18+ only.',
  },
  es: {
    navHow: 'Cómo funciona',
    navPlaces: 'Lugares',
    navSafety: 'Seguridad',
    enter: 'Entrar',
    heroEyebrow: 'El radar LGBTQ+ de tu ciudad',
    heroTitleA: 'Cerca. Ahora.',
    heroTitleB: 'Conectados.',
    heroText: 'Personas, lugares y momentos LGBTQ+ a tu alrededor — con el control de qué muestras y cuándo apareces.',
    heroCta: 'Entrar a Ponto G',
    heroSecondary: 'Ver cómo funciona',
    proofLabel: 'Vista previa de la app',
    proofNow: 'Disponible ahora',
    proofNear: 'Cerca de ti',
    proofConversation: 'Conversación habilitada',
    productEyebrow: 'Una ciudad más viva cuando sabes dónde mirar',
    productTitle: 'No es solo otra app de citas.',
    productText: 'Ponto G reúne descubrimiento, intención en tiempo real, lugares LGBTQ+ y conversación en una sola experiencia.',
    placesEyebrow: 'Guía local',
    placesTitle: 'La ciudad también forma parte de la conversación.',
    placesText: 'Descubre bares, fiestas, saunas y otros puntos LGBTQ+ registrados en la plataforma. Solo pedimos tu ubicación cuando decides usarla.',
    locate: 'Ver cerca de mí',
    locating: 'Localizando…',
    locationDenied: 'No pudimos usar tu ubicación. Aun así puedes explorar los lugares disponibles.',
    safetyEyebrow: 'Tú decides cómo aparecer',
    safetyTitle: 'Conecta sin perder el control.',
    safetyText: 'La privacidad no es un eslogan. El producto ofrece decisiones claras sobre presencia, ubicación, acceso a medios y contacto.',
    finalEyebrow: 'Tu próximo punto puede estar cerca',
    finalTitle: 'Entra y descubre qué está pasando ahora.',
    finalText: 'Crea tu perfil, elige cómo quieres aparecer y descubre personas y lugares a tu ritmo.',
    terms: 'Términos',
    privacy: 'Privacidad',
    guidelines: 'Directrices',
    adults: 'Solo para mayores de 18 años.',
  },
};

const featureCards = [
  {
    icon: Compass,
    label: 'Descobrir',
    title: 'Quem faz sentido agora.',
    text: 'Pessoas próximas, online, no Agora ou com interesses que combinam com o momento.',
    tone: 'from-fuchsia-500/20 to-transparent',
  },
  {
    icon: Flame,
    label: 'Agora',
    title: 'Intenção que não fica velha.',
    text: 'Sinalize por tempo limitado que você está disponível e encontre quem está na mesma energia.',
    tone: 'from-[rgba(245,12,105,.22)] to-transparent',
  },
  {
    icon: MapPin,
    label: 'Mapa',
    title: 'A cena ao seu redor.',
    text: 'Locais LGBTQ+, check-ins e contexto de proximidade sem transformar sua posição em vitrine.',
    tone: 'from-violet-500/20 to-transparent',
  },
  {
    icon: MessageCircle,
    label: 'Conversas',
    title: 'Conexão com contexto.',
    text: 'Converse, compartilhe localização ou mídia privada e controle quem tem acesso ao quê.',
    tone: 'from-sky-500/20 to-transparent',
  },
] as const;

const trustItems = [
  { icon: EyeOff, title: 'Presença sob seu controle', text: 'Escolha quando aparecer e use recursos de privacidade quando precisar.' },
  { icon: LockKeyhole, title: 'Mídia privada por acesso', text: 'Álbuns privados usam acesso específico, expiração e visualização única quando configurada.' },
  { icon: ShieldCheck, title: 'Bloqueio e denúncia', text: 'Ferramentas de segurança ficam disponíveis nos fluxos de perfil e comunidade.' },
  { icon: BadgeCheck, title: 'Confiança progressiva', text: 'Perfis podem solicitar verificação e a comunidade conta com sinais claros de presença e intenção.' },
] as const;

const ProductPreview = ({ copy }: { copy: LandingCopy }) => (
  <div className="relative mx-auto w-full max-w-[520px]">
    <div className="absolute -inset-12 -z-10 rounded-full bg-[radial-gradient(circle,rgba(245,12,105,.18),transparent_62%)] blur-2xl" />
    <div className="overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#09090d]/95 shadow-[0_36px_100px_rgba(0,0,0,.58)] backdrop-blur-3xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-white/30">{copy.proofLabel}</p>
          <p className="mt-1 font-bricolage text-lg font-black text-white">Ponto G</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[var(--pg-primary)]">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="col-span-2 relative min-h-[190px] overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#111116] p-4">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
          <div className="relative flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.15em] text-white/38">{copy.proofNear}</span>
            <MapPin size={16} className="text-violet-300" />
          </div>
          <div className="relative mt-8">
            <span className="absolute left-[12%] top-4 h-12 w-12 rounded-full border-2 border-emerald-400 bg-gradient-to-br from-white/18 to-white/5 shadow-[0_0_0_5px_rgba(52,211,153,.08)]" />
            <span className="absolute right-[16%] top-16 h-14 w-14 rounded-full border-2 border-[var(--pg-primary)] bg-gradient-to-br from-white/18 to-white/5 shadow-[0_0_24px_rgba(245,12,105,.22)]" />
            <span className="absolute left-[43%] top-20 h-10 w-10 rounded-full border-2 border-white/25 bg-gradient-to-br from-white/14 to-white/4" />
          </div>
        </div>

        <div className="flex min-h-[190px] flex-col justify-between rounded-[24px] border border-[rgba(245,12,105,.18)] bg-gradient-to-b from-[rgba(245,12,105,.13)] to-white/[0.025] p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--pg-primary)] text-white shadow-[0_8px_30px_rgba(245,12,105,.28)]"><Flame size={19} /></span>
          <div>
            <p className="font-space text-2xl font-black text-white">42:18</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[.13em] text-[var(--pg-primary)]">{copy.proofNow}</p>
          </div>
        </div>

        <div className="col-span-3 flex items-center gap-3 rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05]"><Users size={18} className="text-white/60" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-white">{copy.proofConversation}</p>
            <p className="mt-0.5 text-[11px] text-white/36">Agora vocês podem continuar por mensagem.</p>
          </div>
          <MessageCircle size={18} className="text-[var(--pg-primary)]" />
        </div>
      </div>

      <div className="grid grid-cols-5 border-t border-white/[0.06] px-4 py-3 text-white/32">
        {[Compass, MapPin, Flame, MessageCircle, Users].map((Icon, index) => (
          <div key={index} className={`flex justify-center ${index === 2 ? 'text-[var(--pg-primary)]' : ''}`}><Icon size={18} /></div>
        ))}
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { i18n } = useTranslation();
  const venues = useMapStore((state) => state.venues);
  const fetchVenues = useMapStore((state) => state.fetchVenues);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: -23.5505, lng: -46.6333 });
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);

  const lang: 'pt' | 'en' | 'es' = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('es') ? 'es' : 'pt';
  const copy = COPY[lang];

  useEffect(() => {
    void fetchVenues();
  }, [fetchVenues]);

  const visibleVenues = useMemo(() => venues.filter((venue) => Boolean(venue.lat && venue.lng)).slice(0, 6), [venues]);

  const locate = () => {
    if (!navigator.geolocation || locationState === 'loading') return;
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setMapCenter(next);
        void fetchVenues(next);
        setLocationState('ready');
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050507] text-white selection:bg-[var(--pg-primary)] selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70" aria-hidden="true">
        <div className="absolute left-1/2 top-[-220px] h-[620px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,12,105,.12),rgba(116,53,255,.05)_40%,transparent_70%)] blur-3xl" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#050507]/78 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5" aria-label="Ponto G">
            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-[var(--pg-primary)] to-violet-600 font-bricolage text-lg font-black shadow-[0_8px_28px_rgba(245,12,105,.2)]">G</span>
            <span className="font-bricolage text-lg font-black tracking-[-.03em]">Ponto G</span>
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#produto" className="text-sm font-bold text-white/48 transition hover:text-white">{copy.navHow}</a>
            <a href="#locais" className="text-sm font-bold text-white/48 transition hover:text-white">{copy.navPlaces}</a>
            <a href="#seguranca" className="text-sm font-bold text-white/48 transition hover:text-white">{copy.navSafety}</a>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => setLanguageOpen((value) => !value)} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black uppercase tracking-[.08em] text-white/52 transition hover:bg-white/[0.05] hover:text-white" aria-label="Idioma">
                <Globe2 size={16} /> {lang}<ChevronDown size={13} />
              </button>
              {languageOpen && (
                <div className="absolute right-0 top-12 w-36 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101014]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                  {[['pt', 'Português'], ['en', 'English'], ['es', 'Español']].map(([code, label]) => (
                    <button key={code} type="button" onClick={() => { void i18n.changeLanguage(code); setLanguageOpen(false); }} className={`w-full rounded-[13px] px-3 py-2 text-left text-xs font-bold ${lang === code ? 'bg-white/[0.07] text-white' : 'text-white/48 hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={onEnter} className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-black transition hover:scale-[1.02] active:scale-[.98] sm:px-5">{copy.enter}</button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[92svh] w-full max-w-7xl items-center gap-14 px-4 pb-16 pt-28 sm:px-6 md:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(245,12,105,.18)] bg-[rgba(245,12,105,.07)] px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-[var(--pg-primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--pg-primary)] shadow-[0_0_12px_rgba(245,12,105,.8)]" />
              {copy.heroEyebrow}
            </div>
            <h1 className="font-bricolage text-[clamp(3.5rem,8vw,7.6rem)] font-black leading-[.86] tracking-[-.065em] text-white">
              {copy.heroTitleA}<br />
              <span className="bg-gradient-to-r from-[var(--pg-primary)] via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">{copy.heroTitleB}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg font-medium leading-8 text-white/52 sm:text-xl">{copy.heroText}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onEnter} className="group flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-black shadow-[0_18px_50px_rgba(255,255,255,.08)] transition hover:scale-[1.02] active:scale-[.985]">
                {copy.heroCta}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a href="#produto" className="flex min-h-[54px] items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.025] px-7 text-sm font-black text-white/65 transition hover:bg-white/[0.055] hover:text-white">{copy.heroSecondary}</a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-white/32">
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} />18+</span>
              <span className="flex items-center gap-1.5"><EyeOff size={14} />Controle de presença</span>
              <span className="flex items-center gap-1.5"><LockKeyhole size={14} />Mídia privada</span>
            </div>
          </div>

          <ProductPreview copy={copy} />
        </section>

        <section id="produto" className="border-y border-white/[0.055] bg-white/[0.012] py-24 sm:py-32">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--pg-primary)]">{copy.productEyebrow}</p>
                <h2 className="mt-4 max-w-xl font-bricolage text-4xl font-black leading-[.98] tracking-[-.045em] text-white sm:text-5xl">{copy.productTitle}</h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-white/45 lg:justify-self-end lg:text-lg">{copy.productText}</p>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featureCards.map(({ icon: Icon, label, title, text, tone }) => (
                <article key={label} className="group relative min-h-[270px] overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0d0d11] p-5 transition hover:-translate-y-1 hover:border-white/[0.12]">
                  <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-b ${tone} opacity-80`} />
                  <div className="relative flex h-full flex-col">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.07] bg-white/[0.05] text-white"><Icon size={21} /></span>
                    <div className="mt-auto pt-16">
                      <p className="text-[10px] font-black uppercase tracking-[.15em] text-white/28">{label}</p>
                      <h3 className="mt-2 font-bricolage text-xl font-black tracking-[-.025em] text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/40">{text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="locais" className="py-24 sm:py-32">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">{copy.placesEyebrow}</p>
              <h2 className="mt-4 font-bricolage text-4xl font-black leading-[.98] tracking-[-.045em] text-white sm:text-5xl">{copy.placesTitle}</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/45">{copy.placesText}</p>
              <button type="button" onClick={locate} disabled={locationState === 'loading'} className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-5 text-sm font-black text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
                <Navigation size={17} />{locationState === 'loading' ? copy.locating : copy.locate}
              </button>
              {locationState === 'denied' && <p className="mt-3 max-w-md text-xs leading-5 text-amber-200/55">{copy.locationDenied}</p>}

              {visibleVenues.length > 0 && (
                <div className="mt-8 space-y-2">
                  {visibleVenues.slice(0, 3).map((venue) => (
                    <button key={venue.id} type="button" onClick={onEnter} className="flex w-full max-w-md items-center gap-3 rounded-[18px] border border-white/[0.055] bg-white/[0.02] p-2.5 text-left transition hover:bg-white/[0.045]">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-white/[0.04]">{venue.image_url ? <img src={venue.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center"><MapPin size={17} className="text-white/25" /></span>}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white/72">{venue.name}</p><p className="mt-0.5 truncate text-[11px] text-white/30">{venue.type || 'Local LGBTQ+'}</p></div>
                      <ArrowRight size={15} className="text-white/24" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/[0.07] bg-[#0b0b0e] p-2 shadow-[0_30px_80px_rgba(0,0,0,.35)]">
              <PublicMap venues={visibleVenues} center={mapCenter} onVenueClick={onEnter} />
            </div>
          </div>
        </section>

        <section id="seguranca" className="border-y border-white/[0.055] bg-white/[0.012] py-24 sm:py-32">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{copy.safetyEyebrow}</p>
              <h2 className="mt-4 font-bricolage text-4xl font-black leading-[.98] tracking-[-.045em] text-white sm:text-5xl">{copy.safetyTitle}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">{copy.safetyText}</p>
            </div>
            <div className="mt-12 grid gap-3 sm:grid-cols-2">
              {trustItems.map(({ icon: Icon, title, text }) => (
                <article key={title} className="flex gap-4 rounded-[24px] border border-white/[0.065] bg-[#0c0c10] p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-emerald-400/[0.08] text-emerald-300"><Icon size={20} /></span>
                  <div><h3 className="text-sm font-black text-white/80">{title}</h3><p className="mt-1.5 text-sm leading-6 text-white/38">{text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-28 sm:px-6 sm:py-36">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-[rgba(245,12,105,.15)] bg-[#0b0b0f] px-6 py-14 text-center shadow-[0_34px_100px_rgba(0,0,0,.4)] sm:px-10 sm:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,12,105,.14),transparent_50%)]" />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--pg-primary)]">{copy.finalEyebrow}</p>
              <h2 className="mx-auto mt-4 max-w-3xl font-bricolage text-4xl font-black leading-[.98] tracking-[-.05em] text-white sm:text-6xl">{copy.finalTitle}</h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/45">{copy.finalText}</p>
              <button type="button" onClick={onEnter} className="group mt-8 inline-flex min-h-[54px] items-center gap-2 rounded-full bg-white px-7 text-sm font-black text-black transition hover:scale-[1.02] active:scale-[.985]">{copy.heroCta}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.055] px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bricolage text-sm font-black text-white/55">Ponto G</p><p className="mt-1">{copy.adults}</p></div>
          <div className="flex flex-wrap gap-5 font-bold">
            <button type="button" onClick={() => setActiveLegalDoc('terms')} className="hover:text-white">{copy.terms}</button>
            <button type="button" onClick={() => setActiveLegalDoc('privacy')} className="hover:text-white">{copy.privacy}</button>
            <button type="button" onClick={() => setActiveLegalDoc('guidelines')} className="hover:text-white">{copy.guidelines}</button>
          </div>
        </div>
      </footer>

      {activeLegalDoc && <LegalModal type={activeLegalDoc} onClose={() => setActiveLegalDoc(null)} />}
    </div>
  );
};

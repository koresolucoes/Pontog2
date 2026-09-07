import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
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
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import { PublicMap } from './PublicMap';
import { LegalModal, type LegalDocType } from './LegalModals';
import type { Coordinates } from '../types';

interface LandingPageProps {
  onEnter: () => void;
}

type LandingCopy = {
  enter: string;
  navPulse: string;
  navCity: string;
  navControl: string;
  heroKicker: string;
  heroTitle: string;
  heroAccent: string;
  heroText: string;
  heroCta: string;
  heroSecondary: string;
  signature: string;
  preview: string;
  nearYou: string;
  now: string;
  cityStripA: string;
  cityStripB: string;
  cityStripC: string;
  cityStripD: string;
  agoraEyebrow: string;
  agoraTitle: string;
  agoraText: string;
  agoraCta: string;
  mapEyebrow: string;
  mapTitle: string;
  mapText: string;
  locate: string;
  locating: string;
  locationDenied: string;
  chatEyebrow: string;
  chatTitle: string;
  chatText: string;
  chatBubbleA: string;
  chatBubbleB: string;
  privacyEyebrow: string;
  privacyTitle: string;
  privacyText: string;
  presence: string;
  approximate: string;
  publicPhotos: string;
  privateAlbum: string;
  invisible: string;
  placeEyebrow: string;
  placeTitle: string;
  placeText: string;
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
    enter: 'Entrar',
    navPulse: 'Agora',
    navCity: 'Cidade',
    navControl: 'Privacidade',
    heroKicker: 'Noite, cidade, pessoas',
    heroTitle: 'A cidade está acontecendo',
    heroAccent: 'agora.',
    heroText: 'Veja quem está perto, onde existe movimento e quem quer conversar — antes de decidir para onde ir.',
    heroCta: 'Entrar no Ponto G',
    heroSecondary: 'Sentir o pulso',
    signature: 'Perto. Agora. Conectados.',
    preview: 'Preview da experiência',
    nearYou: 'perto de você',
    now: 'Agora',
    cityStripA: 'Quem está por perto',
    cityStripB: 'Quem quer agora',
    cityStripC: 'Onde está acontecendo',
    cityStripD: 'Como você quer aparecer',
    agoraEyebrow: 'Intenção em tempo real',
    agoraTitle: 'Quem quer agora?',
    agoraText: 'O modo Agora dura uma hora. É um sinal claro, temporário e direto de que você está aberto a uma conexão naquele momento.',
    agoraCta: 'Ver o Agora',
    mapEyebrow: 'Veja a cidade respirar',
    mapTitle: 'Pessoas e lugares no mesmo mapa mental.',
    mapText: 'Bares, festas, saunas e outros pontos LGBTQ+ entram na conversa junto com proximidade e presença. Sua localização só é pedida quando você escolher usar.',
    locate: 'Ver perto de mim',
    locating: 'Localizando…',
    locationDenied: 'Não foi possível usar sua localização. Você ainda pode explorar os locais disponíveis.',
    chatEyebrow: 'Conexão com contexto',
    chatTitle: 'Algumas conversas começam antes do “oi”.',
    chatText: 'Vocês podem estar no mesmo local, no mesmo modo Agora ou simplesmente perto. O contexto reduz atrito e deixa a conversa menos aleatória.',
    chatBubbleA: 'Vocês estão no mesmo local.',
    chatBubbleB: 'Quer continuar por mensagem?',
    privacyEyebrow: 'Você decide quanto aparece',
    privacyTitle: 'Nem todo mundo precisa saber tudo sobre você.',
    privacyText: 'Controle presença, localização aproximada, fotos públicas, mídia privada e quando quer desaparecer da descoberta.',
    presence: 'Sua presença',
    approximate: 'Localização aproximada',
    publicPhotos: 'Fotos públicas',
    privateAlbum: 'Álbum privado',
    invisible: 'Modo invisível',
    placeEyebrow: 'Seu lugar também pode ser um ponto',
    placeTitle: 'A vida LGBTQ+ também acontece fora da tela.',
    placeText: 'Locais podem fazer parte do mapa, receber check-ins e entrar na descoberta da comunidade sem transformar a landing em um catálogo genérico.',
    finalEyebrow: 'A noite está aí',
    finalTitle: 'Talvez sua próxima conexão esteja a alguns quarteirões.',
    finalText: 'Entre no Ponto G e veja a cidade por outro ângulo.',
    terms: 'Termos',
    privacy: 'Privacidade',
    guidelines: 'Diretrizes',
    adults: 'Somente para maiores de 18 anos.',
  },
  en: {
    enter: 'Sign in',
    navPulse: 'Now',
    navCity: 'City',
    navControl: 'Privacy',
    heroKicker: 'Night, city, people',
    heroTitle: 'The city is happening',
    heroAccent: 'now.',
    heroText: 'See who is nearby, where there is movement and who wants to connect — before deciding where to go.',
    heroCta: 'Enter Ponto G',
    heroSecondary: 'Feel the pulse',
    signature: 'Nearby. Now. Connected.',
    preview: 'Experience preview',
    nearYou: 'near you',
    now: 'Now',
    cityStripA: 'Who is nearby',
    cityStripB: 'Who wants now',
    cityStripC: 'Where it is happening',
    cityStripD: 'How you want to appear',
    agoraEyebrow: 'Real-time intent',
    agoraTitle: 'Who wants now?',
    agoraText: 'Now Mode lasts one hour. It is a clear, temporary signal that you are open to a connection in that moment.',
    agoraCta: 'See Now',
    mapEyebrow: 'Watch the city breathe',
    mapTitle: 'People and places in the same mental map.',
    mapText: 'Bars, parties, saunas and other LGBTQ+ places join proximity and presence. We only ask for location when you choose to use it.',
    locate: 'See what is near me',
    locating: 'Locating…',
    locationDenied: 'We could not use your location. You can still explore available places.',
    chatEyebrow: 'Connection with context',
    chatTitle: 'Some conversations begin before “hi”.',
    chatText: 'You may be at the same place, in Now Mode or simply nearby. Context reduces friction and makes conversation less random.',
    chatBubbleA: 'You are at the same place.',
    chatBubbleB: 'Want to continue by message?',
    privacyEyebrow: 'You decide how much you show',
    privacyTitle: 'Not everyone needs to know everything about you.',
    privacyText: 'Control presence, approximate location, public photos, private media and when you want to disappear from discovery.',
    presence: 'Your presence',
    approximate: 'Approximate location',
    publicPhotos: 'Public photos',
    privateAlbum: 'Private album',
    invisible: 'Invisible mode',
    placeEyebrow: 'Your place can become a point too',
    placeTitle: 'LGBTQ+ life also happens off-screen.',
    placeText: 'Places can appear on the map, receive check-ins and enter community discovery without turning the landing into a generic directory.',
    finalEyebrow: 'The night is out there',
    finalTitle: 'Your next connection may be a few blocks away.',
    finalText: 'Enter Ponto G and see the city from another angle.',
    terms: 'Terms',
    privacy: 'Privacy',
    guidelines: 'Guidelines',
    adults: 'For adults 18+ only.',
  },
  es: {
    enter: 'Entrar',
    navPulse: 'Ahora',
    navCity: 'Ciudad',
    navControl: 'Privacidad',
    heroKicker: 'Noche, ciudad, personas',
    heroTitle: 'La ciudad está pasando',
    heroAccent: 'ahora.',
    heroText: 'Mira quién está cerca, dónde hay movimiento y quién quiere conectar antes de decidir adónde ir.',
    heroCta: 'Entrar a Ponto G',
    heroSecondary: 'Sentir el pulso',
    signature: 'Cerca. Ahora. Conectados.',
    preview: 'Vista previa de la experiencia',
    nearYou: 'cerca de ti',
    now: 'Ahora',
    cityStripA: 'Quién está cerca',
    cityStripB: 'Quién quiere ahora',
    cityStripC: 'Dónde está pasando',
    cityStripD: 'Cómo quieres aparecer',
    agoraEyebrow: 'Intención en tiempo real',
    agoraTitle: '¿Quién quiere ahora?',
    agoraText: 'El modo Ahora dura una hora. Es una señal clara y temporal de que estás abierto a una conexión en ese momento.',
    agoraCta: 'Ver Ahora',
    mapEyebrow: 'Mira la ciudad respirar',
    mapTitle: 'Personas y lugares en el mismo mapa mental.',
    mapText: 'Bares, fiestas, saunas y otros lugares LGBTQ+ se mezclan con proximidad y presencia. Solo pedimos ubicación cuando eliges usarla.',
    locate: 'Ver cerca de mí',
    locating: 'Localizando…',
    locationDenied: 'No pudimos usar tu ubicación. Aun así puedes explorar los lugares disponibles.',
    chatEyebrow: 'Conexión con contexto',
    chatTitle: 'Algunas conversaciones empiezan antes del “hola”.',
    chatText: 'Pueden estar en el mismo lugar, en modo Ahora o simplemente cerca. El contexto reduce fricción y hace la conversación menos aleatoria.',
    chatBubbleA: 'Están en el mismo lugar.',
    chatBubbleB: '¿Quieres seguir por mensaje?',
    privacyEyebrow: 'Tú decides cuánto mostrar',
    privacyTitle: 'No todo el mundo necesita saber todo sobre ti.',
    privacyText: 'Controla presencia, ubicación aproximada, fotos públicas, medios privados y cuándo quieres desaparecer del descubrimiento.',
    presence: 'Tu presencia',
    approximate: 'Ubicación aproximada',
    publicPhotos: 'Fotos públicas',
    privateAlbum: 'Álbum privado',
    invisible: 'Modo invisible',
    placeEyebrow: 'Tu lugar también puede ser un punto',
    placeTitle: 'La vida LGBTQ+ también ocurre fuera de la pantalla.',
    placeText: 'Los lugares pueden formar parte del mapa, recibir check-ins y entrar en el descubrimiento sin convertir la landing en un directorio genérico.',
    finalEyebrow: 'La noche está ahí',
    finalTitle: 'Tu próxima conexión puede estar a pocas cuadras.',
    finalText: 'Entra a Ponto G y mira la ciudad desde otro ángulo.',
    terms: 'Términos',
    privacy: 'Privacidad',
    guidelines: 'Directrices',
    adults: 'Solo para mayores de 18 años.',
  },
};

const HeroRadar = ({ copy }: { copy: LandingCopy }) => {
  const people = [
    { initials: 'R', label: 'Rafa, 29', note: copy.nearYou, x: '8%', y: '16%', ring: 'border-emerald-400' },
    { initials: 'L', label: 'Leo, 32', note: copy.now, x: '64%', y: '24%', ring: 'border-[var(--pg-primary)]' },
    { initials: 'D', label: 'Dani, 27', note: copy.nearYou, x: '46%', y: '66%', ring: 'border-white/25' },
  ];

  return (
    <div className="relative mx-auto min-h-[520px] w-full max-w-[590px]">
      <div className="absolute inset-0 rounded-[42px] border border-white/[0.07] bg-[#09090c]/88 shadow-[0_42px_120px_rgba(0,0,0,.58)] backdrop-blur-3xl" />
      <div className="absolute inset-0 overflow-hidden rounded-[42px]">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '46px 46px' }} />
        <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.055]" />
        <div className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.055]" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(245,12,105,.18)]"
          animate={{ scale: [1, 1.22, 1], opacity: [.35, .08, .35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/70 shadow-[0_0_40px_rgba(245,12,105,.18)]">
          <span className="h-3 w-3 rounded-full bg-[var(--pg-primary)] shadow-[0_0_18px_rgba(245,12,105,.9)]" />
        </div>
        <span className="absolute left-1/2 top-[57%] -translate-x-1/2 text-[9px] font-black uppercase tracking-[.18em] text-white/28">VOCÊ</span>
      </div>

      <div className="absolute left-5 top-5 rounded-full border border-white/[0.08] bg-black/55 px-3 py-2 text-[9px] font-black uppercase tracking-[.17em] text-white/36 backdrop-blur-xl">{copy.preview}</div>

      {people.map((person, index) => (
        <motion.div
          key={person.label}
          className="absolute"
          style={{ left: person.x, top: person.y }}
          animate={{ y: [0, index % 2 === 0 ? -8 : 8, 0] }}
          transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex items-center gap-2.5 rounded-[22px] border border-white/[0.08] bg-black/70 p-2.5 pr-4 shadow-[0_18px_55px_rgba(0,0,0,.45)] backdrop-blur-xl">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[17px] border-2 ${person.ring} bg-gradient-to-br from-fuchsia-500/25 via-violet-500/20 to-white/[0.04] font-bricolage text-sm font-black text-white`}>{person.initials}</div>
            <div><p className="text-xs font-black text-white/86">{person.label}</p><p className="mt-0.5 text-[10px] font-bold text-white/35">{person.note}</p></div>
          </div>
        </motion.div>
      ))}

      <motion.div
        className="absolute bottom-5 right-5 flex items-center gap-3 rounded-[24px] border border-[rgba(245,12,105,.2)] bg-[rgba(245,12,105,.1)] p-3 pr-4 backdrop-blur-xl"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3.4, repeat: Infinity }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--pg-primary)] text-white shadow-[0_10px_28px_rgba(245,12,105,.3)]"><Flame size={19} /></span>
        <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--pg-primary)]">{copy.now}</p><p className="font-space text-xl font-black text-white">42:18</p></div>
      </motion.div>
    </div>
  );
};

const PulseStrip = ({ copy }: { copy: LandingCopy }) => {
  const items = [
    [Compass, copy.cityStripA],
    [Flame, copy.cityStripB],
    [MapPin, copy.cityStripC],
    [EyeOff, copy.cityStripD],
  ] as const;
  return (
    <div className="border-y border-white/[0.055] bg-white/[0.012]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/[0.055] px-4 sm:grid-cols-4 sm:divide-y-0 sm:px-6 lg:px-8">
        {items.map(([Icon, label]) => (
          <div key={label} className="flex min-h-[98px] items-center gap-3 px-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-white/[0.035] text-white/55"><Icon size={18} /></span>
            <span className="text-xs font-black uppercase tracking-[.12em] text-white/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { i18n } = useTranslation();
  const venues = useMapStore((state) => state.venues);
  const fetchVenues = useMapStore((state) => state.fetchVenues);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: -19.9208, lng: -43.9378 });
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);

  const lang: 'pt' | 'en' | 'es' = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('es') ? 'es' : 'pt';
  const copy = COPY[lang];

  useEffect(() => { void fetchVenues(); }, [fetchVenues]);

  const visibleVenues = useMemo(() => venues.filter((venue) => Boolean(venue.lat && venue.lng)).slice(0, 8), [venues]);

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
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-260px] h-[700px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,12,105,.13),rgba(113,63,255,.055)_38%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-[-180px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(82,49,185,.08),transparent_68%)] blur-3xl" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.055] bg-[#050507]/76 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5" aria-label="Ponto G">
            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-[var(--pg-primary)] to-violet-600 font-bricolage text-lg font-black shadow-[0_8px_28px_rgba(245,12,105,.2)]">G</span>
            <span className="font-bricolage text-lg font-black tracking-[-.03em]">Ponto G</span>
          </button>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#agora" className="text-sm font-bold text-white/45 transition hover:text-white">{copy.navPulse}</a>
            <a href="#cidade" className="text-sm font-bold text-white/45 transition hover:text-white">{copy.navCity}</a>
            <a href="#controle" className="text-sm font-bold text-white/45 transition hover:text-white">{copy.navControl}</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => setLanguageOpen((value) => !value)} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black uppercase tracking-[.08em] text-white/52 transition hover:bg-white/[0.05] hover:text-white" aria-label="Idioma">
                <Globe2 size={16} /> {lang}<ChevronDown size={13} />
              </button>
              {languageOpen && <div className="absolute right-0 top-12 w-36 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101014]/95 p-1.5 shadow-2xl backdrop-blur-2xl">{[['pt','Português'],['en','English'],['es','Español']].map(([code,label]) => <button key={code} type="button" onClick={() => { void i18n.changeLanguage(code); setLanguageOpen(false); }} className={`w-full rounded-[13px] px-3 py-2 text-left text-xs font-bold ${lang === code ? 'bg-white/[0.07] text-white' : 'text-white/48 hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}</div>}
            </div>
            <button type="button" onClick={onEnter} className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-black transition hover:scale-[1.02] active:scale-[.98] sm:px-5">{copy.enter}</button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[94svh] max-w-7xl items-center gap-14 px-4 pb-16 pt-28 sm:px-6 md:grid-cols-[.92fr_1.08fr] lg:gap-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--pg-primary)]">{copy.heroKicker}</p>
            <h1 className="mt-5 font-bricolage text-[clamp(3.8rem,7.4vw,7.5rem)] font-black leading-[.87] tracking-[-.065em] text-white">
              {copy.heroTitle}<br/><span className="bg-gradient-to-r from-[var(--pg-primary)] via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">{copy.heroAccent}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg font-medium leading-8 text-white/52 sm:text-xl">{copy.heroText}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onEnter} className="group flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-black transition hover:scale-[1.02] active:scale-[.985]">{copy.heroCta}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1"/></button>
              <a href="#agora" className="flex min-h-[54px] items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.025] px-7 text-sm font-black text-white/65 transition hover:bg-white/[0.055] hover:text-white">{copy.heroSecondary}</a>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/24"><span className="h-1.5 w-1.5 rounded-full bg-[var(--pg-primary)]"/>{copy.signature}</div>
          </div>
          <HeroRadar copy={copy}/>
        </section>

        <PulseStrip copy={copy}/>

        <section id="agora" className="relative overflow-hidden py-28 sm:py-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(245,12,105,.12),transparent_32%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--pg-primary)]">{copy.agoraEyebrow}</p>
              <h2 className="mt-5 font-bricolage text-[clamp(3.6rem,7vw,7rem)] font-black leading-[.86] tracking-[-.06em] text-white">{copy.agoraTitle}</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/45 sm:text-lg">{copy.agoraText}</p>
              <button type="button" onClick={onEnter} className="mt-8 inline-flex min-h-[50px] items-center gap-2 rounded-full border border-[rgba(245,12,105,.2)] bg-[rgba(245,12,105,.09)] px-6 text-sm font-black text-[var(--pg-primary)] transition hover:bg-[rgba(245,12,105,.14)]"><Flame size={18}/>{copy.agoraCta}</button>
            </div>
            <div className="relative mx-auto w-full max-w-[650px]">
              <div className="absolute -inset-16 -z-10 bg-[radial-gradient(circle,rgba(245,12,105,.14),transparent_65%)] blur-2xl"/>
              <div className="overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#0b0b0f] shadow-[0_36px_110px_rgba(0,0,0,.5)]">
                <div className="relative min-h-[430px] p-5 sm:p-7">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/[0.08] via-transparent to-violet-500/[0.06]"/>
                  <div className="relative flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/30">AGORA</p><p className="mt-1 font-bricolage text-xl font-black text-white">Disponível por 1 hora</p></div><div className="rounded-full border border-[rgba(245,12,105,.18)] bg-[rgba(245,12,105,.08)] px-4 py-2 font-space text-xl font-black text-[var(--pg-primary)]">42:18</div></div>
                  <div className="mt-16 grid grid-cols-[.9fr_1.1fr] gap-3">
                    <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-4"><div className="aspect-[4/5] rounded-[22px] bg-gradient-to-br from-fuchsia-500/25 via-violet-500/20 to-white/[0.04]"/><p className="mt-3 font-bricolage text-lg font-black text-white">Leo, 32</p><p className="mt-1 text-xs text-white/35">No Agora agora</p></div>
                    <div className="flex flex-col justify-end rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5"><span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--pg-primary)] text-white"><Flame size={21}/></span><p className="mt-auto font-bricolage text-3xl font-black leading-none text-white">Sem deixar dúvida.</p><p className="mt-3 text-sm leading-6 text-white/40">Um sinal temporário de intenção, não mais um status esquecido no perfil.</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cidade" className="border-y border-white/[0.055] bg-white/[0.012] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
              <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">{copy.mapEyebrow}</p><h2 className="mt-4 font-bricolage text-4xl font-black leading-[.95] tracking-[-.05em] text-white sm:text-6xl">{copy.mapTitle}</h2></div>
              <div className="lg:justify-self-end"><p className="max-w-xl text-base leading-7 text-white/45">{copy.mapText}</p><button type="button" onClick={locate} disabled={locationState === 'loading'} className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-5 text-sm font-black text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"><Navigation size={17}/>{locationState === 'loading' ? copy.locating : copy.locate}</button>{locationState === 'denied' && <p className="mt-3 max-w-md text-xs leading-5 text-amber-200/55">{copy.locationDenied}</p>}</div>
            </div>
            <div className="relative mt-12 overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#09090d] p-2 shadow-[0_32px_90px_rgba(0,0,0,.38)]"><PublicMap venues={visibleVenues} center={mapCenter} onVenueClick={onEnter}/>{visibleVenues.length > 0 && <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex gap-2 overflow-hidden">{visibleVenues.slice(0,3).map((venue) => <div key={venue.id} className="min-w-0 flex-1 rounded-[18px] border border-white/[0.08] bg-black/70 p-3 backdrop-blur-xl"><p className="truncate text-xs font-black text-white/75">{venue.name}</p><p className="mt-1 truncate text-[10px] uppercase tracking-[.12em] text-white/28">{venue.type || 'local'}</p></div>)}</div>}</div>
          </div>
        </section>

        <section className="py-28 sm:py-36">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
            <div className="order-2 lg:order-1">
              <div className="mx-auto max-w-[560px] space-y-3">
                <div className="ml-auto max-w-[75%] rounded-[24px_24px_7px_24px] bg-white px-4 py-3 text-sm font-bold text-black shadow-2xl">{copy.chatBubbleA}</div>
                <div className="max-w-[80%] rounded-[24px_24px_24px_7px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/70">{copy.chatBubbleB}</div>
                <div className="flex items-center gap-3 rounded-[26px] border border-white/[0.07] bg-[#0c0c10] p-4"><span className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-violet-500/12 text-violet-300"><MapPin size={20}/></span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/28">Contexto</p><p className="mt-1 text-sm font-black text-white/75">Mesmo local · presença próxima</p></div><MessageCircle size={19} className="ml-auto text-[var(--pg-primary)]"/></div>
              </div>
            </div>
            <div className="order-1 lg:order-2"><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">{copy.chatEyebrow}</p><h2 className="mt-4 font-bricolage text-4xl font-black leading-[.95] tracking-[-.05em] text-white sm:text-6xl">{copy.chatTitle}</h2><p className="mt-5 max-w-lg text-base leading-7 text-white/45">{copy.chatText}</p></div>
          </div>
        </section>

        <section id="controle" className="border-y border-white/[0.055] bg-white/[0.012] py-28 sm:py-36">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">{copy.privacyEyebrow}</p><h2 className="mt-4 font-bricolage text-4xl font-black leading-[.95] tracking-[-.05em] text-white sm:text-6xl">{copy.privacyTitle}</h2><p className="mt-5 max-w-lg text-base leading-7 text-white/45">{copy.privacyText}</p></div>
            <div className="rounded-[32px] border border-white/[0.08] bg-[#0b0b0f] p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/28">{copy.presence}</p><p className="mt-1 font-bricolage text-xl font-black text-white">Controle de presença</p></div><EyeOff size={20} className="text-emerald-300"/></div><div className="mt-7 space-y-2">{[[copy.approximate,true],[copy.publicPhotos,true],[copy.privateAlbum,false],[copy.invisible,false]].map(([label,on]) => <div key={String(label)} className="flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-white/[0.025] px-4 py-3.5"><span className="text-sm font-bold text-white/60">{label}</span><span className={`relative h-6 w-11 rounded-full ${on ? 'bg-emerald-400/25' : 'bg-white/[0.07]'}`}><span className={`absolute top-1 h-4 w-4 rounded-full transition ${on ? 'right-1 bg-emerald-300' : 'left-1 bg-white/35'}`}/></span></div>)}</div><div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-white/28"><LockKeyhole size={14}/>Você controla o que libera.</div></div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid gap-8 rounded-[36px] border border-violet-400/[0.12] bg-gradient-to-br from-violet-500/[0.08] via-[#0a0a0e] to-[rgba(245,12,105,.05)] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">{copy.placeEyebrow}</p><h2 className="mt-4 max-w-3xl font-bricolage text-4xl font-black leading-[.95] tracking-[-.05em] text-white sm:text-5xl">{copy.placeTitle}</h2><p className="mt-5 max-w-2xl text-base leading-7 text-white/45">{copy.placeText}</p></div><button type="button" onClick={onEnter} className="inline-flex min-h-[50px] items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-6 text-sm font-black text-white/70 transition hover:bg-white/[0.07] hover:text-white"><Users size={17}/>Entrar</button></div></div>
        </section>

        <section className="px-4 pb-32 pt-12 sm:px-6 sm:pb-40"><div className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-[rgba(245,12,105,.15)] bg-[#0a0a0e] px-6 py-16 text-center shadow-[0_38px_110px_rgba(0,0,0,.45)] sm:px-10 sm:py-24"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,12,105,.15),transparent_50%)]"/><div className="relative"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--pg-primary)]">{copy.finalEyebrow}</p><h2 className="mx-auto mt-4 max-w-4xl font-bricolage text-4xl font-black leading-[.95] tracking-[-.055em] text-white sm:text-7xl">{copy.finalTitle}</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/45">{copy.finalText}</p><button type="button" onClick={onEnter} className="group mt-9 inline-flex min-h-[54px] items-center gap-2 rounded-full bg-white px-7 text-sm font-black text-black transition hover:scale-[1.02] active:scale-[.985]">{copy.heroCta}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1"/></button></div></div></section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.055] px-4 py-8 sm:px-6"><div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bricolage text-sm font-black text-white/55">Ponto G</p><p className="mt-1">{copy.adults}</p></div><div className="flex flex-wrap gap-5 font-bold"><button type="button" onClick={() => setActiveLegalDoc('terms')} className="hover:text-white">{copy.terms}</button><button type="button" onClick={() => setActiveLegalDoc('privacy')} className="hover:text-white">{copy.privacy}</button><button type="button" onClick={() => setActiveLegalDoc('guidelines')} className="hover:text-white">{copy.guidelines}</button></div></div></footer>

      {activeLegalDoc && <LegalModal type={activeLegalDoc} onClose={() => setActiveLegalDoc(null)}/>}
    </div>
  );
};

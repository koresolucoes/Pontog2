import React, { useState } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { MyAlbumsModal } from './MyAlbumsModal';
import { BlockedUsersModal } from './BlockedUsersModal';
import { AccountDeletionModal } from './AccountDeletionModal';
import { LegalModal, LegalDocType } from './LegalModals';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, setSidebarOpen, setSubscriptionModalOpen, setDonationModalOpen, setActiveView } = useUiStore();
  const { user, toggleCanHost, toggleIncognitoMode, signOut } = useAuthStore();
  const { i18n } = useTranslation();

  const [isMyAlbumsOpen, setIsMyAlbumsOpen] = useState(false);
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);

  useHardwareBack(isSidebarOpen, () => setSidebarOpen(false));
  useHardwareBack(isMyAlbumsOpen, () => setIsMyAlbumsOpen(false));
  useHardwareBack(isBlockedUsersOpen, () => setIsBlockedUsersOpen(false));
  useHardwareBack(isDeleteAccountOpen, () => setIsDeleteAccountOpen(false));
  useHardwareBack(!!activeLegalDoc, () => setActiveLegalDoc(null));

  if (!user) return null;

  const close = () => setSidebarOpen(false);
  const navigate = (view: any) => { setActiveView(view); close(); };
  const handleIncognito = () => {
    if (user.subscription_tier !== 'plus') {
      setSubscriptionModalOpen(true);
      close();
      return;
    }
    toggleIncognitoMode(!user.is_incognito);
  };

  return (
    <>
      <button
        aria-label="Fechar Central da Conta"
        onClick={close}
        className={`fixed inset-0 z-[90] bg-black/70 backdrop-blur-md transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <aside className={`fixed inset-y-0 left-0 z-[91] flex w-[min(92vw,360px)] flex-col border-r border-white/[0.08] bg-[#09090d]/95 shadow-[28px_0_90px_rgba(0,0,0,.5)] backdrop-blur-3xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <header className="border-b border-white/[0.07] px-5 pb-5 pt-[max(20px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <p className="pg-eyebrow">Central da conta</p>
            <button onClick={close} className="pg-icon-btn" aria-label="Fechar"><span className="material-symbols-rounded">close</span></button>
          </div>

          <button onClick={() => navigate('profile')} className="mt-5 flex w-full items-center gap-3 text-left">
            <div className="relative h-16 w-16 shrink-0">
              <img src={user.avatar_url} alt={user.username} className="h-full w-full rounded-[22px] object-cover ring-1 ring-white/10" />
              {user.subscription_tier === 'plus' && <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#09090d] bg-gradient-to-br from-primary-500 to-secondary-500 text-white"><span className="material-symbols-rounded filled !text-[14px]">auto_awesome</span></span>}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-bricolage text-xl font-black tracking-[-0.03em] text-white">{user.display_name || user.username}</h2>
              <p className="mt-0.5 text-xs font-semibold text-white/38">{user.subscription_tier === 'plus' ? 'Ponto G Plus' : 'Conta gratuita'} · Ver meu perfil</p>
            </div>
            <span className="material-symbols-rounded text-white/25">chevron_right</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
          {user.subscription_tier !== 'plus' && (
            <button onClick={() => { setSubscriptionModalOpen(true); close(); }} className="mb-4 w-full overflow-hidden rounded-[24px] border border-primary-500/20 bg-gradient-to-br from-primary-500/14 to-secondary-500/12 p-4 text-left">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-primary-300"><span className="material-symbols-rounded filled">auto_awesome</span></span><span className="material-symbols-rounded text-white/30">arrow_forward</span></div>
              <h3 className="mt-3 font-bricolage text-lg font-black text-white">Mais controle com Plus</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/45">Privacidade avançada, recursos extras e uma experiência mais livre.</p>
            </button>
          )}

          <section className="pg-surface mb-5 p-2">
            <StatusToggle icon="home" title="Tenho local" description="Mostra discretamente que você pode receber." active={!!user.can_host} onClick={() => toggleCanHost(!user.can_host)} tone="green" />
            <div className="mx-3 h-px bg-white/[0.06]" />
            <StatusToggle icon="visibility_off" title="Modo invisível" description={user.subscription_tier === 'plus' ? 'Controle sua visibilidade no app.' : 'Disponível no Plus.'} active={!!user.is_incognito} onClick={handleIncognito} tone="pink" badge={user.subscription_tier !== 'plus' ? 'PLUS' : undefined} />
          </section>

          <MenuGroup label="Explorar">
            <MenuItem icon="groups" label="Comunidades" onClick={() => navigate('communities')} />
            <MenuItem icon="newspaper" label="G News" onClick={() => navigate('news')} />
            <MenuItem icon="play_circle" label="Vídeos" onClick={() => navigate('videos')} />
            {user.is_owner && <MenuItem icon="storefront" label="Meu negócio" onClick={() => { window.location.href = '/owner'; }} />}
          </MenuGroup>

          <MenuGroup label="Privacidade e conteúdo">
            <MenuItem icon="photo_library" label="Álbuns privados" onClick={() => { setIsMyAlbumsOpen(true); close(); }} />
            <MenuItem icon="block" label="Perfis bloqueados" onClick={() => { setIsBlockedUsersOpen(true); close(); }} />
          </MenuGroup>

          <MenuGroup label="Ponto G">
            <MenuItem icon="volunteer_activism" label="Apoiar o projeto" onClick={() => { setDonationModalOpen(true); close(); }} />
            <MenuItem icon="gavel" label="Termos de uso" onClick={() => { setActiveLegalDoc('terms'); close(); }} />
            <MenuItem icon="policy" label="Privacidade" onClick={() => { setActiveLegalDoc('privacy'); close(); }} />
            <MenuItem icon="verified_user" label="Diretrizes da comunidade" onClick={() => { setActiveLegalDoc('guidelines'); close(); }} />
          </MenuGroup>

          <section className="mb-5">
            <p className="pg-eyebrow mb-2 px-2">Idioma</p>
            <div className="grid grid-cols-3 gap-2">
              {['pt', 'en', 'es'].map((language) => {
                const active = i18n.language.startsWith(language);
                return <button key={language} onClick={() => i18n.changeLanguage(language)} className={`h-11 rounded-2xl border text-xs font-black uppercase transition ${active ? 'border-primary-500/30 bg-primary-500/12 text-primary-300' : 'border-white/[0.07] bg-white/[0.03] text-white/40'}`}>{language}</button>;
              })}
            </div>
          </section>

          <div className="space-y-1">
            <button onClick={() => { signOut(); close(); }} className="flex h-12 w-full items-center gap-3 rounded-[18px] px-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10"><span className="material-symbols-rounded">logout</span>Sair da conta</button>
            <button onClick={() => { setIsDeleteAccountOpen(true); close(); }} className="flex h-12 w-full items-center gap-3 rounded-[18px] px-3 text-sm font-bold text-red-400/70 transition hover:bg-red-500/10 hover:text-red-300"><span className="material-symbols-rounded">delete_forever</span>Excluir minha conta</button>
          </div>
        </div>

        <footer className="border-t border-white/[0.06] px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/20">Ponto G · Perto. Agora. Conectados.</p>
        </footer>
      </aside>

      {isMyAlbumsOpen && <MyAlbumsModal onClose={() => setIsMyAlbumsOpen(false)} />}
      {isBlockedUsersOpen && <BlockedUsersModal onClose={() => setIsBlockedUsersOpen(false)} />}
      {isDeleteAccountOpen && <AccountDeletionModal onClose={() => setIsDeleteAccountOpen(false)} />}
      {activeLegalDoc && <LegalModal type={activeLegalDoc} onClose={() => setActiveLegalDoc(null)} />}
    </>
  );
};

const MenuGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <section className="mb-5">
    <p className="pg-eyebrow mb-2 px-2">{label}</p>
    <div className="space-y-1">{children}</div>
  </section>
);

const MenuItem: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex min-h-[48px] w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-bold text-white/65 transition hover:bg-white/[0.045] hover:text-white active:scale-[0.99]">
    <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/[0.045] text-white/55"><span className="material-symbols-rounded !text-[19px]">{icon}</span></span>
    <span className="flex-1">{label}</span>
    <span className="material-symbols-rounded !text-[17px] text-white/18">chevron_right</span>
  </button>
);

const StatusToggle: React.FC<{ icon: string; title: string; description: string; active: boolean; onClick: () => void; tone: 'green' | 'pink'; badge?: string }> = ({ icon, title, description, active, onClick, tone, badge }) => {
  const activeColor = tone === 'green' ? 'bg-tertiary-500' : 'bg-primary-500';
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-[18px] p-3 text-left transition hover:bg-white/[0.025]">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] ${active ? (tone === 'green' ? 'bg-tertiary-500/12 text-tertiary-500' : 'bg-primary-500/12 text-primary-300') : 'bg-white/[0.045] text-white/35'}`}><span className="material-symbols-rounded !text-[20px]">{icon}</span></span>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-black text-white/75">{title}{badge && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] tracking-wider text-white/35">{badge}</span>}</span><span className="mt-0.5 block text-[11px] leading-snug text-white/32">{description}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${active ? activeColor : 'bg-white/10'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${active ? 'left-6' : 'left-1'}`} /></span>
    </button>
  );
};

import React, { useEffect, useState } from 'react';
import { useUserActionsStore, BlockedUser } from '../stores/userActionsStore';
import { ConfirmationModal } from './ConfirmationModal';
import { getPublicImageUrl, supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { socialActions } from '../modules/social/public';
import { useMapStore } from '../stores/mapStore';
import { useHomeStore } from '../stores/homeStore';
import toast from 'react-hot-toast';

interface BlockedUsersModalProps { onClose: () => void; }
type Tab = 'blocked' | 'hidden';
type HiddenProfile = { hidden_id: string; username: string; avatar_url: string | null; created_at: string };

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { blockedUsers, isFetchingBlocked, fetchBlockedUsers, unblockUser } = useUserActionsStore();
  const [tab, setTab] = useState<Tab>('blocked');
  const [hiddenProfiles, setHiddenProfiles] = useState<HiddenProfile[]>([]);
  const [loadingHidden, setLoadingHidden] = useState(true);
  const [userToUnblock, setUserToUnblock] = useState<BlockedUser | null>(null);
  const [userToUnhide, setUserToUnhide] = useState<HiddenProfile | null>(null);
  const [busyHiddenId, setBusyHiddenId] = useState<string | null>(null);

  useEffect(() => { fetchBlockedUsers(); }, [fetchBlockedUsers]);
  useEffect(() => {
    let active = true;
    setLoadingHidden(true);
    supabase.rpc('get_my_hidden_profiles_v1').then(({ data, error }: any) => {
      if (!active) return;
      if (error) {
        console.error('Error fetching hidden profiles:', error);
        setHiddenProfiles([]);
      } else setHiddenProfiles((data || []) as HiddenProfile[]);
      setLoadingHidden(false);
    });
    return () => { active = false; };
  }, []);

  const confirmUnblock = async () => {
    if (!userToUnblock) return;
    await unblockUser(userToUnblock.blocked_id);
    setUserToUnblock(null);
  };

  const confirmUnhide = async () => {
    if (!userToUnhide) return;
    const target = userToUnhide;
    setBusyHiddenId(target.hidden_id);
    try {
      await socialActions.unhideProfile(target.hidden_id);
      setHiddenProfiles((rows) => rows.filter((row) => row.hidden_id !== target.hidden_id));
      const map = useMapStore.getState();
      if (map.myLocation) await map.fetchNearbyUsers(map.myLocation);
      await useHomeStore.getState().fetchPopularUsers();
      toast.success(`${target.username || 'Perfil'} voltou a aparecer para você.`);
      setUserToUnhide(null);
    } catch (error) {
      console.error('Error unhiding profile:', error);
      toast.error('Não foi possível mostrar este perfil novamente.');
    } finally { setBusyHiddenId(null); }
  };

  const loading = tab === 'blocked' ? isFetchingBlocked : loadingHidden;
  const empty = tab === 'blocked' ? blockedUsers.length === 0 : hiddenProfiles.length === 0;

  return (
    <>
      <ModalShell
        onClose={onClose}
        size="md"
        icon="shield"
        eyebrow="Privacidade"
        title="Bloqueados e ocultos"
        description="Gerencie quem foi bloqueado e quem apenas deixou de aparecer na sua descoberta."
      >
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-[18px] border border-white/[0.07] bg-black/15 p-1.5">
          <button type="button" onClick={() => setTab('blocked')} className={`min-h-[40px] rounded-[13px] text-xs font-black transition ${tab === 'blocked' ? 'bg-white text-black' : 'text-white/45 hover:bg-white/[0.04]'}`}>Bloqueados · {blockedUsers.length}</button>
          <button type="button" onClick={() => setTab('hidden')} className={`min-h-[40px] rounded-[13px] text-xs font-black transition ${tab === 'hidden' ? 'bg-white text-black' : 'text-white/45 hover:bg-white/[0.04]'}`}>Ocultos · {hiddenProfiles.length}</button>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[68px] animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.035]" />)}</div>
        ) : empty ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-tertiary-500/10 text-tertiary-500"><span className="material-symbols-rounded text-3xl">{tab === 'blocked' ? 'shield' : 'visibility'}</span></div>
            <h3 className="mt-4 font-bricolage text-lg font-black text-white">Tudo tranquilo por aqui</h3>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/42">{tab === 'blocked' ? 'Você ainda não bloqueou nenhum perfil.' : 'Você não tem nenhum perfil oculto da descoberta.'}</p>
          </div>
        ) : tab === 'blocked' ? (
          <div className="space-y-2">
            {blockedUsers.map((user) => (
              <div key={user.blocked_id} className="flex min-h-[68px] items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-2.5 pl-3">
                <img src={getPublicImageUrl(user.avatar_url)} alt={user.username} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white/75">{user.username}</p><p className="text-[11px] font-semibold text-white/28">Interações bloqueadas</p></div>
                <Button variant="secondary" className="!min-h-[42px] !rounded-[15px] !px-3 !text-xs" onClick={() => setUserToUnblock(user)}>{t('blocked.unblock', { defaultValue: 'Desbloquear' })}</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {hiddenProfiles.map((user) => (
              <div key={user.hidden_id} className="flex min-h-[68px] items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-2.5 pl-3">
                <img src={getPublicImageUrl(user.avatar_url)} alt={user.username} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white/75">{user.username || 'Perfil'}</p><p className="text-[11px] font-semibold text-white/28">Oculto de Próximos e Populares</p></div>
                <Button variant="secondary" disabled={busyHiddenId === user.hidden_id} className="!min-h-[42px] !rounded-[15px] !px-3 !text-xs" onClick={() => setUserToUnhide(user)}>Mostrar novamente</Button>
              </div>
            ))}
          </div>
        )}
      </ModalShell>

      {userToUnblock && (
        <ConfirmationModal isOpen title={`Desbloquear ${userToUnblock.username}?`} message="Vocês poderão voltar a aparecer um para o outro e interagir normalmente." onConfirm={confirmUnblock} onCancel={() => setUserToUnblock(null)} confirmText={t('blocked.unblock', { defaultValue: 'Desbloquear' })} />
      )}
      {userToUnhide && (
        <ConfirmationModal isOpen title={`Mostrar ${userToUnhide.username || 'este perfil'} novamente?`} message="O perfil poderá voltar a aparecer em Próximos e Populares. Isso não cria conexão nem envia notificação à outra pessoa." onConfirm={confirmUnhide} onCancel={() => setUserToUnhide(null)} confirmText="Mostrar novamente" />
      )}
    </>
  );
};

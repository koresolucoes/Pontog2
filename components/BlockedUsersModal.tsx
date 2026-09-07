import React, { useEffect, useState } from 'react';
import { useUserActionsStore, BlockedUser } from '../stores/userActionsStore';
import { ConfirmationModal } from './ConfirmationModal';
import { getPublicImageUrl } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface BlockedUsersModalProps { onClose: () => void; }

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { blockedUsers, isFetchingBlocked, fetchBlockedUsers, unblockUser } = useUserActionsStore();
  const [userToUnblock, setUserToUnblock] = useState<BlockedUser | null>(null);

  useEffect(() => { fetchBlockedUsers(); }, [fetchBlockedUsers]);

  const confirmUnblock = async () => {
    if (!userToUnblock) return;
    await unblockUser(userToUnblock.blocked_id);
    setUserToUnblock(null);
  };

  return (
    <>
      <ModalShell
        onClose={onClose}
        size="md"
        icon="block"
        eyebrow="Privacidade"
        title={t('blocked.title', { defaultValue: 'Perfis bloqueados' })}
        description="Perfis nesta lista não aparecem para você e não podem iniciar novas interações."
      >
        {isFetchingBlocked ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[68px] animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.035]" />)}</div>
        ) : blockedUsers.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-tertiary-500/10 text-tertiary-500"><span className="material-symbols-rounded text-3xl">shield</span></div>
            <h3 className="mt-4 font-bricolage text-lg font-black text-white">Tudo tranquilo por aqui</h3>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/42">Você ainda não bloqueou nenhum perfil.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((user) => (
              <div key={user.blocked_id} className="flex min-h-[68px] items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-2.5 pl-3">
                <img src={getPublicImageUrl(user.avatar_url)} alt={user.username} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white/75">{user.username}</p><p className="text-[11px] font-semibold text-white/28">Interações bloqueadas</p></div>
                <Button variant="secondary" className="!min-h-[42px] !rounded-[15px] !px-3 !text-xs" onClick={() => setUserToUnblock(user)}>{t('blocked.unblock', { defaultValue: 'Desbloquear' })}</Button>
              </div>
            ))}
          </div>
        )}
      </ModalShell>

      {userToUnblock && (
        <ConfirmationModal
          isOpen
          title={`Desbloquear ${userToUnblock.username}?`}
          message="Vocês poderão voltar a aparecer um para o outro e interagir normalmente."
          onConfirm={confirmUnblock}
          onCancel={() => setUserToUnblock(null)}
          confirmText={t('blocked.unblock', { defaultValue: 'Desbloquear' })}
        />
      )}
    </>
  );
};

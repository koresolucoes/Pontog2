import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface AccountDeletionModalProps { onClose: () => void; }

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({ onClose }) => {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const canDelete = confirmation.trim().toUpperCase() === 'EXCLUIR';

  const handleDelete = async () => {
    if (!canDelete || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('authentication_required');

      const response = await fetch('/api/account-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: 'user_requested' }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'delete_failed');

      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast.error('Não foi possível excluir sua conta agora. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <ModalShell
      onClose={loading ? undefined : onClose}
      size="md"
      tone="danger"
      icon="delete_forever"
      eyebrow="Conta e privacidade"
      title="Excluir minha conta"
      description="Esta ação encerra seu acesso, remove seu conteúdo social e mídia e anonimiza os registros que precisam ser preservados por obrigações financeiras e de segurança."
      footer={
        <div className="grid grid-cols-[.8fr_1.2fr] gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} disabled={!canDelete}>Excluir conta</Button>
        </div>
      }
    >
      <div className="rounded-[20px] border border-red-500/18 bg-red-500/[0.07] p-4 text-sm leading-relaxed text-red-100/75">
        Conversas enviadas, conexões, favoritos, vídeos, álbuns e demais conteúdos associados à sua identidade serão removidos. A ação não pode ser desfeita.
      </div>
      <label className="mt-5 block">
        <span className="pg-eyebrow">Digite EXCLUIR para confirmar</span>
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="pg-field mt-2"
          placeholder="EXCLUIR"
        />
      </label>
    </ModalShell>
  );
};

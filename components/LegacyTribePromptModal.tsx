import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { LegalModal, type LegalDocType } from './LegalModals';

const TERMS_VERSION = '2026-09-07';
const PRIVACY_VERSION = '2026-09-07';

export const LegacyTribePromptModal: React.FC = () => {
  const [consentRequired, setConsentRequired] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [documentsAccepted, setDocumentsAccepted] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(() => new URLSearchParams(window.location.search).get('recovery') === '1');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.rpc('get_my_consent_v1').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('Consent status failed:', error);
        return;
      }
      const current = data
        && data.terms_version === TERMS_VERSION
        && data.privacy_version === PRIVACY_VERSION
        && data.age_confirmed === true;
      setConsentRequired(!current);
    });
    return () => { cancelled = true; };
  }, []);

  const acceptConsent = async () => {
    if (!adultConfirmed || !documentsAccepted) return;
    setSavingConsent(true);
    const { error } = await supabase.rpc('accept_my_consent_v1', {
      p_terms_version: TERMS_VERSION,
      p_privacy_version: PRIVACY_VERSION,
      p_age_confirmed: true,
    });
    if (error) {
      console.error('Consent acceptance failed:', error);
      if (String(error.message).includes('underage_not_allowed')) {
        toast.error('Esta conta não atende ao requisito de idade do Ponto G.');
      } else toast.error('Não foi possível registrar seu aceite.');
      setSavingConsent(false);
      return;
    }
    setConsentRequired(false);
    setSavingConsent(false);
    toast.success('Preferências de privacidade atualizadas.');
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) return toast.error('Use pelo menos 8 caracteres.');
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Não foi possível atualizar a senha.');
      setPasswordLoading(false);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('recovery');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    setRecoveryOpen(false);
    setNewPassword('');
    setPasswordLoading(false);
    toast.success('Senha atualizada com sucesso.');
  };

  return (
    <>
      {consentRequired && !recoveryOpen && (
        <ModalShell
          onClose={undefined}
          size="md"
          icon="verified_user"
          eyebrow="Privacidade e segurança"
          title="Antes de continuar"
          description="Atualizamos a forma como explicamos privacidade, segurança e uso do Ponto G. Seu aceite fica registrado com a versão dos documentos."
          footer={<Button variant="primary" onClick={acceptConsent} loading={savingConsent} disabled={!adultConfirmed || !documentsAccepted}>Aceitar e continuar</Button>}
        >
          <div className="space-y-3">
            <label className="flex gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-4"><input type="checkbox" checked={adultConfirmed} onChange={(e) => setAdultConfirmed(e.target.checked)} className="mt-1"/><span className="text-sm leading-relaxed text-white/60">Confirmo que tenho 18 anos ou mais.</span></label>
            <label className="flex gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-4"><input type="checkbox" checked={documentsAccepted} onChange={(e) => setDocumentsAccepted(e.target.checked)} className="mt-1"/><span className="text-sm leading-relaxed text-white/60">Li e aceito os Termos de Uso e a Política de Privacidade vigentes.</span></label>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setLegalDoc('terms')} className="pg-btn pg-btn-secondary !text-xs">Ler termos</button><button type="button" onClick={() => setLegalDoc('privacy')} className="pg-btn pg-btn-secondary !text-xs">Ler privacidade</button></div>
          </div>
        </ModalShell>
      )}

      {recoveryOpen && (
        <ModalShell
          onClose={undefined}
          size="sm"
          icon="lock_reset"
          eyebrow="Segurança da conta"
          title="Escolha uma nova senha"
          description="Use uma senha exclusiva, com pelo menos 8 caracteres."
          footer={<Button variant="primary" onClick={updatePassword} loading={passwordLoading} disabled={newPassword.length < 8}>Salvar nova senha</Button>}
        >
          <label className="block"><span className="pg-eyebrow">Nova senha</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pg-field mt-2" placeholder="mínimo 8 caracteres" /></label>
        </ModalShell>
      )}

      {legalDoc && <LegalModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </>
  );
};

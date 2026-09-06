import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Megaphone, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../../stores/authStore';
import { useOwnerStore } from '../../../stores/ownerStore';

interface WalletContext {
  id: string;
  venue_id: string;
  balance: number | string;
  currency: string;
}

interface CampaignRecord {
  id: string;
  title: string;
  message: string;
  placement?: string | null;
  status: string;
  cost?: number | string | null;
  estimated_reach?: number | null;
  views_count?: number | null;
  clicks_count?: number | null;
  created_at?: string;
}

interface TransactionRecord {
  id: string;
  amount: number | string;
  type: string;
  description?: string | null;
  created_at?: string;
}

const previewReach = (placement: string, duration: number, range: number): number => {
  if (placement === 'push') {
    if (range <= 500) return 1500;
    if (range <= 2000) return 5000;
    if (range <= 5000) return 12000;
    if (range <= 15000) return 35000;
    return 50000;
  }
  return duration * (placement === 'map' ? 300 : placement === 'messages' ? 80 : 150);
};

const serverRequest = async <T,>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Operação não concluída.');
  return payload as T;
};

export const OwnerMarketingSecureView: React.FC = () => {
  const { user, session } = useAuthStore();
  const { managedVenues, fetchManagedVenues } = useOwnerStore();

  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'analytics' | 'wallet'>('campaigns');
  const [wallet, setWallet] = useState<WalletContext | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignPlacement, setCampaignPlacement] = useState<'push' | 'feed' | 'map' | 'messages'>('feed');
  const [campaignDuration, setCampaignDuration] = useState(24);
  const [campaignCtaText, setCampaignCtaText] = useState('Saiba Mais');
  const [campaignCtaUrl, setCampaignCtaUrl] = useState('');
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [campaignTargetTribe, setCampaignTargetTribe] = useState('Geral');
  const [campaignRange, setCampaignRange] = useState(500);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [addingCreditsAmount, setAddingCreditsAmount] = useState(50);

  useEffect(() => {
    if (user) void fetchManagedVenues(user.id);
  }, [user, fetchManagedVenues]);

  useEffect(() => {
    if (!managedVenues.length) {
      setSelectedVenueId('');
      setWallet(null);
      setCampaigns([]);
      setTransactions([]);
      return;
    }

    if (!selectedVenueId || !managedVenues.some(venue => venue.id === selectedVenueId)) {
      setSelectedVenueId(managedVenues[0].id);
    }
  }, [managedVenues, selectedVenueId]);

  const loadContext = async (venueId: string) => {
    if (!session?.access_token || !venueId) return;
    setLoadingContext(true);
    try {
      const data = await serverRequest<{
        wallet: WalletContext;
        campaigns: CampaignRecord[];
        transactions: TransactionRecord[];
      }>(`/api/owner/b2b-context?venueId=${encodeURIComponent(venueId)}`, session.access_token);

      setWallet(data.wallet);
      setCampaigns(data.campaigns || []);
      setTransactions(data.transactions || []);
    } catch (error: any) {
      console.error('Failed to load owner B2B context:', error);
      setWallet(null);
      setCampaigns([]);
      setTransactions([]);
      toast.error(error.message || 'Não foi possível carregar o Hub de Marketing.');
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    if (selectedVenueId) void loadContext(selectedVenueId);
  }, [selectedVenueId, session?.access_token]);

  const estimatedReach = useMemo(
    () => previewReach(campaignPlacement, campaignDuration, campaignRange),
    [campaignPlacement, campaignDuration, campaignRange],
  );
  const estimatedCost = estimatedReach * (campaignPlacement === 'push' ? 0.10 : 0.05);
  const balance = Number(wallet?.balance || 0);

  const handleSendCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.access_token || !selectedVenueId) return;
    if (!campaignTitle.trim() || !campaignMessage.trim()) {
      toast.error('Preencha o título e a mensagem do anúncio.');
      return;
    }

    setIsSendingCampaign(true);
    const toastId = toast.loading('Validando campanha e saldo...');
    try {
      const result = await serverRequest<{
        campaign: { campaign_id: string; estimated_reach: number; cost: number | string; balance: number | string };
      }>('/api/owner/create-campaign', session.access_token, {
        method: 'POST',
        body: JSON.stringify({
          venueId: selectedVenueId,
          title: campaignTitle,
          message: campaignMessage,
          targetTribe: campaignTargetTribe,
          placement: campaignPlacement,
          durationHours: campaignDuration,
          rangeMeters: campaignRange,
          imageUrl: campaignImageUrl || null,
          ctaText: campaignCtaText,
          ctaUrl: campaignCtaUrl || null,
        }),
      });

      setCampaignTitle('');
      setCampaignMessage('');
      setCampaignImageUrl('');
      setCampaignCtaUrl('');
      setCampaignCtaText('Saiba Mais');
      await loadContext(selectedVenueId);

      toast.success(
        `Campanha ativada: ~${result.campaign.estimated_reach} pessoas · R$ ${Number(result.campaign.cost).toFixed(2)}.`,
        { id: toastId },
      );
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar campanha.', { id: toastId });
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const handleToggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    if (!session?.access_token) return;
    const nextStatus = currentStatus === 'approved' ? 'paused' : 'approved';
    const toastId = toast.loading(nextStatus === 'paused' ? 'Pausando campanha...' : 'Reativando campanha...');

    try {
      await serverRequest('/api/owner/campaign-status', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ campaignId, status: nextStatus }),
      });
      if (selectedVenueId) await loadContext(selectedVenueId);
      toast.success(nextStatus === 'paused' ? 'Campanha pausada.' : 'Campanha reativada.', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível alterar a campanha.', { id: toastId });
    }
  };

  const handleAddCredits = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.access_token || !wallet?.id) return;
    if (addingCreditsAmount < 10) {
      toast.error('O valor mínimo para recarga é R$ 10,00.');
      return;
    }

    const toastId = toast.loading('Gerando pagamento no Mercado Pago...');
    try {
      const data = await serverRequest<{ init_point: string }>(
        '/api/owner/create-wallet-preference',
        session.access_token,
        {
          method: 'POST',
          body: JSON.stringify({ amount: Number(addingCreditsAmount), walletId: wallet.id }),
        },
      );
      toast.success('Redirecionando para o pagamento...', { id: toastId });
      window.location.href = data.init_point;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar pagamento.', { id: toastId });
    }
  };

  if (!managedVenues.length) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-amber-200">
          <div className="flex items-start gap-3">
            <span className="material-symbols-rounded text-2xl">verified_user</span>
            <div>
              <h2 className="font-bold text-lg">Nenhum local aprovado sob sua propriedade</h2>
              <p className="text-sm text-amber-100/70 mt-1">
                Para proteger saldo, campanhas e dados do estabelecimento, o Hub de Marketing só é liberado após uma reivindicação aprovada.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      <div className="bg-slate-900/40 p-4 border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-outfit text-white">Hub de Marketing & Ads</h2>
          <p className="text-sm text-slate-400 mt-1">Campanhas, carteira e métricas protegidas por ownership do estabelecimento.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-400">Local Ativo:</span>
          <select
            className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 font-bold text-sm text-white focus:outline-none focus:border-primary-500"
            value={selectedVenueId}
            onChange={event => setSelectedVenueId(event.target.value)}
          >
            {managedVenues.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex border-b border-white/5 gap-1 overflow-x-auto pb-px">
        <button onClick={() => setActiveSubTab('campaigns')} className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 ${activeSubTab === 'campaigns' ? 'border-primary-500 text-primary-500' : 'border-transparent text-slate-400'}`}>
          <Megaphone className="w-4 h-4" /> Criador de Ads
        </button>
        <button onClick={() => setActiveSubTab('analytics')} className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 ${activeSubTab === 'analytics' ? 'border-primary-500 text-primary-500' : 'border-transparent text-slate-400'}`}>
          <TrendingUp className="w-4 h-4" /> Analytics & Campanhas
        </button>
        <button onClick={() => setActiveSubTab('wallet')} className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 ${activeSubTab === 'wallet' ? 'border-primary-500 text-primary-500' : 'border-transparent text-slate-400'}`}>
          <Wallet className="w-4 h-4" /> Carteira & Saldo
        </button>
      </div>

      {loadingContext && <div className="text-sm text-slate-400">Atualizando dados protegidos...</div>}

      {activeSubTab === 'campaigns' && (
        <form onSubmit={handleSendCampaign} className="max-w-3xl mx-auto bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">Construtor de Anúncios</h3>
            <p className="text-xs text-slate-400 mt-1">O valor exibido é uma estimativa; o custo final é recalculado e debitado atomicamente pelo servidor.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ['push', 'Push'], ['feed', 'Feed'], ['map', 'Mapa'], ['messages', 'Inbox']
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setCampaignPlacement(id as typeof campaignPlacement)} className={`p-3 rounded-xl border text-sm font-bold ${campaignPlacement === id ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-slate-950 border-white/5 text-slate-400'}`}>
                {label}
              </button>
            ))}
          </div>

          <input value={campaignTitle} onChange={event => setCampaignTitle(event.target.value)} maxLength={120} required placeholder="Título do anúncio" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
          <textarea value={campaignMessage} onChange={event => setCampaignMessage(event.target.value)} maxLength={1000} required placeholder="Mensagem principal" className="w-full min-h-28 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={campaignDuration} onChange={event => setCampaignDuration(Number(event.target.value))} className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
              <option value={12}>12 horas</option><option value={24}>24 horas</option><option value={72}>72 horas</option><option value={168}>168 horas</option>
            </select>
            <input value={campaignTargetTribe} onChange={event => setCampaignTargetTribe(event.target.value)} placeholder="Público / tribo" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
          </div>

          {campaignPlacement === 'push' && (
            <div>
              <label className="text-xs text-slate-400">Raio: {campaignRange} m</label>
              <input type="range" min={100} max={50000} step={100} value={campaignRange} onChange={event => setCampaignRange(Number(event.target.value))} className="w-full" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={campaignCtaText} onChange={event => setCampaignCtaText(event.target.value)} placeholder="Texto do botão" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
            <input type="url" value={campaignCtaUrl} onChange={event => setCampaignCtaUrl(event.target.value)} placeholder="https://... (opcional)" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
          </div>
          <input type="url" value={campaignImageUrl} onChange={event => setCampaignImageUrl(event.target.value)} placeholder="URL da imagem (opcional)" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />

          <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex justify-between gap-4">
            <div><p className="text-xs text-slate-400">Alcance estimado</p><p className="font-bold text-primary-400">~{estimatedReach} pessoas</p></div>
            <div className="text-right"><p className="text-xs text-slate-400">Estimativa de custo</p><p className="font-black text-white">R$ {estimatedCost.toFixed(2)}</p><p className="text-[10px] text-slate-500">Saldo: R$ {balance.toFixed(2)}</p></div>
          </div>

          <button type="submit" disabled={isSendingCampaign || !wallet} className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl">
            {isSendingCampaign ? 'Validando e debitando...' : 'Ativar campanha'}
          </button>
        </form>
      )}

      {activeSubTab === 'analytics' && (
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white">Campanhas Ativas & Histórico</h3>
          {!campaigns.length ? <p className="text-sm text-slate-500">Nenhuma campanha registrada.</p> : campaigns.map(campaign => (
            <div key={campaign.id} className="bg-slate-950 border border-white/5 p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${campaign.status === 'approved' ? 'bg-green-500' : 'bg-slate-600'}`} /><h4 className="font-bold text-white text-sm">{campaign.title}</h4></div>
                <p className="text-xs text-slate-400 mt-1">{campaign.message}</p>
                <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-500 mt-2">
                  <span>Alcance: {campaign.estimated_reach || 0}</span><span>Visitas: {campaign.views_count || 0}</span><span>Cliques: {campaign.clicks_count || 0}</span><span>Gasto: R$ {Number(campaign.cost || 0).toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => void handleToggleCampaignStatus(campaign.id, campaign.status)} className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-200">
                {campaign.status === 'approved' ? 'Pausar' : 'Reativar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'wallet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> Carteira de Anúncios</h3>
            <div className="bg-slate-950 p-6 rounded-2xl text-center"><span className="text-[10px] text-slate-500 uppercase">Saldo disponível</span><p className="text-4xl font-black text-white mt-1">R$ {balance.toFixed(2)}</p></div>
            <form onSubmit={handleAddCredits} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">{[50, 150, 500].map(value => <button key={value} type="button" onClick={() => setAddingCreditsAmount(value)} className={`p-3 rounded-xl border text-sm font-bold ${addingCreditsAmount === value ? 'border-primary-500 text-primary-400 bg-primary-500/10' : 'border-white/10 text-slate-300'}`}>R$ {value}</button>)}</div>
              <input type="number" min={10} step="0.01" value={addingCreditsAmount} onChange={event => setAddingCreditsAmount(Number(event.target.value))} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" />
              <button type="submit" disabled={!wallet} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl">Adicionar créditos</button>
            </form>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Movimentações</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!transactions.length ? <p className="text-sm text-slate-500">Nenhuma movimentação.</p> : transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div><p className="text-sm text-slate-200">{tx.description || tx.type}</p><p className="text-[10px] text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleString('pt-BR') : ''}</p></div>
                  <span className={`font-mono font-bold ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>{Number(tx.amount) >= 0 ? '+' : ''}R$ {Number(tx.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

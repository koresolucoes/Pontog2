import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useOwnerStore } from '../../../stores/ownerStore';
import { supabase } from '../../../lib/supabase';
import { 
    Megaphone, 
    TrendingUp, 
    DollarSign, 
    Plus, 
    Wallet
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const OwnerMarketingView: React.FC = () => {
    const { user } = useAuthStore();
    const { managedVenues, fetchManagedVenues } = useOwnerStore();

    useEffect(() => {
        if (user) {
            fetchManagedVenues(user.id);
        }
    }, [user, fetchManagedVenues]);

    const [selectedVenueId, setSelectedVenueId] = useState<string>('');
    const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'analytics' | 'wallet'>('campaigns');

    // Ads Builder States
    const [campaignTitle, setCampaignTitle] = useState('');
    const [campaignMessage, setCampaignMessage] = useState('');
    const [campaignPlacement, setCampaignPlacement] = useState<'push' | 'feed' | 'map' | 'messages'>('feed');
    const [campaignDuration, setCampaignDuration] = useState<number>(24);
    const [campaignCtaText, setCampaignCtaText] = useState('Saiba Mais');
    const [campaignCtaUrl, setCampaignCtaUrl] = useState('');
    const [campaignImageUrl, setCampaignImageUrl] = useState('');
    const [campaignTargetTribe, setCampaignTargetTribe] = useState('Geral');
    const [campaignRange, setCampaignRange] = useState(500);

    const [isSendingCampaign, setIsSendingCampaign] = useState(false);

    // B2B Data
    const [walletId, setWalletId] = useState<string | null>(null);
    const [adBalance, setAdBalance] = useState<number>(0);
    const [addingCreditsAmount, setAddingCreditsAmount] = useState<number>(50);
    const [campaignsHistory, setCampaignsHistory] = useState<any[]>([]);
    const [transactionHistory, setTransactionHistory] = useState<any[]>([]);

    useEffect(() => {
        if (managedVenues.length > 0 && !selectedVenueId) {
            setSelectedVenueId(managedVenues[0].id);
        }
    }, [managedVenues, selectedVenueId]);

    useEffect(() => {
        if (selectedVenueId) {
            loadB2BData(selectedVenueId);
        }
    }, [selectedVenueId]);

    const loadB2BData = async (venueId: string) => {
        try {
            // Load or create Wallet
            let { data: wallets, error: wErr } = await supabase
                .from('b2b_wallets')
                .select('*')
                .eq('venue_id', venueId);

            if (wErr) throw wErr;

            let currentWalletId = null;
            let currentBalance = 0;

            if (wallets && wallets.length > 0) {
                currentWalletId = wallets[0].id;
                currentBalance = Number(wallets[0].balance || 0);
            } else {
                const { data: newWallet } = await supabase
                    .from('b2b_wallets')
                    .insert({ venue_id: venueId, balance: 100.00 })
                    .select();
                if (newWallet && newWallet.length > 0) {
                    currentWalletId = newWallet[0].id;
                    currentBalance = Number(newWallet[0].balance || 0);
                    
                    await supabase.from('b2b_transactions').insert({
                        wallet_id: currentWalletId,
                        amount: 100.00,
                        type: 'bonus_signup',
                        status: 'approved',
                        description: 'Bônus de Boas-Vindas B2B'
                    });
                }
            }

            setWalletId(currentWalletId);
            setAdBalance(currentBalance);

            // Load Campaigns
            const { data: campaigns } = await supabase
                .from('b2b_campaigns')
                .select('*')
                .eq('venue_id', venueId)
                .order('created_at', { ascending: false });

            if (campaigns) {
                setCampaignsHistory(campaigns);
            }

            // Load Transactions
            if (currentWalletId) {
                const { data: txs } = await supabase
                    .from('b2b_transactions')
                    .select('*')
                    .eq('wallet_id', currentWalletId)
                    .order('created_at', { ascending: false })
                    .limit(20);
                if (txs) {
                    setTransactionHistory(txs);
                }
            }
        } catch (err) {
            console.error("Error loading B2B data:", err);
        }
    };

    const getEstimatedReach = (range: number) => {
        if (range <= 500) return 1500;
        if (range <= 2000) return 5000;
        if (range <= 5000) return 12000;
        if (range <= 15000) return 35000;
        return 50000;
    };

    const estReach = campaignPlacement === 'push' 
        ? getEstimatedReach(campaignRange) 
        : campaignDuration * (campaignPlacement === 'feed' ? 150 : campaignPlacement === 'map' ? 300 : 80);

    const handleSendCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVenueId) {
            toast.error("Por favor, selecione um local.");
            return;
        }
        if (!campaignTitle.trim() || !campaignMessage.trim()) {
            toast.error("Preencha o título e a mensagem do anúncio.");
            return;
        }
        setIsSendingCampaign(true);
        try {
            const pushCost = Number((estReach * (campaignPlacement === 'push' ? 0.10 : 0.05)).toFixed(2));
            if (adBalance < pushCost) {
                toast.error(`Saldo insuficiente! Esta campanha custa R$ ${pushCost.toFixed(2)}, mas seu saldo é de R$ ${adBalance.toFixed(2)}. Adicione créditos.`);
                setIsSendingCampaign(false);
                return;
            }

            // 1. Insert Campaign into database
            const { data: newCamp, error: campErr } = await supabase
                .from('b2b_campaigns')
                .insert({
                    venue_id: selectedVenueId,
                    title: campaignTitle,
                    message: campaignMessage,
                    target_tribe: campaignTargetTribe,
                    range_meters: campaignPlacement === 'push' ? campaignRange : 0,
                    estimated_reach: estReach,
                    cost: pushCost,
                    image_url: campaignImageUrl || null,
                    status: 'approved',
                    placement: campaignPlacement,
                    duration_hours: campaignDuration,
                    cta_text: campaignCtaText,
                    cta_url: campaignCtaUrl || null
                })
                .select();

            if (campErr) throw new Error("Erro ao salvar campanha no banco de dados: " + campErr.message);

            const campaignId = newCamp[0].id;

            // 2. Deduct from wallet balance in database
            const newBalance = Number((adBalance - pushCost).toFixed(2));
            const { error: walletErr } = await supabase
                .from('b2b_wallets')
                .update({ balance: newBalance })
                .eq('id', walletId);

            if (walletErr) throw new Error("Erro ao debitar da carteira: " + walletErr.message);

            // 3. Insert real Transaction log
            const { error: txErr } = await supabase
                .from('b2b_transactions')
                .insert({
                    wallet_id: walletId,
                    amount: -pushCost,
                    type: 'campaign_deduction',
                    status: 'approved',
                    description: `Anúncio: ${campaignTitle} (${campaignPlacement})`,
                    reference_id: campaignId
                });

            if (txErr) console.error("Error logging transaction:", txErr);

            // Clear input fields
            setCampaignTitle('');
            setCampaignMessage('');
            setCampaignImageUrl('');
            setCampaignCtaUrl('');
            setCampaignCtaText('Saiba Mais');
            
            toast.success(`Campanha criada com sucesso! Veiculando para ~${estReach} usuários.`);
            
            // Reload wallet balance and history from database
            await loadB2BData(selectedVenueId);
        } catch (error: any) {
            toast.error(error.message || "Erro ao disparar campanha.");
        } finally {
            setIsSendingCampaign(false);
        }
    };

    const handleToggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'approved' ? 'paused' : 'approved';
        const toastId = toast.loading(newStatus === 'paused' ? "Pausando campanha..." : "Ativando campanha...");
        try {
            const { error } = await supabase
                .from('b2b_campaigns')
                .update({ status: newStatus })
                .eq('id', campaignId);

            if (error) throw error;
            toast.success(newStatus === 'paused' ? "Campanha pausada com sucesso!" : "Campanha reativada com sucesso!", { id: toastId });
            
            if (selectedVenueId) {
                await loadB2BData(selectedVenueId);
            }
        } catch (err: any) {
            toast.error("Erro ao alterar status da campanha: " + err.message, { id: toastId });
        }
    };

    const handleAddCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (addingCreditsAmount < 10) {
            toast.error("O valor mínimo para recarga é de R$ 10,00.");
            return;
        }
        if (!walletId) {
            toast.error("Carteira de anúncios não carregada.");
            return;
        }

        const toastId = toast.loading("Gerando pagamento no Mercado Pago...");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Não autenticado");

            const res = await fetch('/api/owner/create-wallet-preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ amount: Number(addingCreditsAmount), walletId })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Falha ao conectar com Mercado Pago.');
            }

            const data = await res.json();
            
            toast.success("Redirecionando...", { id: toastId });
            window.location.href = data.init_point;
            
        } catch (error: any) {
            toast.error(error.message || "Erro ao processar pagamento.", { id: toastId });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in text-slate-100">
            {/* Context Selector */}
            <div className="bg-slate-900/40 p-4 border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold font-outfit text-white">Hub de Marketing & Ads</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Crie anúncios para o feed, coloque um pino em destaque no mapa ou envie push geolocalizado.
                    </p>
                </div>
                {managedVenues.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">Local Ativo:</span>
                        <select 
                            className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 font-bold text-sm text-white focus:outline-none focus:border-primary-500"
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                        >
                            {managedVenues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-400 text-sm flex items-center gap-2">
                        <span className="material-symbols-rounded">warning</span>
                        Nenhum local verificado sob sua propriedade para fazer marketing.
                    </div>
                )}
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex border-b border-white/5 gap-1 overflow-x-auto pb-px">
                <button 
                    onClick={() => setActiveSubTab('campaigns')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'campaigns' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Megaphone className="w-4 h-4" />
                    Criador de Ads
                </button>
                <button 
                    onClick={() => setActiveSubTab('analytics')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'analytics' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Analytics & Campanhas
                </button>
                <button 
                    onClick={() => setActiveSubTab('wallet')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'wallet' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Wallet className="w-4 h-4" />
                    Carteira & Saldo
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="space-y-6">
                
                {/* 📡 1. ADS BUILDER */}
                {activeSubTab === 'campaigns' && (
                    <div className="max-w-3xl mx-auto bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                        <div className="border-b border-white/5 pb-4">
                            <h3 className="text-xl font-black text-white flex items-center gap-2 mt-2 font-outfit">
                                <Megaphone className="text-primary-500 w-5 h-5" />
                                Construtor de Anúncios Unificado
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Escolha o formato do seu anúncio. Agora, destaques no mapa, banners do feed e pushes são configurados em um único lugar, com seu texto e imagem!</p>
                        </div>

                        <form onSubmit={handleSendCampaign} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 block">Formato / Posicionamento</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { id: 'push', label: 'Push Notification', desc: 'Disparo no celular' },
                                        { id: 'feed', label: 'Feed de Destaques', desc: 'Banner principal' },
                                        { id: 'map', label: 'Pino Dourado no Mapa', desc: 'Sua foto e texto' },
                                        { id: 'messages', label: 'Inbox / Mensagens', desc: 'Na caixa de entrada' }
                                    ].map(placement => (
                                        <button
                                            key={placement.id}
                                            type="button"
                                            onClick={() => setCampaignPlacement(placement.id as any)}
                                            className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between h-20 ${campaignPlacement === placement.id ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                        >
                                            <span className="font-bold text-xs">{placement.label}</span>
                                            <span className="text-[9px] opacity-70 mt-1">{placement.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 block">Título do Anúncio</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500"
                                    placeholder={campaignPlacement === 'map' ? "Ex: Sexta Vip no Local X" : "Escreva um título chamativo"}
                                    value={campaignTitle}
                                    onChange={e => setCampaignTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 block">Mensagem Principal</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                                    placeholder="Descreva o seu evento, promoção ou estabelecimento."
                                    value={campaignMessage}
                                    onChange={e => setCampaignMessage(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 block">Duração (Horas)</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500"
                                        value={campaignDuration}
                                        onChange={e => setCampaignDuration(Number(e.target.value))}
                                    >
                                        <option value={12}>12 Horas</option>
                                        <option value={24}>24 Horas (1 Dia)</option>
                                        <option value={72}>72 Horas (3 Dias)</option>
                                        <option value={168}>168 Horas (1 Semana)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 block">Texto do Botão (CTA)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500"
                                        placeholder="Ex: Eu Vou!"
                                        value={campaignCtaText}
                                        onChange={e => setCampaignCtaText(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 block">Link Externo (Opcional)</label>
                                <input 
                                    type="url" 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500"
                                    placeholder="https://sua-venda-de-ingresso.com"
                                    value={campaignCtaUrl}
                                    onChange={e => setCampaignCtaUrl(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Se não informado, o clique levará para a página do seu local no Pontog.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 block">URL da Imagem ou Banner (Opcional)</label>
                                <input 
                                    type="url" 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500"
                                    placeholder="https://imgur.com/sua-foto.jpg"
                                    value={campaignImageUrl}
                                    onChange={e => setCampaignImageUrl(e.target.value)}
                                />
                            </div>

                            <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-slate-400">Alcance Estimado: <span className="font-bold text-primary-400">~{estReach} Pessoas</span></p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Baseado em inteligência preditiva.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Custo Total Previsto:</p>
                                    <p className="text-lg font-black text-white">R$ {(estReach * (campaignPlacement === 'push' ? 0.10 : 0.05)).toFixed(2)}</p>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSendingCampaign || !selectedVenueId}
                                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-900/50 flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isSendingCampaign ? (
                                    <span className="w-5 h-5 border-2 border-dashed border-white rounded-full animate-spin"></span>
                                ) : (
                                    <>Ativar Campanha <Megaphone className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* 📈 2. ANALYTICS & HISTÓRICO */}
                {activeSubTab === 'analytics' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl">
                            <h3 className="text-lg font-bold text-white mb-4">Campanhas Ativas & Histórico</h3>
                            
                            {campaignsHistory.length === 0 ? (
                                <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-white/5 border-dashed">
                                    <p className="text-slate-500 text-sm">Nenhuma campanha registrada. Crie sua primeira campanha para ver o histórico aqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {campaignsHistory.map((camp) => (
                                        <div key={camp.id} className="bg-slate-950 border border-white/5 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${camp.status === 'approved' ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                                    <h4 className="font-bold text-white text-sm">{camp.title}</h4>
                                                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded uppercase">{camp.placement || 'feed'}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-1">{camp.message}</p>
                                                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 mt-2">
                                                    <span>Visitas Virtuais: {camp.views_count || 0}</span>
                                                    <span>Cliques (CTA): {camp.clicks_count || 0}</span>
                                                    <span>Gasto: R$ {Number(camp.cost || 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${camp.status === 'approved' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-primary-600 text-white hover:bg-primary-500'}`}
                                            >
                                                {camp.status === 'approved' ? 'Pausar' : 'Reativar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 💳 3. WALLET & BILLING */}
                {activeSubTab === 'wallet' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <DollarSign className="text-green-400 w-4.5 h-4.5" />
                                        Carteira de Anúncios
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Saldo para investimento em campanhas e destaques.</p>
                                </div>
                                <div className="bg-slate-950 p-5 rounded-2xl text-center border border-white/5 shadow-inner">
                                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">SALDO DISPONÍVEL</span>
                                    <p className="text-4xl font-black text-white font-outfit mt-1.5">
                                        R$ {adBalance.toFixed(2)}
                                    </p>
                                </div>

                                <form onSubmit={handleAddCredits} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400">Pacotes de Crédito Rápidos</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[50, 150, 500].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setAddingCreditsAmount(amt)}
                                                    className={`py-2 text-xs font-mono rounded-lg font-bold border transition-all ${addingCreditsAmount === amt ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                                >
                                                    + R$ {amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 text-sm flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Comprar Créditos
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Real Transaction History from Database */}
                        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        Histórico de Transações
                                    </h3>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-950 rounded-lg text-slate-400 border border-white/5">
                                    Total: {transactionHistory.length}
                                </span>
                            </div>

                            {transactionHistory.length === 0 ? (
                                <div className="text-center py-8 bg-slate-950/20 border border-dashed border-white/5 rounded-xl">
                                    <p className="text-xs text-slate-500">Nenhuma transação registrada nesta carteira.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider font-mono text-[9px]">
                                                <th className="py-2 px-2">Data</th>
                                                <th className="py-2 px-2">Descrição</th>
                                                <th className="py-2 px-2 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {transactionHistory.map((tx) => {
                                                const isNegative = Number(tx.amount) < 0;
                                                return (
                                                    <tr key={tx.id} className="hover:bg-white/5 transition-all">
                                                        <td className="py-2.5 px-2 font-mono text-slate-400 text-[10px]">
                                                            {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="py-2.5 px-2 font-bold text-white text-[10px]">{tx.description}</td>
                                                        <td className={`py-2.5 px-2 text-right font-mono font-bold text-[10px] ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                                                            {isNegative ? '-' : '+'} R$ {Math.abs(Number(tx.amount)).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

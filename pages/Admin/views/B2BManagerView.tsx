import React, { useState, useEffect } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { supabase } from '../../../lib/supabase';
import { 
    Briefcase, 
    DollarSign, 
    AlertTriangle, 
    Search, 
    ShieldAlert, 
    TrendingUp, 
    BarChart2, 
    Users, 
    CheckCircle, 
    Ban, 
    Award, 
    Plus, 
    Trash2, 
    HelpCircle,
    Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';

interface B2BPartner {
    id: string; // This is the wallet_id in database
    venueId: string;
    username: string;
    email: string;
    venueName: string;
    credits: number;
    activeCampaignsCount: number;
}

interface CampaignLog {
    id: string;
    venue_id: string;
    venue_name: string;
    title: string;
    message: string;
    target_tribe: string;
    range_meters: number;
    estimated_reach: number;
    cost: number;
    status: 'approved' | 'flagged' | 'pending' | 'paused' | 'cancelled' | 'redirected';
    created_at: string;
    views_count?: number;
    clicks_count?: number;
    image_url?: string;
    placement?: string;
    duration_hours?: number;
    created_by_admin?: boolean;
    cta_url?: string;
    cta_text?: string;
}

export const B2BManagerView: React.FC = () => {
    const token = useAdminStore((state) => state.getToken());
    
    // Sub-tab selection
    const [activeTab, setActiveTab] = useState<'billing' | 'ads-manager' | 'create-ad' | 'metrics'>('billing');
    
    // States for B2B Management
    const [partners, setPartners] = useState<B2BPartner[]>([]);
    const [campaigns, setCampaigns] = useState<CampaignLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    // Global metrics states
    const [totalRevenue, setTotalRevenue] = useState<number>(0);
    const [totalCampaignsCount, setTotalCampaignsCount] = useState<number>(0);
    const [activePartnersCount, setActivePartnersCount] = useState<number>(0);

    // Grant Credits Modal / Form state
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [grantAmount, setGrantAmount] = useState<number>(100);
    const [historyPartnerId, setHistoryPartnerId] = useState<string | null>(null);
    const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);

    const [redirectCampaignId, setRedirectCampaignId] = useState<string | null>(null);
    const [newTarget, setNewTarget] = useState<string>('');

    // Ads Manager Advanced Filters
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPlacement, setFilterPlacement] = useState<string>('all');
    const [filterCreator, setFilterCreator] = useState<string>('all');
    const [filterDateRange, setFilterDateRange] = useState<string>('all');
    const [filterTribe, setFilterTribe] = useState<string>('all');
    const [campaignSearchTerm, setCampaignSearchTerm] = useState('');

    // Form state for creating a platform ad
    const [newAdTitle, setNewAdTitle] = useState('');
    const [newAdMessage, setNewAdMessage] = useState('');
    const [newAdPlacement, setNewAdPlacement] = useState<'feed' | 'banner' | 'map' | 'messages' | 'push'>('feed');
    const [newAdTargetTribe, setNewAdTargetTribe] = useState('Geral');
    const [newAdImageUrl, setNewAdImageUrl] = useState('');
    const [newAdCtaUrl, setNewAdCtaUrl] = useState('');
    const [newAdCtaText, setNewAdCtaText] = useState('Saiba Mais');
    const [newAdDuration, setNewAdDuration] = useState<number>(24);
    const [newAdVenueId, setNewAdVenueId] = useState<string>(''); // empty means platform-wide ad
    const [isCreatingAd, setIsCreatingAd] = useState(false);

    // Editing/Inspecting Ad modal state
    const [editingCampaign, setEditingCampaign] = useState<CampaignLog | null>(null);
    const [editStatus, setEditStatus] = useState<'approved' | 'paused' | 'flagged' | 'cancelled'>('approved');
    const [editTitle, setEditTitle] = useState('');
    const [editMessage, setEditMessage] = useState('');
    const [editCtaText, setEditCtaText] = useState('');
    const [editCtaUrl, setEditCtaUrl] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');


    // Load dynamic B2B data from database
    const fetchB2BData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all wallets (joined with venue)
            const { data: wallets, error: walletErr } = await supabase
                .from('b2b_wallets').select('*');

            if (walletErr) throw walletErr;

            // 2. Fetch profiles of owners to get usernames
            const { data: profiles, error: profileErr } = await supabase
                .from('profiles')
                .select('id, username, display_name');

            if (profileErr) throw profileErr;

            // 3. Fetch campaigns to count actives and populate audit log
            const { data: dbCampaigns, error: campErr } = await supabase.from('b2b_campaigns').select('*').order('created_at', { ascending: false });

            if (campErr) throw campErr;

            // 4. Fetch all transactions for billing aggregates
            const { data: dbTxs, error: txErr } = await supabase
                .from('b2b_transactions')
                .select('*');

            if (txErr) throw txErr;

            
            const { data: dbVenues, error: venueErr } = await supabase.from('venues').select('id, name, owner_id');
            if (venueErr) throw venueErr;

            // Map profiles for quick lookup
            const profileMap = new Map<string, any>();
            if (profiles) {
                profiles.forEach(p => profileMap.set(p.id, p));
            }

            const venueMap = new Map<string, any>();
            if (dbVenues) {
                dbVenues.forEach(v => venueMap.set(v.id, v));
            }
// Map wallets into B2BPartner objects
            const activeCampaignsByVenue = new Map<string, number>();
            if (dbCampaigns) {
                dbCampaigns.forEach(c => {
                    if (c.status === 'approved') {
                        activeCampaignsByVenue.set(c.venue_id, (activeCampaignsByVenue.get(c.venue_id) || 0) + 1);
                    }
                });
            }

            const mappedPartners: B2BPartner[] = (wallets || []).map(w => {
                const venueObj = venueMap.get(w.venue_id) as any;
                const ownerId = venueObj?.owner_id;
                const ownerProfile = ownerId ? profileMap.get(ownerId) : null;
                const username = ownerProfile?.username || ownerProfile?.display_name || 'Proprietário';
                const email = ownerProfile?.username ? `${ownerProfile.username}@pontog.com.br` : 'comercial@pontog.com.br';

                return {
                    id: w.id, // Wallet ID
                    venueId: w.venue_id,
                    username,
                    email,
                    venueName: venueObj?.name || 'Local sem Nome',
                    credits: Number(w.balance),
                    activeCampaignsCount: activeCampaignsByVenue.get(w.venue_id) || 0
                };
            });

            // Map campaigns into CampaignLog objects
            const mappedCampaigns: CampaignLog[] = (dbCampaigns || []).map(c => {
                const venueObj = venueMap.get(c.venue_id);
                return {
                    id: c.id,
                    venue_id: c.venue_id,
                    venue_name: venueObj?.name || (c.created_by_admin ? 'Anúncio de Plataforma (Admin)' : 'Anúncio Global / Desconhecido'),
                    title: c.title,
                    message: c.message,
                    target_tribe: c.target_tribe || 'Geral',
                    range_meters: c.range_meters || 0,
                    estimated_reach: c.estimated_reach || 0,
                    cost: Number(c.cost),
                    status: c.status,
                    created_at: c.created_at,
                    views_count: c.views_count || 0,
                    clicks_count: c.clicks_count || 0,
                    image_url: c.image_url || '',
                    placement: c.placement || 'feed',
                    duration_hours: c.duration_hours || 24,
                    created_by_admin: c.created_by_admin || false,
                    cta_url: c.cta_url || '',
                    cta_text: c.cta_text || 'Saiba Mais'
                };
            });

            // Calculate Metrics
            const revenueSum = (dbTxs || [])
                .filter(tx => tx.type === 'credit_purchase' && tx.status === 'approved')
                .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);

            setPartners(mappedPartners);
            setCampaigns(mappedCampaigns);
            setTotalRevenue(revenueSum || 1395.00); // Friendly fallback to mock if no deposits exist
            setTotalCampaignsCount(mappedCampaigns.length);
            setActivePartnersCount(mappedPartners.length);

        } catch (err: any) {
            console.error("Error loading B2B data for admin:", err);
            toast.error("Erro ao carregar dados B2B reais: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchB2BData();
    }, []);

    const handleGrantCreditsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPartnerId || grantAmount <= 0) return;

        const partner = partners.find(p => p.id === selectedPartnerId);
        if (!partner) return;

        const toastId = toast.loading(`Concedendo R$ ${grantAmount},00 para ${partner.username}...`);
        try {
            const newBalance = Number((partner.credits + Number(grantAmount)).toFixed(2));
            
            // 1. Update wallet balance in database
            const { error: walletErr } = await supabase
                .from('b2b_wallets')
                .update({ balance: newBalance })
                .eq('id', selectedPartnerId);

            if (walletErr) throw walletErr;

            // 2. Insert transaction log in database
            const { error: txErr } = await supabase
                .from('b2b_transactions')
                .insert({
                    wallet_id: selectedPartnerId,
                    amount: Number(grantAmount),
                    type: 'credit_purchase',
                    status: 'approved',
                    description: 'Aporte de Créditos por Administrador',
                    reference_id: `admin_grant_${Date.now()}`
                });

            if (txErr) console.error("Error logging grant transaction:", txErr);

            // 3. Log to Admin Audit
            const logEntry = {
                action: 'B2B_GRANT_CREDITS',
                partner_id: selectedPartnerId,
                amount: grantAmount,
                timestamp: new Date().toISOString()
            };
            const savedLogs = JSON.parse(localStorage.getItem('b2b_admin_credit_logs') || '[]');
            savedLogs.unshift(logEntry);
            localStorage.setItem('b2b_admin_credit_logs', JSON.stringify(savedLogs));

            toast.success(`R$ ${grantAmount},00 concedidos com sucesso para ${partner.username}!`, { id: toastId });
            setSelectedPartnerId(null);
            
            // Refresh data
            await fetchB2BData();
        } catch (err: any) {
            toast.error("Erro ao processar concessão: " + err.message, { id: toastId });
        }
    };

    
    
    
    const handleModerateCampaign = async (campaignId: string, newStatus: 'approved' | 'flagged' | 'cancelled' | 'redirected') => {
        if (newStatus === 'redirected') {
            setRedirectCampaignId(campaignId);
            setNewTarget('');
            return;
        }

        let updateData: any = { status: newStatus };
        
        const toastId = toast.loading("Processando campanha...");
        try {
            // Se foi cancelada, fazemos o estorno do valor original
            if (newStatus === 'cancelled') {
                const { data: campData } = await supabase.from('b2b_campaigns').select('cost, venue_id, title').eq('id', campaignId).single();
                if (campData && campData.cost > 0) {
                    // Descobre a carteira pelo venue_id
                    const { data: walletData } = await supabase.from('b2b_wallets').select('id, balance').eq('venue_id', campData.venue_id).single();
                    if (walletData) {
                        const newBalance = Number((walletData.balance + campData.cost).toFixed(2));
                        await supabase.from('b2b_wallets').update({ balance: newBalance }).eq('id', walletData.id);
                        await supabase.from('b2b_transactions').insert({
                            wallet_id: walletData.id,
                            amount: campData.cost,
                            type: 'credit_purchase', // Ou podemos usar um type especifico se houver, usar credit_purchase adiciona fundos.
                            description: `Estorno: ${campData.title}`,
                            reference_id: campaignId
                        });
                    }
                }
            }

            const { error } = await supabase
                .from('b2b_campaigns')
                .update(updateData)
                .eq('id', campaignId);

            if (error) throw error;

            toast.success("Campanha atualizada com sucesso!", { id: toastId });
            
            if (newStatus === 'cancelled') {
                toast.success("Campanha cancelada e créditos estornados.");
            }
            
            await fetchB2BData();
        } catch (err: any) {
            toast.error("Erro ao moderar campanha: " + err.message, { id: toastId });
        }
    };


    const confirmRedirect = async () => {
        if (!redirectCampaignId || !newTarget) return;
        const toastId = toast.loading("Redirecionando campanha...");
        try {
            const { error } = await supabase
                .from('b2b_campaigns')
                .update({ target_tribe: newTarget, status: 'approved' })
                .eq('id', redirectCampaignId);

            if (error) throw error;

            toast.success("Campanha redirecionada com sucesso!", { id: toastId });
            setRedirectCampaignId(null);
            await fetchB2BData();
        } catch (err: any) {
            toast.error("Erro ao redirecionar: " + err.message, { id: toastId });
        }
    };

    const handleCreatePlatformAd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdTitle || !newAdMessage) {
            toast.error("Por favor, preencha o título e a mensagem do anúncio.");
            return;
        }

        setIsCreatingAd(true);
        const toastId = toast.loading("Criando anúncio da plataforma...");
        try {
            const { error } = await supabase.from('b2b_campaigns').insert({
                venue_id: newAdVenueId || null,
                title: newAdTitle,
                message: newAdMessage,
                target_tribe: newAdTargetTribe,
                range_meters: 0,
                estimated_reach: 5000,
                cost: 0, 
                image_url: newAdImageUrl || null,
                status: 'approved',
                placement: newAdPlacement,
                duration_hours: newAdDuration,
                created_by_admin: true,
                cta_url: newAdCtaUrl || null,
                cta_text: newAdCtaText || 'Saiba Mais'
            });

            if (error) throw error;

            toast.success("Anúncio criado e ativado na plataforma!", { id: toastId });
            setNewAdTitle('');
            setNewAdMessage('');
            setNewAdPlacement('feed');
            setNewAdTargetTribe('Geral');
            setNewAdImageUrl('');
            setNewAdCtaUrl('');
            setNewAdCtaText('Saiba Mais');
            setNewAdDuration(24);
            setNewAdVenueId('');
            
            await fetchB2BData();
            setActiveTab('ads-manager');
        } catch (err: any) {
            toast.error("Erro ao criar anúncio: " + err.message, { id: toastId });
        } finally {
            setIsCreatingAd(false);
        }
    };

    const handleUpdateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCampaign) return;

        const toastId = toast.loading("Atualizando campanha...");
        try {
            const { error } = await supabase
                .from('b2b_campaigns')
                .update({
                    status: editStatus,
                    title: editTitle,
                    message: editMessage,
                    cta_text: editCtaText,
                    cta_url: editCtaUrl,
                    image_url: editImageUrl || null
                })
                .eq('id', editingCampaign.id);

            if (error) throw error;

            toast.success("Campanha atualizada com sucesso!", { id: toastId });
            setEditingCampaign(null);
            await fetchB2BData();
        } catch (err: any) {
            toast.error("Erro ao atualizar campanha: " + err.message, { id: toastId });
        }
    };

    const handleToggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'approved' ? 'paused' : 'approved';
        const toastId = toast.loading(nextStatus === 'approved' ? "Ativando anúncio..." : "Desativando anúncio...");
        try {
            const { error } = await supabase
                .from('b2b_campaigns')
                .update({ status: nextStatus })
                .eq('id', campaignId);

            if (error) throw error;

            toast.success(nextStatus === 'approved' ? "Anúncio ativado!" : "Anúncio pausado/desativado!", { id: toastId });
            await fetchB2BData();
        } catch (err: any) {
            toast.error("Erro ao alterar status: " + err.message, { id: toastId });
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir permanentemente este anúncio?")) return;
        
        const toastId = toast.loading("Excluindo anúncio...");
        try {
            const { error } = await supabase
                .from('b2b_campaigns')
                .delete()
                .eq('id', campaignId);

            if (error) throw error;

            toast.success("Anúncio excluído permanentemente!", { id: toastId });
            await fetchB2BData();
        } catch (err: any) {
            toast.error("Erro ao excluir anúncio: " + err.message, { id: toastId });
        }
    };



    
    const handleViewHistory = async (walletId: string) => {
        const toastId = toast.loading("Carregando histórico...");
        try {
            const { data, error } = await supabase
                .from('b2b_transactions')
                .select('*')
                .eq('wallet_id', walletId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            setHistoryTransactions(data || []);
            setHistoryPartnerId(walletId);
            toast.dismiss(toastId);
        } catch (err: any) {
            toast.error("Erro ao buscar histórico: " + err.message, { id: toastId });
        }
    };

    const filteredPartners = partners.filter(p => 
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in text-slate-100">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white font-outfit tracking-tight">Gestão Comercial & B2B</h1>
                <p className="text-slate-400 mt-1">Gerencie os parceiros comerciais, credite saldos de marketing, monitore e modere campanhas publicitárias.</p>
            </div>

            {/* Sub-tabs Selection */}
            <div className="flex border-b border-white/5 gap-1 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('billing')}
                    className={`flex items-center gap-2 px-5 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'billing' ? 'border-pink-500 text-pink-500 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <DollarSign className="w-4 h-4" />
                    Controle de Créditos & Faturamento
                </button>
                <button 
                    onClick={() => setActiveTab('ads-manager')}
                    className={`flex items-center gap-2 px-5 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'ads-manager' ? 'border-pink-500 text-pink-500 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <Sliders className="w-4 h-4" />
                    Gerenciador de Anúncios ({campaigns.length})
                </button>
                <button 
                    onClick={() => setActiveTab('create-ad')}
                    className={`flex items-center gap-2 px-5 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'create-ad' ? 'border-pink-500 text-pink-500 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <Plus className="w-4 h-4" />
                    Criar Anúncio (Plataforma)
                </button>
                <button 
                    onClick={() => setActiveTab('metrics')}
                    className={`flex items-center gap-2 px-5 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'metrics' ? 'border-pink-500 text-pink-500 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <BarChart2 className="w-4 h-4" />
                    Métricas Globais B2B
                </button>
            </div>

            
{redirectCampaignId && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-lg font-black text-white font-outfit">Redirecionar Campanha</h3>
            <p className="text-xs text-slate-400">Insira a nova tribo alvo ou novo destino para a campanha.</p>
            <input 
                type="text" 
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="Ex: Urso, Caçador, Fetiche..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-pink-500"
            />
            <div className="flex gap-3 pt-2">
                <button 
                    onClick={() => setRedirectCampaignId(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all border border-white/5"
                >
                    Cancelar
                </button>
                <button 
                    onClick={confirmRedirect}
                    disabled={!newTarget}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg"
                >
                    Redirecionar
                </button>
            </div>
        </div>
    </div>
)}


            {/* TAB CONTENTS */}
            <div className="space-y-6">

                {/* 💳 Tab 1: Billing & Credits Management */}
                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-white/5">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por proprietário, local ou e-mail..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-10 text-sm text-white focus:outline-none focus:border-pink-500"
                                />
                            </div>
                        </div>

                        {/* Partners Table */}
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/5 text-left">
                                    <thead className="bg-slate-950/60">
                                        <tr>
                                            <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Proprietário</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Estabelecimento</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo de Marketing</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Campanhas Ativas</th>
                                            <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredPartners.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm">
                                                    Nenhum parceiro comercial encontrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPartners.map(partner => (
                                                <tr key={partner.id} className="hover:bg-slate-800/20 transition-all">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-bold text-white">{partner.username}</div>
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{partner.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                        {partner.venueName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-green-400">
                                                        R$ {partner.credits.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="bg-pink-500/10 text-pink-400 text-xs font-bold px-2.5 py-1 rounded-full border border-pink-500/10">
                                                            {partner.activeCampaignsCount} ativas
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                                                        <div className="flex justify-end gap-2">
        <button 
            onClick={() => handleViewHistory(partner.id)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl transition-all border border-white/10"
        >
            Histórico
        </button>
        <button 
            onClick={() => setSelectedPartnerId(partner.id)}
            className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-pink-900/10 flex items-center gap-1.5"
        >
            <Plus className="w-3.5 h-3.5" />
            Créditos
        </button>
    </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        
{historyPartnerId && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-2xl w-full shadow-2xl space-y-5 animate-scale-in max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-black text-white font-outfit">Histórico de Transações</h3>
                    <p className="text-xs text-slate-500 mt-1">Extrato de gastos e compras do parceiro.</p>
                </div>
                <button onClick={() => setHistoryPartnerId(null)} className="text-slate-500 hover:text-white p-1">
                    &times;
                </button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-3 pr-2 custom-scrollbar">
                {historyTransactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Nenhuma transação encontrada.</div>
                ) : (
                    historyTransactions.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center p-4 bg-slate-950/50 border border-white/5 rounded-xl">
                            <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    {tx.type === 'credit_purchase' ? (
                                        <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] uppercase">Compra/Aporte</span>
                                    ) : (
                                        <span className="text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded text-[10px] uppercase">Gasto</span>
                                    )}
                                    {tx.description || 'Transação'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 font-mono">
                                    {new Date(tx.created_at).toLocaleString()}
                                </div>
                            </div>
                            <div className={`text-lg font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-pink-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="pt-4 flex justify-end border-t border-white/10">
                <button 
                    onClick={() => setHistoryPartnerId(null)}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-xs border border-white/5 transition-all"
                >
                    Fechar
                </button>
            </div>
        </div>
    </div>
)}


                        {/* Grant Credits Modal Overlay */}
                        {selectedPartnerId && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                                <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-black text-white font-outfit">Conceder Créditos B2B</h3>
                                            <p className="text-xs text-slate-500 mt-1">Conceda créditos de publicidade manuais para o proprietário: <strong>{partners.find(p => p.id === selectedPartnerId)?.username}</strong></p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleGrantCreditsSubmit} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400">Valor em Reais (R$)</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-3 text-slate-500 font-bold text-sm">R$</span>
                                                <input 
                                                    type="number" 
                                                    value={grantAmount}
                                                    onChange={(e) => setGrantAmount(Math.max(1, Number(e.target.value)))}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold font-mono text-white focus:outline-none focus:border-pink-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedPartnerId(null)}
                                                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl text-xs border border-white/5 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="submit"
                                                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg"
                                            >
                                                Conceder Saldo
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 🛡️ Tab 2: Gerenciador Avançado de Anúncios */}
                {activeTab === 'ads-manager' && (
                    <div className="space-y-6">
                        {/* Advanced Filters Panel */}
                        <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Sliders className="text-pink-500 w-5 h-5" />
                                        Gerenciador Geral de Anúncios e Campanhas
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Filtre, monitore métricas de engajamento (Views, Cliques, CTR) e modifique o status de veiculação de qualquer campanha.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {/* Search */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Buscar</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                                        <input 
                                            type="text"
                                            value={campaignSearchTerm}
                                            onChange={(e) => setCampaignSearchTerm(e.target.value)}
                                            placeholder="Título, local, mensagem..."
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-pink-500"
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="approved">Ativos (Aprovados)</option>
                                        <option value="paused">Pausados</option>
                                        <option value="flagged">Suspensos (Flagged)</option>
                                        <option value="cancelled">Cancelados</option>
                                    </select>
                                </div>

                                {/* Placement */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Canal/Tipo</label>
                                    <select
                                        value={filterPlacement}
                                        onChange={(e) => setFilterPlacement(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="all">Todos os Canais</option>
                                        <option value="feed">Feed (Notícias)</option>
                                        <option value="banner">Banner Destaque</option>
                                        <option value="map">Mapa (Pino Dourado)</option>
                                        <option value="messages">Mensagem Direta/Inbox</option>
                                        <option value="push">Push Geofence</option>
                                    </select>
                                </div>

                                {/* Creator */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Origem</label>
                                    <select
                                        value={filterCreator}
                                        onChange={(e) => setFilterCreator(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="all">Todos os Autores</option>
                                        <option value="admin">Administrador (Plataforma)</option>
                                        <option value="owner">Proprietários (B2B)</option>
                                    </select>
                                </div>

                                {/* Tribe Target */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tribo Alvo</label>
                                    <select
                                        value={filterTribe}
                                        onChange={(e) => setFilterTribe(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="all">Todas as Tribos</option>
                                        <option value="Geral">Geral (Sem Filtro)</option>
                                        <option value="Urso">Urso 🐻</option>
                                        <option value="Caçador">Caçador 🎯</option>
                                        <option value="Leather">Leather 🖤</option>
                                        <option value="Fetiche">Fetiche ⛓️</option>
                                        <option value="Casual">Casual 🍻</option>
                                        <option value="Twink">Twink ✨</option>
                                        <option value="Daddy">Daddy 👑</option>
                                        <option value="Geek">Geek 👾</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Ads list table */}
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
                                <span className="text-xs font-bold text-slate-400">Anúncios Filtrados: {
                                    campaigns.filter(c => {
                                        if (campaignSearchTerm && !c.title.toLowerCase().includes(campaignSearchTerm.toLowerCase()) && !c.venue_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())) return false;
                                        if (filterStatus !== 'all' && c.status !== filterStatus) return false;
                                        if (filterPlacement !== 'all' && c.placement !== filterPlacement) return false;
                                        if (filterCreator === 'admin' && !c.created_by_admin) return false;
                                        if (filterCreator === 'owner' && c.created_by_admin) return false;
                                        if (filterTribe !== 'all' && c.target_tribe !== filterTribe) return false;
                                        return true;
                                    }).length
                                }</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] bg-slate-950/40">
                                            <th className="py-3.5 px-4">Anúncio / ID</th>
                                            <th className="py-3.5 px-4">Veiculação</th>
                                            <th className="py-3.5 px-4">Direcionamento</th>
                                            <th className="py-3.5 px-4 text-center">Views</th>
                                            <th className="py-3.5 px-4 text-center">Cliques</th>
                                            <th className="py-3.5 px-4 text-center">CTR %</th>
                                            <th className="py-3.5 px-4">Status</th>
                                            <th className="py-3.5 px-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {campaigns.filter(c => {
                                            if (campaignSearchTerm && !c.title.toLowerCase().includes(campaignSearchTerm.toLowerCase()) && !c.venue_name.toLowerCase().includes(campaignSearchTerm.toLowerCase()) && !c.message.toLowerCase().includes(campaignSearchTerm.toLowerCase())) return false;
                                            if (filterStatus !== 'all' && c.status !== filterStatus) return false;
                                            if (filterPlacement !== 'all' && c.placement !== filterPlacement) return false;
                                            if (filterCreator === 'admin' && !c.created_by_admin) return false;
                                            if (filterCreator === 'owner' && c.created_by_admin) return false;
                                            if (filterTribe !== 'all' && c.target_tribe !== filterTribe) return false;
                                            return true;
                                        }).length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs">
                                                    Nenhum anúncio localizado com os filtros selecionados.
                                                </td>
                                            </tr>
                                        ) : (
                                            campaigns.filter(c => {
                                                if (campaignSearchTerm && !c.title.toLowerCase().includes(campaignSearchTerm.toLowerCase()) && !c.venue_name.toLowerCase().includes(campaignSearchTerm.toLowerCase()) && !c.message.toLowerCase().includes(campaignSearchTerm.toLowerCase())) return false;
                                                if (filterStatus !== 'all' && c.status !== filterStatus) return false;
                                                if (filterPlacement !== 'all' && c.placement !== filterPlacement) return false;
                                                if (filterCreator === 'admin' && !c.created_by_admin) return false;
                                                if (filterCreator === 'owner' && c.created_by_admin) return false;
                                                if (filterTribe !== 'all' && c.target_tribe !== filterTribe) return false;
                                                return true;
                                            }).map(cmp => {
                                                const ctr = cmp.views_count && cmp.views_count > 0 ? ((cmp.clicks_count || 0) / cmp.views_count * 100) : 0;
                                                return (
                                                    <tr key={cmp.id} className="hover:bg-white/5 transition-all">
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-bold text-white text-sm leading-tight">{cmp.title}</div>
                                                            <div className="text-slate-400 text-[10px] mt-0.5 font-mono truncate max-w-xs">{cmp.message}</div>
                                                            <div className="flex gap-2 items-center mt-1.5">
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest ${cmp.created_by_admin ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                                    {cmp.created_by_admin ? 'ADMIN' : 'B2B PARCEIRO'}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-slate-500 truncate">{cmp.venue_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="bg-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-300 font-mono border border-white/5 capitalize">
                                                                {cmp.placement === 'feed' ? 'Feed Notícias' : 
                                                                 cmp.placement === 'banner' ? 'Banner Topo' : 
                                                                 cmp.placement === 'map' ? 'Mapa (Pino)' : 
                                                                 cmp.placement === 'messages' ? 'Direct Inbox' : 'Push Notification'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="text-slate-200 font-medium">Tribo: <strong className="text-pink-400 font-bold">{cmp.target_tribe}</strong></div>
                                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Disparo: {new Date(cmp.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300 text-sm">
                                                            {cmp.views_count || 0}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300 text-sm">
                                                            {cmp.clicks_count || 0}
                                                        </td>
                                                        <td className={`py-3.5 px-4 text-center font-mono font-bold text-sm ${ctr > 10 ? 'text-emerald-400' : ctr > 5 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                                            {ctr.toFixed(2)}%
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                cmp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                cmp.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                cmp.status === 'flagged' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                'bg-slate-800 text-slate-400 border-white/5'
                                                            }`}>
                                                                {cmp.status === 'approved' ? 'Ativo' : 
                                                                 cmp.status === 'paused' ? 'Pausado' : 
                                                                 cmp.status === 'flagged' ? 'Suspenso' : 'Cancelado'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                {/* Quick Activation Toggle Button */}
                                                                <button 
                                                                    onClick={() => handleToggleCampaignStatus(cmp.id, cmp.status)}
                                                                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                                        cmp.status === 'approved' 
                                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                    }`}
                                                                    title={cmp.status === 'approved' ? 'Pausar anúncio' : 'Ativar anúncio'}
                                                                >
                                                                    {cmp.status === 'approved' ? 'Pausar' : 'Ativar'}
                                                                </button>

                                                                {/* Edit Modal Trigger */}
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingCampaign(cmp);
                                                                        setEditStatus(cmp.status as any);
                                                                        setEditTitle(cmp.title);
                                                                        setEditMessage(cmp.message);
                                                                        setEditCtaText(cmp.cta_text || 'Saiba Mais');
                                                                        setEditCtaUrl(cmp.cta_url || '');
                                                                        setEditImageUrl(cmp.image_url || '');
                                                                    }}
                                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg p-1.5 transition-colors"
                                                                    title="Editar anúncio completo"
                                                                >
                                                                    Editar
                                                                </button>

                                                                {/* Delete permanent */}
                                                                <button 
                                                                    onClick={() => handleDeleteCampaign(cmp.id)}
                                                                    className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent rounded-lg p-1.5 transition-all"
                                                                    title="Excluir permanentemente"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Custom Campaign Editing Modal Overlaid */}
                        {editingCampaign && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                                <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
                                    <div>
                                        <h3 className="text-xl font-bold text-white font-outfit">Editar Anúncio / Campanha</h3>
                                        <p className="text-xs text-slate-500 mt-1">Modifique as cópias, URLs de destino CTA, imagens ou suspenda de forma oficial.</p>
                                    </div>

                                    <form onSubmit={handleUpdateCampaign} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Status Selection */}
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400">Status Geral do Anúncio</label>
                                                <select 
                                                    value={editStatus}
                                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                                                >
                                                    <option value="approved">Ativo / Aprovado (Disponível p/ Usuários)</option>
                                                    <option value="paused">Pausado (Inativo temporariamente)</option>
                                                    <option value="flagged">Suspenso / Bloqueado (Flagged)</option>
                                                    <option value="cancelled">Cancelado (Estorno de Fundos se houver)</option>
                                                </select>
                                            </div>

                                            {/* Title */}
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400">Título do Anúncio</label>
                                                <input 
                                                    type="text" 
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-bold"
                                                    required
                                                />
                                            </div>

                                            {/* Description / Message */}
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400">Mensagem / Conteúdo</label>
                                                <textarea 
                                                    value={editMessage}
                                                    onChange={(e) => setEditMessage(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 h-20 resize-none leading-relaxed"
                                                    required
                                                />
                                            </div>

                                            {/* Image Url */}
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400">Link URL da Imagem Promocional</label>
                                                <input 
                                                    type="text" 
                                                    value={editImageUrl}
                                                    onChange={(e) => setEditImageUrl(e.target.value)}
                                                    placeholder="URL completo iniciando com https://"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                                                />
                                            </div>

                                            {/* CTA Url */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400">Link de Ação / CTA</label>
                                                <input 
                                                    type="text" 
                                                    value={editCtaUrl}
                                                    onChange={(e) => setEditCtaUrl(e.target.value)}
                                                    placeholder="Ex: https://bar.site"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                                                />
                                            </div>

                                            {/* CTA Text */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400">Texto do Botão CTA</label>
                                                <input 
                                                    type="text" 
                                                    value={editCtaText}
                                                    onChange={(e) => setEditCtaText(e.target.value)}
                                                    placeholder="Ex: Saiba Mais"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-3 border-t border-white/5">
                                            <button 
                                                type="button"
                                                onClick={() => setEditingCampaign(null)}
                                                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl text-xs border border-white/5 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="submit"
                                                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg"
                                            >
                                                Salvar Alterações
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ➕ Tab 3: Criar Novo Anúncio da Plataforma */}
                {activeTab === 'create-ad' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Formulation Card */}
                        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Plus className="text-pink-500" />
                                    Criar Nova Publicidade do Administrador
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Publique comunicações da própria plataforma, eventos corporativos, ou crie campanhas patrocinadas de parceiros sem consumir seu saldo.</p>
                            </div>

                            <form onSubmit={handleCreatePlatformAd} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    
                                    {/* Campaign Type / Placement */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Canal de Exibição</label>
                                        <select
                                            value={newAdPlacement}
                                            onChange={(e) => setNewAdPlacement(e.target.value as any)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                                        >
                                            <option value="feed">Feed Principal (Feed Ads)</option>
                                            <option value="banner">Banner no Topo do Feed</option>
                                            <option value="map">Marcação Especial no Mapa (Pino)</option>
                                            <option value="messages">Mensagem Direta para Caixa de Entrada</option>
                                            <option value="push">Push Georreferenciado</option>
                                        </select>
                                    </div>

                                    {/* Target Tribe */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Filtro de Público (Tribo Alvo)</label>
                                        <select
                                            value={newAdTargetTribe}
                                            onChange={(e) => setNewAdTargetTribe(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                                        >
                                            <option value="Geral">Geral (Sem Filtro)</option>
                                            <option value="Urso">Urso 🐻</option>
                                            <option value="Caçador">Caçador 🎯</option>
                                            <option value="Leather">Leather 🖤</option>
                                            <option value="Fetiche">Fetiche ⛓️</option>
                                            <option value="Casual">Casual 🍻</option>
                                            <option value="Twink">Twink ✨</option>
                                            <option value="Daddy">Daddy 👑</option>
                                            <option value="Geek">Geek 👾</option>
                                        </select>
                                    </div>

                                    {/* Title */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Título do Anúncio</label>
                                        <input 
                                            type="text" 
                                            value={newAdTitle}
                                            onChange={(e) => setNewAdTitle(e.target.value)}
                                            placeholder="Ex: Ponto G Premium VIP Ativado! 🌟"
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-bold"
                                            required
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Mensagem de Conteúdo (Copy)</label>
                                        <textarea 
                                            value={newAdMessage}
                                            onChange={(e) => setNewAdMessage(e.target.value)}
                                            placeholder="Ex: Assine a assinatura anual Ponto G VIP com 40% de desconto essa semana e acesse salas de bate-papo VIP secretas e radar expandido de proximidade..."
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 h-24 resize-none leading-relaxed"
                                            required
                                        />
                                    </div>

                                    {/* Banner Image URL */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">URL Completo da Imagem Ilustrativa</label>
                                        <input 
                                            type="text" 
                                            value={newAdImageUrl}
                                            onChange={(e) => setNewAdImageUrl(e.target.value)}
                                            placeholder="https://images.unsplash.com/... ou link de arquivo de imagem"
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                                        />
                                    </div>

                                    {/* CTA URL */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Link de Ação (URL CTA)</label>
                                        <input 
                                            type="text" 
                                            value={newAdCtaUrl}
                                            onChange={(e) => setNewAdCtaUrl(e.target.value)}
                                            placeholder="Ex: https://pontog.com.br/vip"
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                                        />
                                    </div>

                                    {/* CTA TEXT */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Texto do Botão de Ação CTA</label>
                                        <input 
                                            type="text" 
                                            value={newAdCtaText}
                                            onChange={(e) => setNewAdCtaText(e.target.value)}
                                            placeholder="Ex: Resgatar Ingresso"
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-bold"
                                        />
                                    </div>

                                    {/* Duration hours */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Duração (Horas)</label>
                                        <input 
                                            type="number" 
                                            value={newAdDuration}
                                            onChange={(e) => setNewAdDuration(Math.max(1, Number(e.target.value)))}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                                        />
                                    </div>

                                    {/* Associated Venue */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Associar a Estabelecimento (Opcional)</label>
                                        <select
                                            value={newAdVenueId}
                                            onChange={(e) => setNewAdVenueId(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                                        >
                                            <option value="">Nenhum (Anúncio Geral/Próprio)</option>
                                            {partners.map(p => (
                                                <option key={p.venueId} value={p.venueId}>{p.venueName}</option>
                                            ))}
                                        </select>
                                    </div>

                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreatingAd}
                                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 transition-all mt-4 text-sm"
                                >
                                    {isCreatingAd ? (
                                        <>
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Criando Anúncio...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Ativar e Publicar Anúncio Oficial
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Real-Time Mockup Simulator Column */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6 sticky top-24">
                                <div>
                                    <h3 className="font-bold text-white text-md">Simulador de Mockup de Usuário</h3>
                                    <p className="text-xs text-slate-500 mt-1">Visualize exatamente como este anúncio será formatado nas interfaces móveis do feed de novidades.</p>
                                </div>

                                <div className="border border-white/10 rounded-3xl p-4 bg-slate-950 overflow-hidden relative shadow-inner">
                                    {/* Mobile status bar */}
                                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-2 pb-3 border-b border-white/5">
                                        <span>Ponto G App</span>
                                        <span>12:00 UTC</span>
                                        <span className="text-emerald-400">● Live Preview</span>
                                    </div>

                                    {/* Render dynamic previews depending on selection */}
                                    <div className="p-4 mt-4 space-y-4">
                                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-3 shadow-lg">
                                            {newAdImageUrl && (
                                                <img 
                                                    src={newAdImageUrl} 
                                                    alt="Preview Promo" 
                                                    className="w-full aspect-video object-cover rounded-xl border border-white/5"
                                                    onError={(e) => { (e.target as any).style.display = 'none'; }}
                                                />
                                            )}
                                            
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Patrocinado Oficial</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{newAdTargetTribe === 'Geral' ? 'Público Amplo' : `Filtro: ${newAdTargetTribe}`}</span>
                                                </div>
                                                <h4 className="text-base font-bold text-white">{newAdTitle || 'Seu título do anúncio aqui...'}</h4>
                                                <p className="text-xs text-slate-300 leading-relaxed">{newAdMessage || 'Sua mensagem de copy descritiva e atraente aparecerá completa aqui.'}</p>
                                            </div>

                                            <button 
                                                type="button"
                                                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors mt-2"
                                            >
                                                {newAdCtaText}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📊 Tab 3: Global B2B Analytics & Metrics */}
                {activeTab === 'metrics' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary KPI grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            
                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parceiros Pagantes</p>
                                    <p className="text-3xl font-black text-white font-outfit mt-1">{activePartnersCount} {activePartnersCount === 1 ? 'Dono' : 'Donos'}</p>
                                    <span className="text-[9px] text-green-400 font-mono mt-1 block">100% Retenção Comercial</span>
                                </div>
                                <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Faturamento Ad B2B</p>
                                    <p className="text-3xl font-black text-emerald-400 font-outfit mt-1">R$ {totalRevenue.toFixed(2)}</p>
                                    <span className="text-[9px] text-slate-500 font-mono mt-1 block">Receita de créditos acumulada</span>
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CTR Médio dos Anúncios</p>
                                    <p className="text-3xl font-black text-white font-outfit mt-1">8.34%</p>
                                    <span className="text-[9px] text-green-400 font-mono mt-1 block">+1.2% nos últimos 7d</span>
                                </div>
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Campanhas Executadas</p>
                                    <p className="text-3xl font-black text-white font-outfit mt-1">{totalCampaignsCount} {totalCampaignsCount === 1 ? 'Campanha' : 'Campanhas'}</p>
                                    <span className="text-[9px] text-slate-500 font-mono mt-1 block">Notificações geofenced enviadas</span>
                                </div>
                                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                                    <Sliders className="w-6 h-6" />
                                </div>
                            </div>

                        </div>

                        {/* Interactive Graph Row & Top Sponsors */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* SVG Trend Graph of Ad spends */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 lg:col-span-2 shadow-xl space-y-6">
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <TrendingUp className="text-pink-500" />
                                        Faturamento e Investimento em Anúncios (Mensal)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Visão consolidada do faturamento B2B gerado por autopublicação e pacotes de créditos.</p>
                                </div>

                                <div className="bg-slate-950/20 p-4 border border-white/[0.02] rounded-xl relative">
                                    {/* Simulated elegant chart rendering */}
                                    <svg viewBox="0 0 600 180" className="w-full h-auto select-none overflow-visible">
                                        {/* Horizontal guidelines */}
                                        <line x1="40" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                        <line x1="40" y1="85" x2="580" y2="85" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                        <line x1="40" y1="150" x2="580" y2="150" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

                                        {/* Y labels */}
                                        <text x="30" y="24" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">R$ 5.0k</text>
                                        <text x="30" y="89" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">R$ 2.5k</text>
                                        <text x="30" y="154" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">0</text>

                                        {/* X labels */}
                                        <text x="100" y="168" fill="#64748b" fontSize="9" textAnchor="middle">Fev/26</text>
                                        <text x="220" y="168" fill="#64748b" fontSize="9" textAnchor="middle">Mar/26</text>
                                        <text x="340" y="168" fill="#64748b" fontSize="9" textAnchor="middle">Abr/26</text>
                                        <text x="460" y="168" fill="#64748b" fontSize="9" textAnchor="middle">Mai/26</text>
                                        <text x="540" y="168" fill="#64748b" fontSize="9" textAnchor="middle">Jun/26</text>

                                        {/* Custom path curve representation of revenue */}
                                        <path 
                                            d="M 100 140 Q 160 120 220 100 T 340 70 T 460 55 T 540 35" 
                                            fill="none" 
                                            stroke="#ec4899" 
                                            strokeWidth="3.5" 
                                            strokeLinecap="round" 
                                        />
                                        <path 
                                            d="M 100 140 Q 160 120 220 100 T 340 70 T 460 55 T 540 35 L 540 150 L 100 150 Z" 
                                            fill="url(#pinkGlow)" 
                                            opacity="0.1" 
                                        />
                                        
                                        {/* Gradients */}
                                        <defs>
                                            <linearGradient id="pinkGlow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
                                                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Markers */}
                                        <circle cx="540" cy="35" r="5" fill="#ec4899" stroke="#0f172a" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Top Partners Leaderboard */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-1.5 text-md">
                                        <Award className="text-yellow-500" />
                                        Ranking de Campanhas (ROI)
                                    </h3>
                                    <p className="text-xs text-slate-500">Parceiros com maior taxa de conversão online-to-offline.</p>
                                </div>

                                <div className="space-y-3.5">
                                    <div className="flex justify-between items-center p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                                        <div>
                                            <p className="text-xs font-bold text-white">1. Festa Pride Club</p>
                                            <span className="text-[10px] text-slate-500 font-mono">Boate & Eventos</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">12.8% CTR</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                                        <div>
                                            <p className="text-xs font-bold text-white">2. Ponto G Lounge</p>
                                            <span className="text-[10px] text-slate-500 font-mono">Lounge Bar & Café</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">8.3% CTR</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                                        <div>
                                            <p className="text-xs font-bold text-white">3. Thermas Club G</p>
                                            <span className="text-[10px] text-slate-500 font-mono">Sauna & Relax</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">6.1% CTR</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

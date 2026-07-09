import React, { useState, useEffect } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
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
    id: string;
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
    status: 'approved' | 'flagged' | 'pending';
    created_at: string;
}

export const B2BManagerView: React.FC = () => {
    const token = useAdminStore((state) => state.getToken());
    
    // Sub-tab selection
    const [activeTab, setActiveTab] = useState<'billing' | 'audit' | 'metrics'>('billing');
    
    // States for B2B Management
    const [partners, setPartners] = useState<B2BPartner[]>([]);
    const [campaigns, setCampaigns] = useState<CampaignLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Grant Credits Modal / Form state
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [grantAmount, setGrantAmount] = useState<number>(100);

    // Initial Seed Data / Local Loading
    useEffect(() => {
        // Mock partners with their venues and balances
        const initialPartners: B2BPartner[] = [
            { id: 'usr-1', username: 'koresoluciones', email: 'koresoluciones@gmail.com', venueName: 'Ponto G Lounge', credits: 420.00, activeCampaignsCount: 1 },
            { id: 'usr-2', username: 'roberto_santos', email: 'roberto@saunaclub.com.br', venueName: 'Thermas Club G', credits: 150.00, activeCampaignsCount: 0 },
            { id: 'usr-3', username: 'thiago_dj', email: 'thiago@boateunderground.com', venueName: 'Festa Pride Club', credits: 780.00, activeCampaignsCount: 2 },
            { id: 'usr-4', username: 'bruno_cafe', email: 'bruno@gcafe.org', venueName: 'G-Café & Livraria', credits: 45.00, activeCampaignsCount: 0 }
        ];

        // Seed initial campaign logs (combining localStorage user campaigns with some mock system campaigns)
        const userCampaigns = JSON.parse(localStorage.getItem('b2b_campaign_audit_logs') || '[]');
        const mockCampaigns: CampaignLog[] = [
            {
                id: 'cmp-1',
                venue_id: 'v-1',
                venue_name: 'Ponto G Lounge',
                title: 'Rodada dupla de chopp ativada! 🍻',
                message: 'Venha curtir com a gente! Hoje tem chopp duplo das 18h às 21h no bar para todos do app.',
                target_tribe: 'Geral',
                range_meters: 1000,
                estimated_reach: 250,
                cost: 25.00,
                status: 'approved',
                created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
            },
            {
                id: 'cmp-2',
                venue_id: 'v-3',
                venue_name: 'Festa Pride Club',
                title: '🐻 Bear Night: Entrada FREE para Ursos!',
                message: 'Uma festa pensada para Ursos e admiradores. Mostre este push e entre de graça até 23h!',
                target_tribe: 'Ursos',
                range_meters: 5000,
                estimated_reach: 900,
                cost: 90.00,
                status: 'approved',
                created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
            }
        ];

        // Map and combine user created campaigns
        const formattedUserCampaigns = userCampaigns.map((c: any, idx: number) => ({
            id: `usr-cmp-${idx}`,
            venue_id: c.venue_id,
            venue_name: initialPartners.find(p => p.id === 'usr-1')?.venueName || 'Ponto G Lounge',
            title: c.title,
            message: c.message,
            target_tribe: c.target_tribe,
            range_meters: c.range_meters,
            estimated_reach: c.estimated_reach,
            cost: c.cost,
            status: c.status || 'approved',
            created_at: c.created_at
        }));

        setPartners(initialPartners);
        setCampaigns([...formattedUserCampaigns, ...mockCampaigns]);
    }, []);

    const handleGrantCreditsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPartnerId || grantAmount <= 0) return;

        setPartners(prev => prev.map(p => {
            if (p.id === selectedPartnerId) {
                const updatedCredits = p.credits + Number(grantAmount);
                toast.success(`R$ ${grantAmount},00 concedidos com sucesso para ${p.username}!`);
                return { ...p, credits: updatedCredits };
            }
            return p;
        }));

        // Log to Admin Audit
        const logEntry = {
            action: 'B2B_GRANT_CREDITS',
            partner_id: selectedPartnerId,
            amount: grantAmount,
            timestamp: new Date().toISOString()
        };
        const savedLogs = JSON.parse(localStorage.getItem('b2b_admin_credit_logs') || '[]');
        savedLogs.unshift(logEntry);
        localStorage.setItem('b2b_admin_credit_logs', JSON.stringify(savedLogs));

        setSelectedPartnerId(null);
    };

    const handleModerateCampaign = (campaignId: string, newStatus: 'approved' | 'flagged') => {
        setCampaigns(prev => prev.map(c => {
            if (c.id === campaignId) {
                toast.success(newStatus === 'approved' ? "Campanha aprovada e mantida ativa!" : "Campanha suspensa por violação.");
                return { ...c, status: newStatus };
            }
            return c;
        }));
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
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-2 px-5 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'audit' ? 'border-pink-500 text-pink-500 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <ShieldAlert className="w-4 h-4" />
                    Auditoria de Campanhas ({campaigns.filter(c => c.status === 'approved').length})
                </button>
                <button 
                    onClick={() => setActiveTab('metrics')}
                    className={`flex items-center gap-2 px-5 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'metrics' ? 'border-pink-500 text-pink-500 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <BarChart2 className="w-4 h-4" />
                    Métricas Globais B2B
                </button>
            </div>

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
                                                        <button 
                                                            onClick={() => setSelectedPartnerId(partner.id)}
                                                            className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-pink-900/10 flex items-center gap-1.5 ml-auto"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Conceder Créditos
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

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

                {/* 🛡️ Tab 2: Campaign Audit Log & Moderation */}
                {activeTab === 'audit' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl shadow-xl space-y-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <ShieldAlert className="text-pink-500 w-5 h-5" />
                                    Fila de Auditoria de Campanhas Georreferenciadas
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Monitore em tempo real as promoções disparadas pelos donos para conter abusos, spam ou conteúdos abusivos.</p>
                            </div>

                            <div className="space-y-4">
                                {campaigns.length === 0 ? (
                                    <div className="p-10 text-center text-slate-500 text-sm">
                                        Nenhuma campanha disparada na plataforma para auditar no momento.
                                    </div>
                                ) : (
                                    campaigns.map(cmp => (
                                        <div 
                                            key={cmp.id}
                                            className={`border rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-6 transition-all ${cmp.status === 'flagged' ? 'bg-red-500/5 border-red-500/20 opacity-70' : 'bg-slate-950/40 border-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="space-y-3 flex-1">
                                                {/* Header info */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-white/10 px-2.5 py-0.5 rounded-full">
                                                        {cmp.venue_name}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        Enviado em {new Date(cmp.created_at).toLocaleString()}
                                                    </span>
                                                    {cmp.status === 'flagged' ? (
                                                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">SUSPENSA (Spam/Ofensiva)</span>
                                                    ) : (
                                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">ATIVA & SAUDÁVEL</span>
                                                    )}
                                                </div>

                                                {/* Content block */}
                                                <div className="space-y-1">
                                                    <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                                                        {cmp.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{cmp.message}</p>
                                                </div>

                                                {/* Meta indicators */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/[0.03] text-xs font-mono text-slate-400">
                                                    <div>
                                                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Tribo Alvo</span>
                                                        <span className="font-bold text-slate-200">{cmp.target_tribe}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Raio Geofence</span>
                                                        <span className="font-bold text-slate-200">{cmp.range_meters} metros</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Alcance Alc.</span>
                                                        <span className="font-bold text-slate-200">{cmp.estimated_reach} recipientes</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Custo do Blast</span>
                                                        <span className="font-bold text-green-400">R$ {cmp.cost.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action modifiers */}
                                            {cmp.status === 'approved' && (
                                                <div className="flex md:flex-col justify-end gap-2.5 self-start md:self-center">
                                                    <button
                                                        onClick={() => handleModerateCampaign(cmp.id, 'flagged')}
                                                        className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                        Suspender / Bloquear
                                                    </button>
                                                </div>
                                            )}
                                            {cmp.status === 'flagged' && (
                                                <div className="flex md:flex-col justify-end gap-2.5 self-start md:self-center">
                                                    <button
                                                        onClick={() => handleModerateCampaign(cmp.id, 'approved')}
                                                        className="bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Re-Ativar Campanha
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
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
                                    <p className="text-3xl font-black text-white font-outfit mt-1">4 Donos</p>
                                    <span className="text-[9px] text-green-400 font-mono mt-1 block">100% Retenção Comercial</span>
                                </div>
                                <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Faturamento Ad B2B</p>
                                    <p className="text-3xl font-black text-emerald-400 font-outfit mt-1">R$ 1.395,00</p>
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
                                    <p className="text-3xl font-black text-white font-outfit mt-1">12 Blasts</p>
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

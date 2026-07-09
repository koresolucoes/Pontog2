import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useOwnerStore } from '../../../stores/ownerStore';
import { supabase } from '../../../lib/supabase';
import { 
    Megaphone, 
    Users, 
    TrendingUp, 
    Sparkles, 
    MapPin, 
    DollarSign, 
    Plus, 
    Award, 
    Check, 
    Send, 
    BarChart2, 
    HelpCircle, 
    Maximize,
    ChevronRight,
    Map
} from 'lucide-react';
import toast from 'react-hot-toast';

// Static copywriting template engine (Fully structured copywriting assistant, 100% without external AI)
const GOAL_OPTIONS = [
    { id: 'happy_hour', label: 'Happy Hour Relâmpago 🍻', desc: 'Promover descontos de curto prazo para encher o local.' },
    { id: 'vip_entry', label: 'Entrada VIP Grátis 🎟️', desc: 'Atrair clientes garantindo entrada franca temporária.' },
    { id: 'drink_discount', label: 'Desconto em Bebidas 🍹', desc: 'Oferecer cortesia ou dose dupla de bebidas selecionadas.' },
    { id: 'theme_night', label: 'Noite Temática / Evento 🚀', desc: 'Divulgar festas temáticas ou atrações especiais.' }
];

const TRIBE_OPTIONS = [
    { id: 'Geral', label: 'Público Geral 👥', suffix: 'Venha curtir com a gente!' },
    { id: 'Ursos', label: 'Ursos & Admiradores (Bears) 🐻', suffix: 'O ponto de encontro dos Ursos e Bears de plantão hoje!' },
    { id: 'Jocks', label: 'Malhados & Atletas (Jocks) ⚡', suffix: 'Reunindo os caras mais sarados e ativos da região hoje!' },
    { id: 'Drags', label: 'Fãs de Drags & Pop 👑', suffix: 'Noite cheia de brilho, close e close com as melhores atrações!' },
    { id: 'Jovens', label: 'Público Jovem (Twinks) ✨', suffix: 'Vibe lá em cima e pista liberada para dançar a noite inteira!' },
    { id: 'Maduros', label: 'Maduros & Daddies 🕶️', suffix: 'Um espaço sofisticado para conversar, beber e fazer conexões maduras.' }
];

const TONE_OPTIONS = [
    { id: 'friendly', label: 'Amigável & Inclusivo 😊' },
    { id: 'provocative', label: 'Provocativo & Quente 🔥' },
    { id: 'festeiro', label: 'Descontraído & Festeiro 🎉' },
    { id: 'exclusive', label: 'VIP & Exclusivo 💎' }
];

const COPY_TEMPLATES_DATABASE: Record<string, Record<string, Array<{ title: string; message: string }>>> = {
    happy_hour: {
        friendly: [
            { title: "Happy Hour no {venueName}! 🍻", message: "Hoje tem rodada dupla de chopp gelado das 18h às 21h. Venha encontrar os amigos, jogar conversa fora e recarregar as energias!" },
            { title: "Cheers! Drink em dobro no {venueName} 🍹", message: "Compre qualquer drink clássico hoje no bar e ganhe outro totalmente por nossa conta até as 22h. Te esperamos!" }
        ],
        provocative: [
            { title: "Clima esquentando no {venueName}... 🔥", message: "A noite promete! Para esquentar ainda mais, temos chopp duplo e drinks liberados até as 22h. Quem você vai arrastar para dividir esse brinde?" },
            { title: "Hora de quebrar o gelo! 😉🍻", message: "Boca seca? Venha desfrutar das nossas doses duplas especiais no {venueName} hoje. Venha de perto ver quem está por perto!" }
        ],
        festeiro: [
            { title: "Happy hour oficial liberado! 🎉", message: "Hoje no {venueName} a música rola solta e o chopp trinca pela metade do preço! Chame seu grupo de chat e venham brindar juntos!" },
            { title: "Fim de expediente pede fervo! 🚀🍻", message: "Chopp duplo e promoção de combos de Gin no {venueName} agora mesmo! Vibe sensacional garantida para começar bem a noite." }
        ],
        exclusive: [
            { title: "Privilégio de Parceiro: Cheers! 💎", message: "Exclusivo para clientes premium do app! Mostre este card no bar do {venueName} hoje e garanta 30% de desconto na nossa carta de drinks importados." }
        ]
    },
    vip_entry: {
        friendly: [
            { title: "Que tal curtir a noite VIP? 🎟️", message: "Hoje o {venueName} libera a entrada de todos os cadastrados no aplicativo que chegarem até as 22h! Venha paquerar e curtir." },
            { title: "Entrada Free hoje! 🌟", message: "Queremos te ver por aqui! Entrada totalmente gratuita até 21h30 para curtir nosso ambiente aconchegante e seguro." }
        ],
        provocative: [
            { title: "Entrada VIP para os safados! 😏⚡", message: "Hoje a pista do {venueName} ferve com luzes baixas e som pesado. Entrada livre até as 23h para você se jogar sem moderação." },
            { title: "Sua entrada VIP está garantida! 🔥", message: "Evite filas e burocracia. Hoje os caras mais quentes da cidade se encontram no {venueName}. Entrada liberada até a meia-noite!" }
        ],
        festeiro: [
            { title: "A pista convoca: Entrada FREE! 🔊", message: "A festa mais barulhenta da cidade! No {venueName}, hoje a entrada é por nossa conta até as 22h30. Vista seu melhor look e venha bater cabelo!" }
        ],
        exclusive: [
            { title: "Acesso VIP Exclusivo: Sem Fila 💎", message: "Para você que merece tratamento premium: entrada franca e acesso direto ao lounge VIP do {venueName} nesta noite. Apresente este push!" }
        ]
    },
    drink_discount: {
        friendly: [
            { title: "Seu primeiro drink é cortesia! 🍹", message: "Chegando no {venueName} hoje, mostre esta notificação ao barman e ganhe um Gin Tônica ou Caipirinha cortesia de boas-vindas!" }
        ],
        provocative: [
            { title: "Um drink para soltar as amarras... 👅", message: "Venha relaxar! Nossa tradicional dose de tequila está com 50% de desconto no {venueName} hoje. Chame seu crush para brindar." }
        ],
        festeiro: [
            { title: "Double Drink Ativado! 🍻💥", message: "Hoje no {venueName} é dia de double drink a noite toda em caipirinhas e cervejas long neck. Perfeito para ferver!" }
        ],
        exclusive: [
            { title: "Voucher de Bebida Premium 💎", message: "Aproveite! Apresente este cupom no caixa do {venueName} e receba um upgrade de tamanho ou dose dupla no seu combo favorito!" }
        ]
    },
    theme_night: {
        friendly: [
            { title: "Festa Temática no {venueName}! 🎪", message: "Prepare seu look! Hoje realizamos nossa festa oficial com decoração temática, DJs renomados e promoções de drinques a noite inteira." }
        ],
        provocative: [
            { title: "Noite dos Solteiros ativada! 🔥🤫", message: "Hoje no {venueName} rola a noite especial de paquera com pulseiras coloridas indicando sua intenção. Venha descobrir o seu ponto ideal." }
        ],
        festeiro: [
            { title: "Festa imperdível hoje à noite! 🔊🚀", message: "A pista do {venueName} vai tremer com o melhor do pop, tribal e eletrônico. Reúna a tribo e venha ferver conosco!" }
        ],
        exclusive: [
            { title: "Gala & Brilho: Noite VIP 💎", message: "Evento fechado de alto padrão hoje no {venueName}. Performances artísticas exclusivas, drinques personalizados e público seleto." }
        ]
    }
};

export const OwnerMarketingView: React.FC = () => {
    const { user } = useAuthStore();
    const { managedVenues, fetchManagedVenues } = useOwnerStore();
    
    // UI tabs
    const [activeSubTab, setActiveSubTab] = useState<'geo' | 'copy' | 'analytics' | 'ads'>('geo');
    const [selectedVenueId, setSelectedVenueId] = useState<string>('');

    // State for Campaign
    const [campaignRange, setCampaignRange] = useState<number>(1000); // meters
    const [campaignTargetTribe, setCampaignTargetTribe] = useState<string>('Geral');
    const [campaignTitle, setCampaignTitle] = useState<string>('');
    const [campaignMessage, setCampaignMessage] = useState<string>('');
    const [campaignImageUrl, setCampaignImageUrl] = useState<string>('');
    const [isSendingCampaign, setIsSendingCampaign] = useState<boolean>(false);

    // Copywriting State
    const [copyGoal, setCopyGoal] = useState<string>('happy_hour');
    const [copyTribe, setCopyTribe] = useState<string>('Geral');
    const [copyTone, setCopyTone] = useState<string>('friendly');
    const [generatedOptions, setGeneratedOptions] = useState<Array<{ title: string; message: string }>>([]);

    // Ads State (Simulated Credit Balance)
    const [adBalance, setAdBalance] = useState<number>(350.00);
    const [isPinoDouradoActive, setIsPinoDouradoActive] = useState<boolean>(false);
    const [isFeedBannerActive, setIsFeedBannerActive] = useState<boolean>(false);
    const [addingCreditsAmount, setAddingCreditsAmount] = useState<number>(100);

    // Load owned venues
    useEffect(() => {
        if (user) {
            fetchManagedVenues(user.id);
        }
    }, [user, fetchManagedVenues]);

    // Select first venue by default
    useEffect(() => {
        if (managedVenues.length > 0 && !selectedVenueId) {
            setSelectedVenueId(managedVenues[0].id);
        }
    }, [managedVenues, selectedVenueId]);

    // Generate copy suggestions when inputs change
    useEffect(() => {
        const venue = managedVenues.find(v => v.id === selectedVenueId);
        const venueName = venue ? venue.name : "Nosso Local";

        const goalTemplates = COPY_TEMPLATES_DATABASE[copyGoal] || {};
        const toneTemplates = goalTemplates[copyTone] || goalTemplates['friendly'] || [];

        const tribeObj = TRIBE_OPTIONS.find(t => t.id === copyTribe);
        const tribeSuffix = tribeObj ? tribeObj.suffix : '';

        const results = toneTemplates.map(tpl => {
            let customizedTitle = tpl.title.replace('{venueName}', venueName);
            let customizedMsg = tpl.message.replace('{venueName}', venueName);
            
            // Append tribe contextual text if not already Geral
            if (copyTribe !== 'Geral') {
                customizedMsg = `${customizedMsg} ⚡ ${tribeSuffix}`;
            }

            return {
                title: customizedTitle,
                message: customizedMsg
            };
        });

        setGeneratedOptions(results);
    }, [copyGoal, copyTribe, copyTone, selectedVenueId, managedVenues]);

    // Get current selected venue details
    const currentVenue = managedVenues.find(v => v.id === selectedVenueId);

    // Calculate Estimated Reach based on Slider Range (meters)
    const getEstimatedReach = (rangeInMeters: number) => {
        if (rangeInMeters <= 200) return Math.round(rangeInMeters * 0.12);
        if (rangeInMeters <= 500) return Math.round(rangeInMeters * 0.18);
        if (rangeInMeters <= 1000) return Math.round(rangeInMeters * 0.25);
        if (rangeInMeters <= 5000) return Math.round(rangeInMeters * 0.15 + 150);
        return Math.round(rangeInMeters * 0.12 + 400);
    };

    const estReach = getEstimatedReach(campaignRange);

    const handleApplyCopy = (title: string, message: string) => {
        setCampaignTitle(title);
        setCampaignMessage(message);
        setActiveSubTab('geo');
        toast.success("Texto copiado para o editor de Campanha!");
    };

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
            // Deduct simulated cost of push blast (R$ 0.10 per recipient)
            const pushCost = Number((estReach * 0.10).toFixed(2));
            if (adBalance < pushCost) {
                toast.error(`Saldo insuficiente! Esta campanha custa R$ ${pushCost.toFixed(2)}, mas seu saldo é de R$ ${adBalance.toFixed(2)}. Adicione créditos.`);
                setIsSendingCampaign(false);
                return;
            }

            // Real insert in DB via ownerStore: creates a post in venue_posts
            // We use the same sendPromotion function which hits the real backend API
            const success = await useOwnerStore.getState().sendPromotion(
                selectedVenueId,
                campaignTitle,
                `[Push Raio de ${campaignRange}m para ${campaignTargetTribe}] ${campaignMessage}`,
                campaignImageUrl
            );

            if (success) {
                // Deduct balance and track campaign locally
                setAdBalance(prev => Number((prev - pushCost).toFixed(2)));
                
                // Record simulated campaign log in database or local audit tracker
                const campaignLog = {
                    venue_id: selectedVenueId,
                    title: campaignTitle,
                    message: campaignMessage,
                    target_tribe: campaignTargetTribe,
                    range_meters: campaignRange,
                    estimated_reach: estReach,
                    cost: pushCost,
                    created_at: new Date().toISOString()
                };

                const savedLogs = JSON.parse(localStorage.getItem('b2b_campaign_audit_logs') || '[]');
                savedLogs.unshift(campaignLog);
                localStorage.setItem('b2b_campaign_audit_logs', JSON.stringify(savedLogs));

                // Clear input fields
                setCampaignTitle('');
                setCampaignMessage('');
                setCampaignImageUrl('');
                
                toast.success(`Notificação Georreferenciada disparada para cerca de ${estReach} usuários ativos próximos!`);
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao disparar campanha.");
        } finally {
            setIsSendingCampaign(false);
        }
    };

    const handleAddCredits = (e: React.FormEvent) => {
        e.preventDefault();
        if (addingCreditsAmount <= 0) return;
        setAdBalance(prev => prev + Number(addingCreditsAmount));
        toast.success(`R$ ${addingCreditsAmount},00 adicionados com sucesso! (Simulado)`);
        
        // Save transaction to local audit for financial statement
        const newTx = {
            id: Date.now(),
            venue_id: selectedVenueId,
            venue_name: currentVenue?.name || 'Local',
            amount: addingCreditsAmount,
            type: 'credit_purchase',
            status: 'approved',
            created_at: new Date().toISOString()
        };
        const savedTx = JSON.parse(localStorage.getItem('b2b_billing_transactions') || '[]');
        savedTx.unshift(newTx);
        localStorage.setItem('b2b_billing_transactions', JSON.stringify(savedTx));
    };

    const handleTogglePinoDourado = () => {
        const costPerDay = 15.00;
        if (!isPinoDouradoActive && adBalance < costPerDay) {
            toast.error(`Saldo insuficiente para ativar o destaque! É necessário pelo menos R$ ${costPerDay.toFixed(2)}.`);
            return;
        }

        const newState = !isPinoDouradoActive;
        setIsPinoDouradoActive(newState);

        if (newState) {
            setAdBalance(prev => Number((prev - costPerDay).toFixed(2)));
            toast.success("Destaque Pino Dourado ativado no mapa! (R$ 15,00 debitados para as próximas 24h)");
        } else {
            toast.success("Destaque Pino Dourado desativado.");
        }
    };

    const handleToggleFeedBanner = () => {
        const costPerDay = 25.00;
        if (!isFeedBannerActive && adBalance < costPerDay) {
            toast.error(`Saldo insuficiente para ativar o destaque! É necessário pelo menos R$ ${costPerDay.toFixed(2)}.`);
            return;
        }

        const newState = !isFeedBannerActive;
        setIsFeedBannerActive(newState);

        if (newState) {
            setAdBalance(prev => Number((prev - costPerDay).toFixed(2)));
            toast.success("Destaque de Banner no Feed ativado! (R$ 25,00 debitados para as próximas 24h)");
        } else {
            toast.success("Destaque de Banner no Feed desativado.");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in text-slate-100">
            {/* Header with Venue Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white font-outfit tracking-tight">Hub de Marketing B2B</h1>
                    <p className="text-slate-400 mt-1">Atraia clientes locais, crie anúncios patrocinados e analise a jornada online-to-offline do seu local.</p>
                </div>

                {managedVenues.length > 0 ? (
                    <div className="flex items-center gap-3 bg-slate-900 border border-white/10 p-2.5 rounded-xl self-start">
                        <span className="material-symbols-rounded text-primary-500">store</span>
                        <select 
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="bg-transparent text-white font-bold text-sm focus:outline-none border-none pr-8 cursor-pointer"
                        >
                            {managedVenues.map(v => (
                                <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                                    {v.name}
                                </option>
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
                    onClick={() => setActiveSubTab('geo')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'geo' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Megaphone className="w-4 h-4" />
                    Geo-Marketing
                </button>
                <button 
                    onClick={() => setActiveSubTab('copy')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'copy' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Sparkles className="w-4 h-4" />
                    Copiloto de Copy
                </button>
                <button 
                    onClick={() => setActiveSubTab('analytics')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'analytics' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Painel O2O Analytics
                </button>
                <button 
                    onClick={() => setActiveSubTab('ads')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'ads' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Award className="w-4 h-4" />
                    Anúncios & Destaques
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="space-y-6">
                
                {/* 📡 1. GEO-MARKETING / CAMPANHAS */}
                {activeSubTab === 'geo' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Megaphone className="text-primary-500 w-5 h-5" />
                                        Disparador Georreferenciado por Proximidade
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Dispare notificações instantâneas no celular de todos os usuários no raio selecionado do seu pino do mapa.</p>
                                </div>

                                <form onSubmit={handleSendCampaign} className="space-y-5">
                                    {/* Range Selector */}
                                    <div className="space-y-3 bg-slate-950/40 border border-white/5 p-4 rounded-xl">
                                        <div className="flex justify-between text-sm font-bold">
                                            <span className="text-slate-300">Raio de Cobertura (Geofence)</span>
                                            <span className="text-primary-400 font-mono">{campaignRange >= 1000 ? `${(campaignRange/1000).toFixed(1)} km` : `${campaignRange} m`}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="100" 
                                            max="10000" 
                                            step="100"
                                            value={campaignRange}
                                            onChange={(e) => setCampaignRange(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                            <span>100m (Super Localizado)</span>
                                            <span>10km (Toda a Cidade)</span>
                                        </div>
                                    </div>

                                    {/* Segment Tribe */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-300">Filtro de Tribo (Opcional)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {TRIBE_OPTIONS.map(tribe => (
                                                <button
                                                    key={tribe.id}
                                                    type="button"
                                                    onClick={() => setCampaignTargetTribe(tribe.id)}
                                                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-left transition-all ${campaignTargetTribe === tribe.id ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-slate-950/30 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                                >
                                                    {tribe.label.split(' ')[0]} {tribe.label.split(' ').slice(1).join(' ').split(' (')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-300">Título da Notificação</label>
                                                <input 
                                                    type="text"
                                                    value={campaignTitle}
                                                    onChange={(e) => setCampaignTitle(e.target.value)}
                                                    placeholder="Ex: Rodada dupla de Gin ativada! 🍸"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                                    maxLength={50}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-300">Mensagem Push (Aparece na tela bloqueada)</label>
                                                <textarea 
                                                    value={campaignMessage}
                                                    onChange={(e) => setCampaignMessage(e.target.value)}
                                                    placeholder="Ex: Apresente esta notificação e ganhe Gin duplo das 18h às 21h no bar do Ponto G. Aproveite!"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white h-24 resize-none"
                                                    maxLength={200}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-300">URL da Imagem Ilustrativa (Opcional)</label>
                                                <input 
                                                    type="text"
                                                    value={campaignImageUrl}
                                                    onChange={(e) => setCampaignImageUrl(e.target.value)}
                                                    placeholder="https://exemplo.com/imagem-promo.jpg"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Blast Button */}
                                    <button
                                        type="submit"
                                        disabled={isSendingCampaign || !selectedVenueId}
                                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2 transition-all mt-4"
                                    >
                                        {isSendingCampaign ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Enviando notificações...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Disparar para cerca de {estReach} usuários (Custo: R$ {(estReach * 0.10).toFixed(2)})
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Interactive Geofence Map Sidebar Preview */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-full">
                                <div className="space-y-5">
                                    <h4 className="font-bold text-white flex items-center gap-2 text-md">
                                        <Map className="w-4 h-4 text-primary-400" />
                                        Simulador de Alcance de Geofence
                                    </h4>

                                    {/* Custom Simulated Map graphic representing concentric circles from venue */}
                                    <div className="relative aspect-square w-full rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center overflow-hidden">
                                        {/* Center Point - Venue Marker */}
                                        <div className="absolute z-30 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                                        
                                        {/* Dynamic Pulse circle based on range value */}
                                        <div 
                                            className="absolute border border-primary-500/50 bg-primary-500/10 rounded-full transition-all duration-350 ease-out z-10"
                                            style={{
                                                width: `${Math.min(90, Math.max(10, (campaignRange / 10000) * 90 + 10))}%`,
                                                height: `${Math.min(90, Math.max(10, (campaignRange / 10000) * 90 + 10))}%`,
                                            }}
                                        ></div>

                                        {/* Nested ring guidelines */}
                                        <div className="absolute w-1/4 h-1/4 rounded-full border border-white/5 pointer-events-none"></div>
                                        <div className="absolute w-1/2 h-1/2 rounded-full border border-white/5 pointer-events-none"></div>
                                        <div className="absolute w-3/4 h-3/4 rounded-full border border-white/5 pointer-events-none"></div>

                                        {/* Random mock user dots */}
                                        <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-green-500 rounded-full opacity-60"></div>
                                        <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-green-500 rounded-full opacity-85"></div>
                                        <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-green-500 rounded-full opacity-40"></div>
                                        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-green-500 rounded-full opacity-70"></div>
                                        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-green-500 rounded-full opacity-80"></div>
                                        
                                        <span className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500">Preview Operacional</span>
                                    </div>

                                    {/* Analytics stats */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-mono">AUDIÊNCIA ESTIMADA</p>
                                            <p className="text-2xl font-bold text-white mt-1">{estReach} caras</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-mono">INVESTIMENTO DO DISPARO</p>
                                            <p className="text-2xl font-bold text-green-400 mt-1">R$ {(estReach * 0.10).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 mt-5">
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        Como funciona? Cada push tem um custo simbólico de faturamento de R$ 0,10 por celular alcançado. Economize criando mensagens atraentes para seu tom ideal!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📝 2. COPILOTO DE COPYWRITING */}
                {activeSubTab === 'copy' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Control Wizard */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Sparkles className="text-primary-500 w-5 h-5" />
                                        Assistente de Redação Inteligente
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Selecione as diretrizes da sua oferta para receber ideias de títulos e mensagens prontas.</p>
                                </div>

                                {/* Step 1: Goal */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300">1. Objetivo da Campanha</label>
                                    <select
                                        value={copyGoal}
                                        onChange={(e) => setCopyGoal(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                    >
                                        {GOAL_OPTIONS.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 pl-1">
                                        {GOAL_OPTIONS.find(o => o.id === copyGoal)?.desc}
                                    </p>
                                </div>

                                {/* Step 2: Target Tribe */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300">2. Público-alvo (Segmento)</label>
                                    <select
                                        value={copyTribe}
                                        onChange={(e) => setCopyTribe(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                    >
                                        {TRIBE_OPTIONS.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Step 3: Tone of Voice */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300">3. Tom de Voz</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {TONE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setCopyTone(opt.id)}
                                                className={`w-full px-4 py-3 rounded-xl border text-left font-bold text-sm transition-all flex justify-between items-center ${copyTone === opt.id ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-slate-950/30 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                            >
                                                <span>{opt.label}</span>
                                                {copyTone === opt.id && <Check className="w-4 h-4 text-primary-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Generated Options Results */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6 h-full">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Variações de Texto Geradas</h3>
                                    <p className="text-xs text-slate-500 mt-1">Nossos algoritmos estruturaram cópias otimizadas com base nos parâmetros acima. Escolha a que mais gostar para editar e enviar!</p>
                                </div>

                                <div className="space-y-4">
                                    {generatedOptions.map((opt, idx) => (
                                        <div 
                                            key={idx}
                                            className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 hover:border-primary-500/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                                        >
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded-full font-bold">OPÇÃO {idx + 1}</span>
                                                    <span className="text-xs text-slate-500 font-mono">Taxa conversão est: +3.8%</span>
                                                </div>
                                                <h4 className="text-base font-bold text-white">{opt.title}</h4>
                                                <p className="text-sm text-slate-300 leading-relaxed">{opt.message}</p>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleApplyCopy(opt.title, opt.message)}
                                                className="bg-slate-800 hover:bg-primary-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all self-end sm:self-center border border-white/5 hover:border-transparent"
                                            >
                                                <span>Usar Oferta</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📊 3. ANALYTICS & FUNIL O2O */}
                {activeSubTab === 'analytics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Traffic Funnel O2O Graph */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <TrendingUp className="text-primary-500 w-5 h-5" />
                                        Funil de Tráfego Online-to-Offline (O2O)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Entenda o fluxo completo do usuário no app até a chegada física (Check-in) no seu estabelecimento.</p>
                                </div>

                                {/* Custom Visual Funnel */}
                                <div className="space-y-4 py-4 max-w-xl mx-auto">
                                    
                                    {/* Level 1 */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold px-2">
                                            <span className="text-slate-300">1. Visualizações do Pino no Mapa</span>
                                            <span className="text-white font-mono">1.280 views</span>
                                        </div>
                                        <div className="h-10 w-full bg-slate-950 rounded-xl relative overflow-hidden flex items-center px-4 border border-white/5">
                                            <div className="absolute inset-y-0 left-0 bg-blue-500/20 w-full rounded-l-xl"></div>
                                            <span className="relative z-10 text-xs font-black text-blue-400">100% dos usuários expostos</span>
                                        </div>
                                    </div>

                                    {/* Level 2 */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold px-2">
                                            <span className="text-slate-300">2. Cliques no Cartão de Detalhes</span>
                                            <span className="text-white font-mono">680 cliques</span>
                                        </div>
                                        <div className="h-10 w-full bg-slate-950 rounded-xl relative overflow-hidden flex items-center px-4 border border-white/5">
                                            <div className="absolute inset-y-0 left-0 bg-purple-500/20 w-[53%] rounded-l-xl"></div>
                                            <span className="relative z-10 text-xs font-black text-purple-400">CTR do Pino: 53.1%</span>
                                        </div>
                                    </div>

                                    {/* Level 3 */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold px-2">
                                            <span className="text-slate-300">3. Engajamento com a Promoção / Push</span>
                                            <span className="text-white font-mono">245 cliques</span>
                                        </div>
                                        <div className="h-10 w-full bg-slate-950 rounded-xl relative overflow-hidden flex items-center px-4 border border-white/5">
                                            <div className="absolute inset-y-0 left-0 bg-pink-500/20 w-[19%] rounded-l-xl"></div>
                                            <span className="relative z-10 text-xs font-black text-pink-400">Conversão de Oferta: 36.0%</span>
                                        </div>
                                    </div>

                                    {/* Level 4 */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold px-2">
                                            <span className="text-slate-300">4. Check-ins Físicos Realizados (Conversão Final)</span>
                                            <span className="text-white font-mono">94 check-ins</span>
                                        </div>
                                        <div className="h-10 w-full bg-slate-950 rounded-xl relative overflow-hidden flex items-center px-4 border border-white/5">
                                            <div className="absolute inset-y-0 left-0 bg-emerald-500/20 w-[7.3%] rounded-l-xl"></div>
                                            <span className="relative z-10 text-xs font-black text-emerald-400">Conversão O2O Final: 7.3% (Excelente)</span>
                                        </div>
                                    </div>

                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-6 mt-4">
                                    <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 text-center">
                                        <span className="text-[10px] text-slate-500 font-mono">VISITAS FÍSICAS REAIS</span>
                                        <p className="text-2xl font-black text-emerald-400 mt-1">94 caras</p>
                                    </div>
                                    <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 text-center">
                                        <span className="text-[10px] text-slate-500 font-mono">TICKET MÉDIO SIMULADO</span>
                                        <p className="text-2xl font-black text-white mt-1">R$ 65,00</p>
                                    </div>
                                    <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 text-center">
                                        <span className="text-[10px] text-slate-500 font-mono">RETORNO ESTIMADO (ROI)</span>
                                        <p className="text-2xl font-black text-pink-500 mt-1">R$ 6.110,00</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tribes Demographic Breakdown */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Users className="text-primary-500 w-4 h-4" />
                                        Frequência por Tribos
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Distribuição demográfica das tribos que mais fazem check-in.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Bear bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300 font-bold">🐻 Ursos & Bears</span>
                                            <span className="text-slate-400 font-mono">42% (39 check-ins)</span>
                                        </div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                            <div className="bg-amber-500 h-full w-[42%] rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Jock bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300 font-bold">⚡ Jocks & Atletas</span>
                                            <span className="text-slate-400 font-mono">25% (24 check-ins)</span>
                                        </div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full w-[25%] rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Drag bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300 font-bold">👑 Drags & Pop</span>
                                            <span className="text-slate-400 font-mono">15% (14 check-ins)</span>
                                        </div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                            <div className="bg-pink-500 h-full w-[15%] rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Twink bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300 font-bold">✨ Twinks & Jovens</span>
                                            <span className="text-slate-400 font-mono">10% (9 check-ins)</span>
                                        </div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                            <div className="bg-purple-500 h-full w-[10%] rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Daddies bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300 font-bold">🕶️ Daddies & Maduros</span>
                                            <span className="text-slate-400 font-mono">8% (8 check-ins)</span>
                                        </div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full w-[8%] rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 bg-slate-950/40 rounded-xl border border-white/5 text-[11px] text-slate-500">
                                    💡 <strong>Dica de Marketing:</strong> Sua audiência é composta majoritariamente por <strong>Ursos</strong>. Considere focar suas promoções no Copiloto de Copywriting para essa tribo específica para triplicar a conversão!
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 💎 4. ADS PATROCINADOS & BILLING */}
                {activeSubTab === 'ads' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* highlights widgets */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Award className="text-primary-500 w-5 h-5" />
                                        Gestão de Anúncios Patrocinados (Self-Service Ads)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Destaque seu estabelecimento nas telas de maior movimento da plataforma de forma instantânea.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Highlight 1: Pino Dourado */}
                                    <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                                <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                                                    Pino Dourado no Mapa Principal
                                                    <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">ALTO CTR</span>
                                                </h4>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Troca o pino padrão do seu estabelecimento no mapa de todos os usuários por um ícone dourado vibrante com aura cintilante, triplicando as visualizações de tráfego físico.
                                            </p>
                                            <p className="text-xs font-mono text-slate-500">Custo: R$ 15,00 por dia (Orçamento Diário)</p>
                                        </div>

                                        <button
                                            onClick={handleTogglePinoDourado}
                                            className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all ${isPinoDouradoActive ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'}`}
                                        >
                                            {isPinoDouradoActive ? '● ATIVADO (Pausar)' : 'Ativar Destaque'}
                                        </button>
                                    </div>

                                    {/* Highlight 2: Feed/Inbox Patrocinado Banner */}
                                    <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                                <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                                                    Banner Patrocinado no Feed & Inbox
                                                    <span className="text-[9px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">PREMIUM</span>
                                                </h4>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Exibe banners com fotos e botões CTA diretamente entre as mensagens do inbox e no topo do feed de novidades social. Ideal para lançamento de eventos grandes.
                                            </p>
                                            <p className="text-xs font-mono text-slate-500">Custo: R$ 25,00 por dia (Orçamento Diário)</p>
                                        </div>

                                        <button
                                            onClick={handleToggleFeedBanner}
                                            className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all ${isFeedBannerActive ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'}`}
                                        >
                                            {isFeedBannerActive ? '● ATIVADO (Pausar)' : 'Ativar Destaque'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Credit Billing Wallet panel */}
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
                                        Comprar Créditos (Simulado)
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useOwnerStore } from '../../../stores/ownerStore';
import { useAdStore } from '../../../stores/adStore';
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
    Wallet,
    ChevronRight,
    Map,
    Upload,
    X
, Eye, Image} from 'lucide-react';
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
    const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'analytics' | 'wallet'>('campaigns');
    const [selectedVenueId, setSelectedVenueId] = useState<string>('');

    // State for Campaign
    const [campaignRange, setCampaignRange] = useState<number>(1000); // meters
    const [campaignTargetTribe, setCampaignTargetTribe] = useState<string>('Geral');
    const [campaignTitle, setCampaignTitle] = useState<string>('');
    const [campaignMessage, setCampaignMessage] = useState<string>('');
    const [campaignImageUrl, setCampaignImageUrl] = useState<string>('');
    const [campaignPlacement, setCampaignPlacement] = useState<'feed' | 'map' | 'messages' | 'push'>('push');
    const [campaignDuration, setCampaignDuration] = useState<number>(24);
    const [campaignCtaUrl, setCampaignCtaUrl] = useState<string>('');
    const [campaignCtaText, setCampaignCtaText] = useState<string>('Saiba Mais');
    const [isSendingCampaign, setIsSendingCampaign] = useState<boolean>(false);
    const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        const toastId = toast.loading("Enviando imagem...");

        try {
            const user = useAuthStore.getState().user;
            if (!user) throw new Error("Usuário não autenticado");

            const fileExt = file.name.split('.').pop();
            const fileName = `campaign_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('user_uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('user_uploads')
                .getPublicUrl(filePath);

            setCampaignImageUrl(data.publicUrl);
            toast.success("Imagem anexada com sucesso!", { id: toastId });
        } catch (error: any) {
            console.error('Error uploading campaign image:', error);
            toast.error("Erro ao enviar a imagem.", { id: toastId });
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Copywriting State
    const [copyGoal, setCopyGoal] = useState<string>('happy_hour');
    const [copyTribe, setCopyTribe] = useState<string>('Geral');
    const [copyTone, setCopyTone] = useState<string>('friendly');
    const [generatedOptions, setGeneratedOptions] = useState<Array<{ title: string; message: string }>>([]);

    // Ads State (Real Database-driven balance)
    const [adBalance, setAdBalance] = useState<number>(350.00);
    const [isPinoDouradoActive, setIsPinoDouradoActive] = useState<boolean>(false);
    const [isFeedBannerActive, setIsFeedBannerActive] = useState<boolean>(false);
    const [addingCreditsAmount, setAddingCreditsAmount] = useState<number>(100);

    // B2B state variables
    const [walletId, setWalletId] = useState<string>('');
    const [campaignsHistory, setCampaignsHistory] = useState<any[]>([]);
    const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
    const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
    const [roiTicketValue, setRoiTicketValue] = useState<number>(50); // Ticket médio default: R$ 50
    const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

    // Fetch and initialize B2B Wallet, Campaigns, and Transactions for the venue
    const loadB2BData = async (venueId: string) => {
        if (!venueId) return;
        setIsLoadingWallet(true);
        try {
            // 1. Fetch wallet or create one if missing
            const { data: wallets, error: walletError } = await supabase
                .from('b2b_wallets')
                .select('*')
                .eq('venue_id', venueId);

            let wallet = null;
            if (walletError) {
                console.error("Error loading wallet:", walletError);
            }

            if (!wallets || wallets.length === 0) {
                // Create a new wallet for this venue with balance 0
                const { data: newWallet, error: createError } = await supabase
                    .from('b2b_wallets')
                    .insert({ venue_id: venueId, balance: 0.00 })
                    .select();
                
                if (createError) {
                    console.error("Error creating wallet:", createError);
                } else if (newWallet && newWallet.length > 0) {
                    wallet = newWallet[0];
                }
            } else {
                wallet = wallets[0];
            }

            if (wallet) {
                setWalletId(wallet.id);
                setAdBalance(Number(wallet.balance));

                // 2. Fetch campaign history
                const { data: campaigns, error: campError } = await supabase
                    .from('b2b_campaigns')
                    .select('*')
                    .eq('venue_id', venueId)
                    .order('created_at', { ascending: false });
                
                if (!campError && campaigns) {
                    setCampaignsHistory(campaigns);

                    // Determine if highlights are active based on un-paused campaigns
                    const pinoActive = campaigns.some(c => c.title === 'Destaque: Pino Dourado' && c.status === 'approved');
                    const bannerActive = campaigns.some(c => c.title === 'Destaque: Banner no Feed' && c.status === 'approved');
                    setIsPinoDouradoActive(pinoActive);
                    setIsFeedBannerActive(bannerActive);
                }

                // 3. Fetch transaction history
                const { data: txs, error: txError } = await supabase
                    .from('b2b_transactions')
                    .select('*')
                    .eq('wallet_id', wallet.id)
                    .order('created_at', { ascending: false });

                if (!txError && txs) {
                    setTransactionHistory(txs);
                }
                
                // Refresh global ad state to reflect changes instantly on map/feed
                useAdStore.getState().fetchAds();
            }
        } catch (err) {
            console.error("Exception in loadB2BData:", err);
        } finally {
            setIsLoadingWallet(false);
        }
    };

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

    // Load wallet & history when venue changes
    useEffect(() => {
        if (selectedVenueId) {
            loadB2BData(selectedVenueId);
        }
    }, [selectedVenueId]);

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

    const estReach = campaignPlacement === 'push' 
        ? getEstimatedReach(campaignRange) 
        : campaignDuration * (campaignPlacement === 'feed' ? 150 : campaignPlacement === 'map' ? 300 : 80);

    const handleApplyCopy = (title: string, message: string) => {
        setCampaignTitle(title);
        setCampaignMessage(message);
        setActiveSubTab('campaigns');
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

            if (campErr) {
                throw new Error("Erro ao salvar campanha no banco de dados: " + campErr.message);
            }

            const campaignId = newCamp[0].id;

            // 2. Deduct from wallet balance in database
            const newBalance = Number((adBalance - pushCost).toFixed(2));
            const { error: walletErr } = await supabase
                .from('b2b_wallets')
                .update({ balance: newBalance })
                .eq('id', walletId);

            if (walletErr) {
                throw new Error("Erro ao debitar da carteira: " + walletErr.message);
            }

            // 3. Insert real Transaction log
            const { error: txErr } = await supabase
                .from('b2b_transactions')
                .insert({
                    wallet_id: walletId,
                    amount: -pushCost,
                    type: 'campaign_deduction',
                    status: 'approved',
                    description: `Geo-Marketing (Raio ${campaignRange}m, Tribo: ${campaignTargetTribe})`,
                    reference_id: campaignId
                });

            if (txErr) {
                console.error("Error logging transaction:", txErr);
            }

            // 4. Send real promotion via API
            const success = await useOwnerStore.getState().sendPromotion(
                selectedVenueId,
                campaignTitle,
                campaignMessage,
                campaignImageUrl
            );

            if (success) {
                // Clear input fields
                setCampaignTitle('');
                setCampaignMessage('');
                setCampaignImageUrl('');
                setCampaignCtaUrl('');
                setCampaignCtaText('Saiba Mais');
                
                toast.success(`Notificação Georreferenciada disparada para cerca de ${estReach} usuários ativos próximos!`);
                
                // Reload wallet balance and history from database
                await loadB2BData(selectedVenueId);
            }
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

    const handleTogglePinoDourado = async () => {
        const costPerDay = 15.00;
        if (!selectedVenueId || !walletId) return;

        if (!isPinoDouradoActive) {
            // Activate Highlight
            if (adBalance < costPerDay) {
                toast.error(`Saldo insuficiente para ativar o destaque! É necessário pelo menos R$ ${costPerDay.toFixed(2)}.`);
                return;
            }

            const toastId = toast.loading("Ativando destaque...");
            try {
                // 1. Insert highlight campaign
                const { data: newCamp, error: campErr } = await supabase
                    .from('b2b_campaigns')
                    .insert({
                        venue_id: selectedVenueId,
                        title: 'Destaque: Pino Dourado',
                        message: 'Seu estabelecimento em destaque com pino dourado brilhante no mapa.',
                        target_tribe: 'Geral',
                        range_meters: 0,
                        estimated_reach: 0,
                        cost: costPerDay,
                        status: 'approved'
                    })
                    .select();

                if (campErr) throw campErr;

                // 2. Deduct cost from wallet in database
                const newBalance = Number((adBalance - costPerDay).toFixed(2));
                const { error: walletErr } = await supabase
                    .from('b2b_wallets')
                    .update({ balance: newBalance })
                    .eq('id', walletId);

                if (walletErr) throw walletErr;

                // 3. Insert transaction log in database
                await supabase
                    .from('b2b_transactions')
                    .insert({
                        wallet_id: walletId,
                        amount: -costPerDay,
                        type: 'campaign_deduction',
                        status: 'approved',
                        description: 'Ativação: Pino Dourado no Mapa Principal',
                        reference_id: newCamp[0].id
                    });

                toast.success("Destaque Pino Dourado ativado no mapa! (R$ 15,00 cobrados por 24h)", { id: toastId });
                await loadB2BData(selectedVenueId);
            } catch (err: any) {
                toast.error("Erro ao ativar destaque: " + err.message, { id: toastId });
            }
        } else {
            // Deactivate Highlight (Cancel/Pause the approved campaign)
            const toastId = toast.loading("Pausando destaque...");
            try {
                // Find and pause the active highlight campaign
                const { data: activeCamps } = await supabase
                    .from('b2b_campaigns')
                    .select('id')
                    .eq('venue_id', selectedVenueId)
                    .eq('title', 'Destaque: Pino Dourado')
                    .eq('status', 'approved');

                if (activeCamps && activeCamps.length > 0) {
                    for (const camp of activeCamps) {
                        await supabase
                            .from('b2b_campaigns')
                            .update({ status: 'paused' })
                            .eq('id', camp.id);
                    }
                }

                toast.success("Destaque Pino Dourado desativado.", { id: toastId });
                await loadB2BData(selectedVenueId);
            } catch (err: any) {
                toast.error("Erro ao pausar destaque: " + err.message, { id: toastId });
            }
        }
    };

    const handleToggleFeedBanner = async () => {
        const costPerDay = 25.00;
        if (!selectedVenueId || !walletId) return;

        if (!isFeedBannerActive) {
            // Activate Highlight
            if (adBalance < costPerDay) {
                toast.error(`Saldo insuficiente para ativar o destaque! É necessário pelo menos R$ ${costPerDay.toFixed(2)}.`);
                return;
            }

            const toastId = toast.loading("Ativando destaque...");
            try {
                // 1. Insert highlight campaign
                const { data: newCamp, error: campErr } = await supabase
                    .from('b2b_campaigns')
                    .insert({
                        venue_id: selectedVenueId,
                        title: 'Destaque: Banner no Feed',
                        message: 'Seu estabelecimento em destaque com banner promocional no feed de novidades.',
                        target_tribe: 'Geral',
                        range_meters: 0,
                        estimated_reach: 0,
                        cost: costPerDay,
                        status: 'approved'
                    })
                    .select();

                if (campErr) throw campErr;

                // 2. Deduct cost from wallet in database
                const newBalance = Number((adBalance - costPerDay).toFixed(2));
                const { error: walletErr } = await supabase
                    .from('b2b_wallets')
                    .update({ balance: newBalance })
                    .eq('id', walletId);

                if (walletErr) throw walletErr;

                // 3. Insert transaction log in database
                await supabase
                    .from('b2b_transactions')
                    .insert({
                        wallet_id: walletId,
                        amount: -costPerDay,
                        type: 'campaign_deduction',
                        status: 'approved',
                        description: 'Ativação: Banner Patrocinado no Feed & Inbox',
                        reference_id: newCamp[0].id
                    });

                toast.success("Destaque de Banner no Feed ativado! (R$ 25,00 cobrados por 24h)", { id: toastId });
                await loadB2BData(selectedVenueId);
            } catch (err: any) {
                toast.error("Erro ao ativar destaque: " + err.message, { id: toastId });
            }
        } else {
            // Deactivate Highlight (Cancel/Pause the approved campaign)
            const toastId = toast.loading("Pausando destaque...");
            try {
                // Find and pause the active highlight campaign
                const { data: activeCamps } = await supabase
                    .from('b2b_campaigns')
                    .select('id')
                    .eq('venue_id', selectedVenueId)
                    .eq('title', 'Destaque: Banner no Feed')
                    .eq('status', 'approved');

                if (activeCamps && activeCamps.length > 0) {
                    for (const camp of activeCamps) {
                        await supabase
                            .from('b2b_campaigns')
                            .update({ status: 'paused' })
                            .eq('id', camp.id);
                    }
                }

                toast.success("Destaque de Banner no Feed desativado.", { id: toastId });
                await loadB2BData(selectedVenueId);
            } catch (err: any) {
                toast.error("Erro ao pausar destaque: " + err.message, { id: toastId });
            }
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
                    onClick={() => setActiveSubTab('campaigns')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'campaigns' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Megaphone className="w-4 h-4" />
                    Nova Campanha
                </button>
                <button 
                    onClick={() => setActiveSubTab('analytics')}
                    className={`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'analytics' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Analytics O2O
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
                
                {/* 📡 1. GEO-MARKETING / CAMPANHAS */}
                {activeSubTab === 'campaigns' && (
                    <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Google Ads style Builder Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div className="border-b border-white/5 pb-4">
                                    <span className="text-[10px] bg-primary-500/10 text-primary-400 px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                                        Google Ads Local Partner
                                    </span>
                                    <h3 className="text-xl font-black text-white flex items-center gap-2 mt-2 font-outfit">
                                        <Megaphone className="text-primary-500 w-5 h-5" />
                                        Construtor de Campanhas de Alta Atração
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Defina seu público-alvo, área de atuação e configure CTAs personalizados para converter cliques online em visitas físicas.</p>
                                </div>

                                <form onSubmit={handleSendCampaign} className="space-y-6">
                                    {/* Placement Select */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-300 block">Canal de Posicionamento</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {[
                                                { id: 'push', label: 'Push Notification', desc: 'Disparo de geofence' },
                                                { id: 'feed', label: 'Feed de Destaques', desc: 'Banner principal' },
                                                { id: 'map', label: 'Pino no Mapa', desc: 'Localização dourada' },
                                                { id: 'messages', label: 'Inbox / Mensagens', desc: 'Mensagem direta' }
                                            ].map(placement => (
                                                <button
                                                    key={placement.id}
                                                    type="button"
                                                    onClick={() => setCampaignPlacement(placement.id as any)}
                                                    className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between h-20 ${campaignPlacement === placement.id ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                                >
                                                    <span className="text-xs font-bold block">{placement.label}</span>
                                                    <span className="text-[9px] text-slate-500 leading-tight">{placement.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Campaign Duration (Only for non-push) */}
                                    {campaignPlacement !== 'push' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-300">Tempo de Veiculação</label>
                                            <select 
                                                value={campaignDuration}
                                                onChange={(e) => setCampaignDuration(Number(e.target.value))}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                            >
                                                <option value={12}>12 Horas</option>
                                                <option value={24}>24 Horas (1 Dia)</option>
                                                <option value={72}>72 Horas (3 Dias)</option>
                                                <option value={168}>168 Horas (1 Semana)</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Range Selector */}
                                    {campaignPlacement === 'push' && (
                                        <div className="space-y-3 bg-slate-950/40 border border-white/5 p-4 rounded-xl">
                                            <div className="flex justify-between text-sm font-bold">
                                                <span className="text-slate-300">Raio de Cobertura Georreferenciada</span>
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
                                                <span>100m (Hiper Local)</span>
                                                <span>10km (Raio Expandido)</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Tribe Filter */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-300 block">Filtrar por Tribo (Público-Alvo)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {TRIBE_OPTIONS.map(tribe => (
                                                <button
                                                    key={tribe.id}
                                                    type="button"
                                                    onClick={() => setCampaignTargetTribe(tribe.id)}
                                                    className={`px-3 py-2.5 text-xs font-bold rounded-xl border text-left transition-all ${campaignTargetTribe === tribe.id ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-slate-950/30 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                                >
                                                    <span className="block truncate">{tribe.label.split(' ')[0]} {tribe.label.split(' ').slice(1).join(' ').split(' (')[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ad Fields */}
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-slate-300">Título Chamativo da Campanha</label>
                                                <input 
                                                    type="text"
                                                    value={campaignTitle}
                                                    onChange={(e) => setCampaignTitle(e.target.value)}
                                                    placeholder="Ex: Cheers! Double de chopp gelado ativado 🍻"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                                    maxLength={50}
                                                />
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-slate-300">Descrição do Anúncio (Mensagem Promocional)</label>
                                                <textarea 
                                                    value={campaignMessage}
                                                    onChange={(e) => setCampaignMessage(e.target.value)}
                                                    placeholder="Ex: Hoje tem rodada dupla de chopp artesanal das 18h às 21h. Venha encontrar os amigos e recarregar as energias!"
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white h-24 resize-none"
                                                    maxLength={250}
                                                />
                                            </div>

                                            {/* Google Ads Custom CTA Section */}
                                            <div className="bg-slate-950/30 border border-white/5 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-400">Texto do Botão (CTA)</label>
                                                    <select
                                                        value={campaignCtaText}
                                                        onChange={(e) => setCampaignCtaText(e.target.value)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500 text-white"
                                                    >
                                                        <option value="Saiba Mais">Saiba Mais ➜</option>
                                                        <option value="Garantir Entrada VIP">Garantir Entrada VIP 🎟️</option>
                                                        <option value="Ver Promoção">Ver Promoção 💥</option>
                                                        <option value="Comprar Ingresso">Comprar Ingresso 💳</option>
                                                        <option value="Chamar no WhatsApp">Chamar no WhatsApp 💬</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-400">Link de Destino (CTA URL)</label>
                                                    <input 
                                                        type="text"
                                                        value={campaignCtaUrl}
                                                        onChange={(e) => setCampaignCtaUrl(e.target.value)}
                                                        placeholder="Ex: https://wa.me/5511999999"
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500 text-white"
                                                    />
                                                </div>
                                            </div>

                                            {/* Image Upload Area */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-300">Criativo Visual do Anúncio (Imagem)</label>
                                                {campaignImageUrl ? (
                                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-900 group">
                                                        <img src={campaignImageUrl} alt="Campaign Image" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCampaignImageUrl('')}
                                                                className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full transition-transform hover:scale-110"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-primary-500/50 hover:bg-primary-500/5 transition-all cursor-pointer"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        {isUploadingImage ? (
                                                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                        ) : (
                                                            <Upload size={32} className="mb-2 opacity-50" />
                                                        )}
                                                        <span className="text-sm font-medium">
                                                            {isUploadingImage ? "Fazendo upload..." : "Arraste ou selecione a imagem do anúncio"}
                                                        </span>
                                                        <p className="text-[10px] text-slate-600 mt-1 font-mono">JPG, PNG ou GIF • Recomendado proporção de paisagem (16:9)</p>
                                                        <input 
                                                            type="file"
                                                            accept="image/*"
                                                            ref={fileInputRef}
                                                            onChange={handleImageUpload}
                                                            className="hidden"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Blast Button */}
                                    <button
                                        type="submit"
                                        disabled={isSendingCampaign || !selectedVenueId}
                                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2 transition-all mt-4 font-outfit"
                                    >
                                        {isSendingCampaign ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Disparando anúncio local...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Lançar Campanha Patrocinada (Custo: R$ {(estReach * (campaignPlacement === 'push' ? 0.10 : 0.05)).toFixed(2)})
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Interactive Geofence Map and Live Smartphone Preview */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col h-full justify-between">
                                <div className="space-y-5">
                                    <h4 className="font-bold text-white flex items-center gap-2 text-sm font-outfit">
                                        <Eye className="w-4 h-4 text-primary-400" />
                                        Visualização Live do Google Ad
                                    </h4>

                                    {/* Smartphone Live Frame */}
                                    <div className="relative border-[6px] border-slate-800 rounded-[32px] bg-slate-950 p-4 pt-6 pb-8 aspect-[9/16] max-w-[280px] mx-auto shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col justify-between">
                                        {/* Camera Notch */}
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-full z-40 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-black/60 ml-auto mr-4"></div>
                                        </div>

                                        {/* Notification view (If Placement is Push) */}
                                        {campaignPlacement === 'push' ? (
                                            <div className="my-auto space-y-4">
                                                <div className="text-center text-[10px] text-slate-400 font-mono">Hoje • 21:14</div>
                                                <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 space-y-1.5 shadow-xl animate-fade-in text-left">
                                                    <div className="flex items-center gap-1.5 text-slate-300">
                                                        <div className="w-4 h-4 bg-primary-500 rounded-lg flex items-center justify-center text-[9px] font-black text-white">G</div>
                                                        <span className="text-[10px] font-bold">Goyaba App</span>
                                                        <span className="text-[9px] text-slate-500 ml-auto">agora</span>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-xs text-white leading-tight">
                                                            {campaignTitle || 'Double Chopp no ' + (currentVenue ? currentVenue.name : 'Local')}
                                                        </h5>
                                                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-3">
                                                            {campaignMessage || 'Abra o app Goyaba e resgate sua cortesia VIP exclusiva para encher a noite!'}
                                                        </p>
                                                    </div>
                                                    {campaignImageUrl && (
                                                        <img src={campaignImageUrl} alt="ad preview" className="w-full aspect-video rounded-lg object-cover mt-2 border border-white/5" />
                                                    )}
                                                    <div className="pt-1 flex items-center justify-between text-[9px] text-primary-400 font-bold border-t border-white/5 mt-2">
                                                        <span>{campaignCtaText}</span>
                                                        <ChevronRight className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : campaignPlacement === 'feed' ? (
                                            /* Feed Ad Preview */
                                            <div className="my-auto space-y-3">
                                                <div className="text-center text-[10px] text-slate-400 font-mono">Feed de Novidades</div>
                                                <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-lg text-left">
                                                    <div className="relative aspect-video bg-slate-950">
                                                        <img 
                                                            src={campaignImageUrl || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600'} 
                                                            alt="feed preview" 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Patrocinado</span>
                                                    </div>
                                                    <div className="p-3 space-y-1">
                                                        <h5 className="font-bold text-xs text-white line-clamp-1">
                                                            {campaignTitle || 'Oferta Imperdível'}
                                                        </h5>
                                                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                                                            {campaignMessage || 'Toque para conferir todos os detalhes exclusivos no local.'}
                                                        </p>
                                                        <button type="button" className="w-full bg-primary-600 text-white text-[10px] font-bold py-1.5 rounded-lg mt-2 flex items-center justify-center gap-1">
                                                            <span>{campaignCtaText}</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : campaignPlacement === 'messages' ? (
                                            /* Inbox Message Preview */
                                            <div className="my-auto space-y-3">
                                                <div className="text-center text-[10px] text-slate-400 font-mono">Inbox Privado</div>
                                                <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start text-left shadow-lg">
                                                    <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-xs text-primary-400 font-bold shrink-0">
                                                        ★
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-white">Anúncio Vip</span>
                                                            <span className="text-[8px] text-slate-500">20:30</span>
                                                        </div>
                                                        <h5 className="font-bold text-xs text-white leading-tight">
                                                            {campaignTitle || 'Você recebeu uma oferta'}
                                                        </h5>
                                                        <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                                            {campaignMessage || 'Clique para abrir o link promocional e ver as diretrizes.'}
                                                        </p>
                                                        <div className="text-[10px] text-primary-400 font-bold flex items-center gap-0.5 pt-1">
                                                            <span>{campaignCtaText}</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Map Pin radar simulation */
                                            <div className="my-auto text-center space-y-4">
                                                <span className="text-[10px] text-slate-400 font-mono">Pino Dourado no Mapa</span>
                                                <div className="relative aspect-square w-full rounded-full border border-primary-500/10 bg-primary-500/5 flex items-center justify-center overflow-hidden max-w-[150px] mx-auto">
                                                    {/* Outer pulse */}
                                                    <div className="absolute inset-2 border border-primary-500/30 rounded-full animate-ping opacity-25"></div>
                                                    <div className="absolute inset-6 border border-primary-500/40 rounded-full animate-pulse opacity-40"></div>
                                                    {/* Golden Pin */}
                                                    <div className="absolute z-30 w-7 h-7 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg transform -translate-y-1">
                                                        <span className="text-slate-950 font-black text-xs">★</span>
                                                    </div>
                                                    <div className="absolute z-20 bottom-8 text-[9px] font-mono text-amber-400 bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                                                        PATROCINADO
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 leading-relaxed font-sans px-2">Seu estabelecimento ganha um pino dourado brilhante para todos os usuários próximos.</p>
                                            </div>
                                        )}

                                        {/* Phone Bottom bar */}
                                        <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto z-40 mt-auto"></div>
                                    </div>

                                    {/* Analytics estimate */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Alcance Esperado</p>
                                            <p className="text-xl font-black text-white mt-1">{estReach} {campaignPlacement === 'push' ? 'celulares' : 'impressões'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Custo de Veiculação</p>
                                            <p className="text-xl font-black text-emerald-400 mt-1">R$ {(estReach * (campaignPlacement === 'push' ? 0.10 : 0.05)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 mt-4">
                                    <p className="text-xs text-slate-500 flex items-start gap-1.5 leading-relaxed">
                                        <HelpCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                        <span>Dica do Google Ads: personalize o CTA com links diretos de compra de ingresso ou WhatsApp de reservas para otimizar o ROI.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Campaigns History table with Pause/Resume Toggle */}
                    <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl mt-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2 font-outfit">
                                    <span className="material-symbols-rounded text-primary-500">history</span>
                                    Campanhas em Andamento & Histórico
                                </h3>
                                <p className="text-xs text-slate-500">Gerencie campanhas ativas, pause cobranças ou reative ofertas conforme o movimento.</p>
                            </div>
                            <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-950 rounded-lg text-slate-400 border border-white/5 self-start sm:self-center">
                                Total: {campaignsHistory.length} Campanhas
                            </span>
                        </div>
                        
                        {campaignsHistory.length === 0 ? (
                            <div className="text-center py-12 bg-slate-950/10 border border-dashed border-white/5 rounded-xl">
                                <span className="material-symbols-rounded text-4xl text-slate-700">campaign</span>
                                <p className="text-xs text-slate-500 mt-2">Nenhuma campanha registrada para este estabelecimento.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                                            <th className="py-3 px-4">Canal</th>
                                            <th className="py-3 px-4">Data de Lançamento</th>
                                            <th className="py-3 px-4">Título / Oferta</th>
                                            <th className="py-3 px-4">Filtro Público</th>
                                            <th className="py-3 px-4 text-right">Alcance</th>
                                            <th className="py-3 px-4 text-right text-emerald-400">Custo</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                            <th className="py-3 px-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {campaignsHistory.map((camp) => (
                                            <tr key={camp.id} className="hover:bg-white/5 transition-all">
                                                <td className="py-3.5 px-4 font-bold text-slate-400 font-mono capitalize">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                                        camp.placement === 'push' ? 'bg-indigo-500/10 text-indigo-400' :
                                                        camp.placement === 'feed' ? 'bg-pink-500/10 text-pink-400' :
                                                        camp.placement === 'map' ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-sky-500/10 text-sky-400'
                                                    }`}>
                                                        {camp.placement || 'push'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-slate-400">
                                                    {new Date(camp.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-white max-w-[200px] truncate" title={camp.title}>{camp.title}</div>
                                                    <div className="text-slate-400 text-[10px] max-w-[200px] truncate mt-0.5" title={camp.message}>{camp.message}</div>
                                                </td>
                                                <td className="py-3.5 px-4 font-medium text-primary-400">{camp.target_tribe || 'Geral'}</td>
                                                <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                                                    {camp.estimated_reach === 0 ? '-' : `${camp.estimated_reach} views`}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                                                    R$ {Number(camp.cost).toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                        camp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        camp.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                        {camp.status === 'approved' ? 'Ativo' : camp.status === 'paused' ? 'Pausado' : camp.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                                            camp.status === 'approved' 
                                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                        }`}
                                                    >
                                                        {camp.status === 'approved' ? 'Pausar' : 'Reativar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    </>
                )}

                {/* 📝 2. COPILOTO DE COPYWRITING */}
                {activeSubTab === 'analytics' && (() => {
                    const totalReachReal = campaignsHistory.reduce((sum, c) => sum + (c.estimated_reach || 0), 0);
                    const totalCostReal = campaignsHistory.reduce((sum, c) => sum + Number(c.cost || 0), 0);
                    
                    const displayReach = totalReachReal;
                    const displayCost = totalCostReal;
                    
                    const displayClicks = Math.round(displayReach * 0.046);
                    const displayCheckins = Math.round(displayClicks * 0.18);
                    
                    const estRevenue = displayCheckins * roiTicketValue;
                    const roas = displayCost > 0 ? (estRevenue / displayCost).toFixed(1) : "0.0";
                    const cpc = displayClicks > 0 ? (displayCost / displayClicks) : 0.0;
                    const cpa = displayCheckins > 0 ? (displayCost / displayCheckins) : 0.0;
                    const ctr = displayReach > 0 ? ((displayClicks / displayReach) * 100).toFixed(2) : "0.0";

                    // Weekly chart dataset scaled based on campaign history scale
                    const chartBaseline = [
                        { day: 'Seg', views: 820, clicks: 38, checkins: 7 },
                        { day: 'Ter', views: 1100, clicks: 51, checkins: 9 },
                        { day: 'Qua', views: 1450, clicks: 66, checkins: 12 },
                        { day: 'Qui', views: 1800, clicks: 83, checkins: 15 },
                        { day: 'Sex', views: 3200, clicks: 147, checkins: 26 },
                        { day: 'Sáb', views: 4100, clicks: 189, checkins: 34 },
                        { day: 'Dom', views: 2380, clicks: 110, checkins: 20 }
                    ];

                    const scaleFactor = totalReachReal > 0 ? (totalReachReal / 14850) : 0;
                    const weeklyDataset = chartBaseline.map(item => ({
                        ...item,
                        views: Math.round(item.views * scaleFactor),
                        clicks: Math.round(item.clicks * scaleFactor),
                        checkins: Math.round(item.checkins * scaleFactor)
                    }));

                    return (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Visual Funnel and Performance Charts */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Core Analytics Overview */}
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-4">
                                        <div>
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                                                Intuitivo & Em Tempo Real
                                            </span>
                                            <h3 className="text-xl font-black text-white flex items-center gap-2 mt-2 font-outfit">
                                                <TrendingUp className="text-primary-500 w-5 h-5" />
                                                Métricas de Conversão O2O (Online-to-Offline)
                                            </h3>
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Sincronizado
                                        </div>
                                    </div>

                                    {/* 3-Step Funnel Layout */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Funil de Atração de Clientes</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Step 1: Views */}
                                            <div className="relative bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex flex-col justify-between overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                                                <div className="flex items-center justify-between z-10">
                                                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">1. Impressões (Reach)</span>
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold font-mono">Topo</span>
                                                </div>
                                                <div className="mt-4 z-10">
                                                    <p className="text-3xl font-black text-white font-outfit tracking-tight">{displayReach.toLocaleString('pt-BR')}</p>
                                                    <p className="text-[11px] text-slate-500 leading-tight mt-1">Celulares que visualizaram os anúncios locais.</p>
                                                </div>
                                                <div className="mt-4 border-t border-white/5 pt-2 flex justify-between items-center text-[11px] text-slate-400 z-10">
                                                    <span>Taxa de Entrega</span>
                                                    <span className="font-mono font-bold text-blue-400">100%</span>
                                                </div>
                                            </div>

                                            {/* Step 2: Clicks */}
                                            <div className="relative bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex flex-col justify-between overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
                                                <div className="flex items-center justify-between z-10">
                                                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">2. Engajamento (Cliques)</span>
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold font-mono">Meio</span>
                                                </div>
                                                <div className="mt-4 z-10">
                                                    <p className="text-3xl font-black text-white font-outfit tracking-tight">{displayClicks.toLocaleString('pt-BR')}</p>
                                                    <p className="text-[11px] text-slate-500 leading-tight mt-1">Usuários que interagiram e clicaram no CTA.</p>
                                                </div>
                                                <div className="mt-4 border-t border-white/5 pt-2 flex justify-between items-center text-[11px] text-slate-400 z-10">
                                                    <span>Taxa de Cliques (CTR)</span>
                                                    <span className="font-mono font-bold text-purple-400">{ctr}%</span>
                                                </div>
                                            </div>

                                            {/* Step 3: Check-ins */}
                                            <div className="relative bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex flex-col justify-between overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                                                <div className="flex items-center justify-between z-10">
                                                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">3. Check-ins Físicos</span>
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold font-mono">Fundo (O2O)</span>
                                                </div>
                                                <div className="mt-4 z-10">
                                                    <p className="text-3xl font-black text-white font-outfit tracking-tight">{displayCheckins.toLocaleString('pt-BR')}</p>
                                                    <p className="text-[11px] text-slate-500 leading-tight mt-1">Visitas físicas reais confirmadas por radar.</p>
                                                </div>
                                                <div className="mt-4 border-t border-white/5 pt-2 flex justify-between items-center text-[11px] text-slate-400 z-10">
                                                    <span>Custo por Atração (CPA)</span>
                                                    <span className="font-mono font-bold text-emerald-400">R$ {cpa.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* High Contrast Custom SVG Chart */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Curva de Desempenho Semanal</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-mono">
                                                <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-blue-500 rounded-full"></span> Visualizações</span>
                                                <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-purple-500 rounded-full"></span> Cliques</span>
                                                <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-emerald-500 rounded-full"></span> Check-ins</span>
                                            </div>
                                        </div>

                                        <div className="relative bg-slate-950 p-6 rounded-2xl border border-white/5">
                                            {/* Interactive Custom SVG Line & Area chart */}
                                            <svg viewBox="0 0 500 180" className="w-full overflow-visible">
                                                <defs>
                                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                                                    </linearGradient>
                                                </defs>

                                                {/* Grid Lines */}
                                                <line x1="20" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                                <line x1="20" y1="60" x2="480" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                                <line x1="20" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                                <line x1="20" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                                <line x1="20" y1="150" x2="480" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                                                {/* X Axis Labels */}
                                                {weeklyDataset.map((item, idx) => {
                                                    const x = 20 + idx * 75;
                                                    return (
                                                        <text key={idx} x={x} y="168" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                                                            {item.day}
                                                        </text>
                                                    );
                                                })}

                                                {/* Area under curve path */}
                                                <path 
                                                    d={`M 20,${150 - (weeklyDataset[0].views / 5000) * 120} 
                                                        L 95,${150 - (weeklyDataset[1].views / 5000) * 120} 
                                                        L 170,${150 - (weeklyDataset[2].views / 5000) * 120} 
                                                        L 245,${150 - (weeklyDataset[3].views / 5000) * 120} 
                                                        L 320,${150 - (weeklyDataset[4].views / 5000) * 120} 
                                                        L 395,${150 - (weeklyDataset[5].views / 5000) * 120} 
                                                        L 470,${150 - (weeklyDataset[6].views / 5000) * 120} 
                                                        L 470,150 L 20,150 Z`} 
                                                    fill="url(#areaGrad)" 
                                                />

                                                {/* Clicks bar representation */}
                                                {weeklyDataset.map((item, idx) => {
                                                    const x = 20 + idx * 75;
                                                    const barHeight = Math.max(4, (item.clicks / 250) * 100);
                                                    return (
                                                        <rect
                                                            key={`bar-${idx}`}
                                                            x={x - 4}
                                                            y={150 - barHeight}
                                                            width="8"
                                                            height={barHeight}
                                                            fill="#a855f7"
                                                            opacity="0.8"
                                                            rx="2"
                                                        />
                                                    );
                                                })}

                                                {/* Line Path for Views */}
                                                <path 
                                                    d={`M 20,${150 - (weeklyDataset[0].views / 5000) * 120} 
                                                        L 95,${150 - (weeklyDataset[1].views / 5000) * 120} 
                                                        L 170,${150 - (weeklyDataset[2].views / 5000) * 120} 
                                                        L 245,${150 - (weeklyDataset[3].views / 5000) * 120} 
                                                        L 320,${150 - (weeklyDataset[4].views / 5000) * 120} 
                                                        L 395,${150 - (weeklyDataset[5].views / 5000) * 120} 
                                                        L 470,${150 - (weeklyDataset[6].views / 5000) * 120}`} 
                                                    fill="none" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth="2.5" 
                                                />

                                                {/* Clickable Hover Zones and Dots */}
                                                {weeklyDataset.map((item, idx) => {
                                                    const x = 20 + idx * 75;
                                                    const y = 150 - (item.views / 5000) * 120;
                                                    const isHovered = hoveredChartIndex === idx;
                                                    return (
                                                        <g key={`dots-${idx}`} className="cursor-pointer" onMouseEnter={() => setHoveredChartIndex(idx)} onMouseLeave={() => setHoveredChartIndex(null)}>
                                                            {/* Invisible trigger circle */}
                                                            <circle cx={x} cy={y} r="20" fill="transparent" />
                                                            {/* Actual visual dot */}
                                                            <circle 
                                                                cx={x} 
                                                                cy={y} 
                                                                r={isHovered ? "6" : "4"} 
                                                                fill="#3b82f6" 
                                                                stroke="#ffffff" 
                                                                strokeWidth="1.5" 
                                                                className="transition-all duration-150"
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </svg>

                                            {/* Dynamic Tooltip on Chart Hover */}
                                            {hoveredChartIndex !== null && (
                                                <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl flex items-center gap-4 animate-fade-in z-20">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">{weeklyDataset[hoveredChartIndex].day} • Detalhes</p>
                                                        <h5 className="text-xs font-black text-white mt-0.5">Veiculação Local</h5>
                                                    </div>
                                                    <div className="h-6 w-px bg-white/10"></div>
                                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 block">Alcance</span>
                                                            <span className="font-mono font-black text-blue-400">{weeklyDataset[hoveredChartIndex].views}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 block">Cliques</span>
                                                            <span className="font-mono font-black text-purple-400">{weeklyDataset[hoveredChartIndex].clicks}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 block">Check-ins</span>
                                                            <span className="font-mono font-black text-emerald-400">{weeklyDataset[hoveredChartIndex].checkins}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* O2O ROI Simulator & Financial Return Dashboard */}
                            <div className="space-y-6">
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-outfit">
                                            <span className="material-symbols-rounded text-primary-500 text-lg">calculate</span>
                                            Simulador de ROI Goyaba
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1">Calcule o retorno financeiro real gerado por cada visita confirmada no seu local.</p>
                                    </div>

                                    {/* Slide control to set Ticket Médio */}
                                    <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold">Ticket Médio (Bebida/Entrada)</span>
                                            <span className="text-emerald-400 font-mono font-black text-sm">R$ {roiTicketValue}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="15" 
                                            max="250" 
                                            step="5"
                                            value={roiTicketValue}
                                            onChange={(e) => setRoiTicketValue(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                        />
                                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                            <span>R$ 15 (Bar Simples)</span>
                                            <span>R$ 250 (Festa Premium)</span>
                                        </div>
                                    </div>

                                    {/* Financial Matrix Cards */}
                                    <div className="space-y-3.5">
                                        {/* Cost vs Billing */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5 text-center">
                                                <span className="text-[9px] text-slate-500 font-mono">INVESTIDO</span>
                                                <p className="text-lg font-black text-slate-300 mt-1">R$ {displayCost.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                                                <span className="text-[9px] text-emerald-500/70 font-mono font-bold">RETORNO ESTIMADO</span>
                                                <p className="text-lg font-black text-emerald-400 mt-1">R$ {estRevenue.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* ROI Return Factor */}
                                        <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="text-[9px] text-slate-500 font-mono block">RETORNO SOBRE ANÚNCIO (ROAS)</span>
                                                <p className="text-xs text-slate-300 mt-1">Multiplicador de faturamento por real gasto.</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-primary-400 font-mono">{roas}x</span>
                                                <span className="text-[9px] bg-primary-500/10 text-primary-400 block px-2 py-0.5 rounded-full mt-1 font-bold">Excelente</span>
                                            </div>
                                        </div>

                                        {/* Standard CPC, CPA indicators */}
                                        <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-2.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Custo por Clique Médio (CPC)</span>
                                                <span className="font-mono font-bold text-white">R$ {cpc.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Custo por Atração Física (CPA)</span>
                                                <span className="font-mono font-bold text-white">R$ {cpa.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Cliques Convertidos em Visita</span>
                                                <span className="font-mono font-bold text-emerald-400">18.00%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                                        Fórmula baseada em modelagem de atribuição linear local por proximidade georreferenciada Goyaba B2B.
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 💎 4. ADS PATROCINADOS & BILLING */}
                {activeSubTab === 'wallet' && (
                    <>
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
                                        Comprar Créditos
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Real Transaction History from Database */}
                    <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-rounded text-green-400 font-bold">receipt_long</span>
                                    Histórico de Transações e Cobranças
                                </h3>
                                <p className="text-xs text-slate-500">Extrato de lançamentos e recargas da sua carteira B2B integrado em tempo real.</p>
                            </div>
                            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-950 rounded-lg text-slate-400 border border-white/5">
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
                                        <tr className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                                            <th className="py-3 px-4">Data</th>
                                            <th className="py-3 px-4">Descrição</th>
                                            <th className="py-3 px-4 text-center">Tipo</th>
                                            <th className="py-3 px-4 text-right">Valor</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactionHistory.map((tx) => {
                                            const isNegative = Number(tx.amount) < 0;
                                            return (
                                                <tr key={tx.id} className="hover:bg-white/5 transition-all">
                                                    <td className="py-3.5 px-4 font-mono text-slate-400">
                                                        {new Date(tx.created_at).toLocaleDateString('pt-BR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-white">{tx.description}</td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                            tx.type === 'credit_purchase' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                            {tx.type === 'credit_purchase' ? 'DEPÓSITO' : 'DÉBITO'}
                                                        </span>
                                                    </td>
                                                    <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                                                        {isNegative ? '-' : '+'} R$ {Math.abs(Number(tx.amount)).toFixed(2)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-white/5">
                                                            {tx.status === 'approved' ? 'Aprovado' : tx.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    </>
                )}

            </div>
        </div>
    );
};

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
    ChevronRight,
    Map,
    Upload,
    X
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
    const [campaignPlacement, setCampaignPlacement] = useState<'feed' | 'map' | 'messages' | 'push'>('push');
    const [campaignDuration, setCampaignDuration] = useState<number>(24);
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
                    duration_hours: campaignDuration
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
                `[Push Raio de ${campaignRange}m para ${campaignTargetTribe}] ${campaignMessage}`,
                campaignImageUrl
            );

            if (success) {
                // Clear input fields
                setCampaignTitle('');
                setCampaignMessage('');
                setCampaignImageUrl('');
                
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
                    <>
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
                                    {/* Campaign Placement */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-300">Onde mostrar a campanha?</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {[
                                                { id: 'push', label: 'Push Notification (Raio)' },
                                                { id: 'feed', label: 'Feed de Destaques' },
                                                { id: 'map', label: 'Pino Promocional (Mapa)' },
                                                { id: 'messages', label: 'Inbox / Mensagens' }
                                            ].map(placement => (
                                                <button
                                                    key={placement.id}
                                                    type="button"
                                                    onClick={() => setCampaignPlacement(placement.id as any)}
                                                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-all ${campaignPlacement === placement.id ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-slate-950/30 border-white/5 text-slate-400 hover:bg-slate-850'}`}
                                                >
                                                    {placement.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Campaign Duration - Only for non-push */}
                                    {campaignPlacement !== 'push' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-300">Duração da Campanha (Horas)</label>
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
                                    )}

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
                                                <label className="text-sm font-bold text-slate-300">Imagem Ilustrativa (Opcional)</label>
                                                
                                                {campaignImageUrl ? (
                                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-900 group">
                                                        <img src={campaignImageUrl} alt="Campaign Image" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCampaignImageUrl('')}
                                                                className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full"
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
                                                            {isUploadingImage ? "Enviando..." : "Clique para anexar uma imagem"}
                                                        </span>
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
                                                Lançar Campanha (Custo: R$ {(estReach * (campaignPlacement === 'push' ? 0.10 : 0.05)).toFixed(2)})
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
                                        {campaignPlacement === 'push' ? <Map className="w-4 h-4 text-primary-400" /> : <Megaphone className="w-4 h-4 text-primary-400" />}
                                        {campaignPlacement === 'push' ? 'Simulador de Alcance de Geofence' : 'Alcance da Campanha'}
                                    </h4>

                                    {/* Custom Simulated Map graphic representing concentric circles from venue */}
                                    {campaignPlacement === 'push' && (
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
                                    )}

                                    {/* Analytics stats */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-mono">AUDIÊNCIA ESTIMADA</p>
                                            <p className="text-2xl font-bold text-white mt-1">{estReach} {campaignPlacement === 'push' ? 'celulares' : 'views'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-mono">INVESTIMENTO DO DISPARO</p>
                                            <p className="text-2xl font-bold text-green-400 mt-1">R$ {(estReach * (campaignPlacement === 'push' ? 0.10 : 0.05)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 mt-5">
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        Como funciona? {campaignPlacement === 'push' ? 'Cada push tem um custo simbólico de faturamento de R$ 0,10 por celular alcançado.' : `Esta campanha terá a duração de ${campaignDuration}h por um custo reduzido de R$ 0,05 por view estimada.`} Economize criando mensagens atraentes para seu tom ideal!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Real Campaign History from Database */}
                    <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-rounded text-primary-500">history</span>
                                    Histórico de Campanhas Realizadas
                                </h3>
                                <p className="text-xs text-slate-500">Campanhas salvas e auditadas diretamente no banco de dados.</p>
                            </div>
                            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-950 rounded-lg text-slate-400 border border-white/5">
                                Total: {campaignsHistory.length}
                            </span>
                        </div>
                        
                        {campaignsHistory.length === 0 ? (
                            <div className="text-center py-8 bg-slate-950/20 border border-dashed border-white/5 rounded-xl">
                                <p className="text-xs text-slate-500">Nenhuma campanha registrada para este estabelecimento.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                                            <th className="py-3 px-4">Data</th>
                                            <th className="py-3 px-4">Título</th>
                                            <th className="py-3 px-4">Mensagem</th>
                                            <th className="py-3 px-4">Tribo Alvo</th>
                                            <th className="py-3 px-4 text-right">Raio</th>
                                            <th className="py-3 px-4 text-right">Alcance</th>
                                            <th className="py-3 px-4 text-right text-emerald-400">Custo</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {campaignsHistory.map((camp) => (
                                            <tr key={camp.id} className="hover:bg-white/5 transition-all">
                                                <td className="py-3.5 px-4 font-mono text-slate-400">
                                                    {new Date(camp.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-white">{camp.title}</td>
                                                <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={camp.message}>{camp.message}</td>
                                                <td className="py-3.5 px-4 font-bold text-primary-400">{camp.target_tribe}</td>
                                                <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                                                    {camp.range_meters === 0 ? '-' : `${camp.range_meters}m`}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-white font-bold">
                                                    {camp.estimated_reach === 0 ? '-' : camp.estimated_reach}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                                                    R$ {Number(camp.cost).toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        camp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        camp.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                        {camp.status === 'approved' ? 'Ativo' : camp.status === 'paused' ? 'Pausado' : camp.status}
                                                    </span>
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
                                        Métricas Reais de Marketing
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Acompanhamento consolidado e real das ações executadas pelo seu local.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                                    <div className="bg-slate-950/40 p-6 rounded-xl border border-white/5 text-center flex flex-col justify-center items-center">
                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest">ALCANCE TOTAL ESTIMADO</span>
                                        <p className="text-3xl font-black text-blue-400 mt-2">{campaignsHistory.reduce((sum, c) => sum + (c.estimated_reach || 0), 0)} views</p>
                                        <span className="text-xs text-slate-500 mt-2">Usuários notificados</span>
                                    </div>
                                    <div className="bg-slate-950/40 p-6 rounded-xl border border-white/5 text-center flex flex-col justify-center items-center">
                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest">CAMPANHAS EXECUTADAS</span>
                                        <p className="text-3xl font-black text-purple-400 mt-2">{campaignsHistory.length}</p>
                                        <span className="text-xs text-slate-500 mt-2">Disparos realizados</span>
                                    </div>
                                    <div className="bg-slate-950/40 p-6 rounded-xl border border-white/5 text-center flex flex-col justify-center items-center">
                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest">INVESTIMENTO TOTAL</span>
                                        <p className="text-3xl font-black text-emerald-400 mt-2">R$ {campaignsHistory.reduce((sum, c) => sum + (c.cost || 0), 0).toFixed(2)}</p>
                                        <span className="text-xs text-slate-500 mt-2">Custo acumulado</span>
                                    </div>
                                </div>
                                
                                <div className="mt-4 bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex gap-3 items-start">
                                    <HelpCircle className="w-5 h-5 text-primary-400 shrink-0" />
                                    <p className="text-sm text-slate-300">
                                        Os dados apresentados acima são reais e baseados no seu histórico de disparos nesta plataforma. Métricas avançadas de conversão O2O (Online-to-Offline) como check-ins físicos automáticos estão em desenvolvimento para as próximas atualizações.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 💎 4. ADS PATROCINADOS & BILLING */}
                {activeSubTab === 'ads' && (
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

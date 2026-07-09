import fs from 'fs';
let code = fs.readFileSync('pages/Admin/views/B2BManagerView.tsx', 'utf8');

const updatedModFunc = `
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
                            description: \`Estorno: \${campData.title}\`,
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
`;

code = code.replace(/const handleModerateCampaign = async \([^{]*\{[^]*?catch \(err: any\) \{[^]*?\}\s*\};/m, updatedModFunc);

fs.writeFileSync('pages/Admin/views/B2BManagerView.tsx', code);

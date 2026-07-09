import fs from 'fs';
let code = fs.readFileSync('pages/Admin/views/B2BManagerView.tsx', 'utf8');

const stateModal = `
    const [redirectCampaignId, setRedirectCampaignId] = useState<string | null>(null);
    const [newTarget, setNewTarget] = useState<string>('');
`;
code = code.replace(/const \[historyTransactions, setHistoryTransactions\] = useState<any\[\]>\(\[\]\);/, "const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);\n" + stateModal);


const handleModerateCampaign = `
    const handleModerateCampaign = async (campaignId: string, newStatus: 'approved' | 'flagged' | 'cancelled' | 'redirected') => {
        if (newStatus === 'redirected') {
            setRedirectCampaignId(campaignId);
            setNewTarget('');
            return;
        }

        let updateData: any = { status: newStatus };
        
        const toastId = toast.loading("Processando campanha...");
        try {
            const { error } = await supabase
                .from('b2b_campaigns')
                .update(updateData)
                .eq('id', campaignId);

            if (error) throw error;

            toast.success("Campanha atualizada com sucesso!", { id: toastId });
            
            // se foi cancelada, podemos querer estornar os créditos (simplificado aqui)
            if (newStatus === 'cancelled') {
                toast.success("Campanha cancelada.");
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
`;

code = code.replace(/const handleModerateCampaign = async \([^{]*\{[^]*?catch \(err: any\) \{[^]*?\}\s*\};/m, handleModerateCampaign);

const redirectModal = `
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
`;

code = code.replace(/\{\/\* TAB CONTENTS \*\/\}/, redirectModal + '\n\n            {/* TAB CONTENTS */}');

fs.writeFileSync('pages/Admin/views/B2BManagerView.tsx', code);

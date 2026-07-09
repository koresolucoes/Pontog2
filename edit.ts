import fs from 'fs';
let code = fs.readFileSync('pages/Admin/views/B2BManagerView.tsx', 'utf8');

// Add History states
code = code.replace(
    /const \[grantAmount, setGrantAmount\] = useState<number>\(100\);/g,
    `const [grantAmount, setGrantAmount] = useState<number>(100);\n    const [historyPartnerId, setHistoryPartnerId] = useState<string | null>(null);\n    const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);`
);

// Add history fetch function
const fetchHistoryFunc = `
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
`;
code = code.replace(/const filteredPartners = partners\.filter/g, fetchHistoryFunc + '\n    const filteredPartners = partners.filter');

// Add history button
code = code.replace(
    /<button\s+onClick=\{\(\) => setSelectedPartnerId\(partner\.id\)\}\s+className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3\.5 py-2 rounded-xl transition-all shadow-md shadow-pink-900\/10 flex items-center gap-1\.5 ml-auto"\s*>\s*<Plus className="w-3\.5 h-3\.5" \/>\s*Conceder Créditos\s*<\/button>/g,
    `<div className="flex justify-end gap-2">
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
    </div>`
);

// Add History Modal
const historyModal = `
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
                            <div className={\`text-lg font-mono font-bold \${tx.amount > 0 ? 'text-green-400' : 'text-pink-400'}\`}>
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
`;

code = code.replace(/\{\/\* Grant Credits Modal Overlay \*\/\}/, historyModal + '\n\n                        {/* Grant Credits Modal Overlay */}');

// Add Cancelar/Redirecionar to campaigns
code = code.replace(
    /status: 'approved' \| 'flagged' \| 'pending' \| 'paused';/,
    `status: 'approved' | 'flagged' | 'pending' | 'paused' | 'cancelled' | 'redirected';`
);

const moderateCampaignFunc = `
    const handleModerateCampaign = async (campaignId: string, newStatus: 'approved' | 'flagged' | 'cancelled' | 'redirected') => {
        let updateData: any = { status: newStatus };
        
        if (newStatus === 'redirected') {
            const newTribe = prompt("Para qual tribo deseja redirecionar esta campanha?");
            if (!newTribe) return;
            updateData.target_tribe = newTribe;
            updateData.status = 'approved'; // keep it approved but changed
        }

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
`;

code = code.replace(/const handleModerateCampaign = async \([^{]*\{[^]*?catch \(err: any\) \{[^]*?\}\s*\};/m, moderateCampaignFunc);

const campaignActions = `
{cmp.status === 'approved' && (
    <div className="flex md:flex-col justify-end gap-2.5 self-start md:self-center">
        <button
            onClick={() => handleModerateCampaign(cmp.id, 'flagged')}
            className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
            <Ban className="w-3.5 h-3.5" />
            Suspender
        </button>
        <button
            onClick={() => handleModerateCampaign(cmp.id, 'redirected')}
            className="bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-transparent text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
            <AlertTriangle className="w-3.5 h-3.5" />
            Redirecionar
        </button>
        <button
            onClick={() => handleModerateCampaign(cmp.id, 'cancelled')}
            className="bg-slate-500/10 hover:bg-slate-600 text-slate-400 hover:text-white border border-slate-500/20 hover:border-transparent text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
            <Trash2 className="w-3.5 h-3.5" />
            Cancelar
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
            Re-Ativar
        </button>
    </div>
)}
{cmp.status === 'cancelled' && (
    <div className="flex md:flex-col justify-end gap-2.5 self-start md:self-center text-slate-500 text-xs font-bold">
        CANCELADA
    </div>
)}
`;

code = code.replace(/\{cmp\.status === 'approved' && \(\s*<div className="flex md:flex-col justify-end gap-2\.5 self-start md:self-center">[^]*?\{cmp\.status === 'flagged' && \(\s*<div className="flex md:flex-col justify-end gap-2\.5 self-start md:self-center">[^]*?Re-Ativar Campanha\s*<\/button>\s*<\/div>\s*\)\}/m, campaignActions);


// Also update the flag check in the campaign list
code = code.replace(/\{cmp\.status === 'flagged' \? \(/g, `{cmp.status === 'flagged' ? (\n                                                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">SUSPENSA (Spam/Ofensiva)</span>\n                                                    ) : cmp.status === 'cancelled' ? (\n                                                        <span className="text-[9px] bg-slate-500/10 text-slate-400 border border-slate-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">CANCELADA</span>\n                                                    ) : (`);
code = code.replace(/ATIVA & SAUDÁVEL<\/span>\s*\)\}/g, `ATIVA & SAUDÁVEL</span>\n                                                    )}`);

fs.writeFileSync('pages/Admin/views/B2BManagerView.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

const regex = /<div className="flex border-b border-white\/5 gap-1 overflow-x-auto pb-px">[\s\S]*?<\/div>\s*\{\/\* TAB CONTENTS \*\/\}/;
const newTabs = `<div className="flex border-b border-white/5 gap-1 overflow-x-auto pb-px">
                <button 
                    onClick={() => setActiveSubTab('campaigns')}
                    className={\`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 \${activeSubTab === 'campaigns' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}\`}
                >
                    <Megaphone className="w-4 h-4" />
                    Nova Campanha
                </button>
                <button 
                    onClick={() => setActiveSubTab('analytics')}
                    className={\`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 \${activeSubTab === 'analytics' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}\`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Analytics O2O
                </button>
                <button 
                    onClick={() => setActiveSubTab('wallet')}
                    className={\`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 \${activeSubTab === 'wallet' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}\`}
                >
                    <Wallet className="w-4 h-4" />
                    Carteira & Saldo
                </button>
            </div>
            {/* TAB CONTENTS */}`;
code = code.replace(regex, newTabs);
fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);

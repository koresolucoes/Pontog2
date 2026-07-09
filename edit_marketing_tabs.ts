import fs from 'fs';
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

// 1. Add 'banner' to useState
code = code.replace(
    /useState\<'geo' \| 'copy' \| 'analytics' \| 'ads'\>\('geo'\);/,
    "useState<'geo' | 'copy' | 'analytics' | 'ads' | 'banner'>('geo');"
);

// 2. Add the Banner tab button
const bannerTabBtn = `
                <button 
                    onClick={() => setActiveSubTab('banner')}
                    className={\`flex items-center gap-2.5 px-5 py-4 font-bold text-sm border-b-2 transition-all shrink-0 \${activeSubTab === 'banner' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}\`}
                >
                    <Image className="w-4 h-4" />
                    Banner Promocional
                </button>
`;

code = code.replace(
    /(<button[^>]*onClick=\{\(\) => setActiveSubTab\('ads'\)\}[^>]*>[\s\S]*?<\/button>)/,
    `$1\n${bannerTabBtn}`
);

fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);

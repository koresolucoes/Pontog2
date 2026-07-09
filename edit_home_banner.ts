import fs from 'fs';
let code = fs.readFileSync('components/HomeView.tsx', 'utf8');

// Import AdBanner
if (!code.includes("AdBanner")) {
    code = code.replace(
        "import { AdDetailModal } from './AdDetailModal';",
        "import { AdDetailModal } from './AdDetailModal';\nimport { AdBanner } from './AdBanner';"
    );
}

// Destructure bannerAds
code = code.replace(
    /const \{ feedAds \} = useAdStore\(\);/,
    "const { feedAds, bannerAds } = useAdStore();"
);

// Add to JSX
const bannerJsx = `
                {bannerAds.length > 0 && (
                    <div className="mb-6 rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-primary-500/30">
                        <AdBanner ad={bannerAds[0]} />
                    </div>
                )}
`;

code = code.replace(
    /<div className="flex-1 overflow-y-auto px-3 pt-3">/,
    `<div className="flex-1 overflow-y-auto px-3 pt-3">\n${bannerJsx}`
);

fs.writeFileSync('components/HomeView.tsx', code);

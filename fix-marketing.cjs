const fs = require('fs');
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

// Remove isPinoDouradoActive and isFeedBannerActive states
code = code.replace(/const \[isPinoDouradoActive, setIsPinoDouradoActive\] = useState\(false\);\n    const \[isFeedBannerActive, setIsFeedBannerActive\] = useState\(false\);\n/, '');

// Remove the state updates inside loadB2BData
code = code.replace(/const pinoActive = campaigns\.some\(c => c\.title === 'Destaque: Pino Dourado' && c\.status === 'approved'\);\n                    const bannerActive = campaigns\.some\(c => c\.title === 'Destaque: Banner no Feed' && c\.status === 'approved'\);\n                    setIsPinoDouradoActive\(pinoActive\);\n                    setIsFeedBannerActive\(bannerActive\);\n/, '');

// Remove handleTogglePinoDourado and handleToggleFeedBanner completely
const pinoStart = code.indexOf('const handleTogglePinoDourado');
const bannerEnd = code.indexOf('const handleSendCampaign = async (e: React.FormEvent) => {');
if (pinoStart !== -1 && bannerEnd !== -1) {
    code = code.substring(0, pinoStart) + code.substring(bannerEnd);
}

// Remove the UI blocks
const widgetStart = code.indexOf('<div className="lg:col-span-2 space-y-6">');
const creditBillingStart = code.indexOf('{/* Credit Billing Wallet panel */}');

if (widgetStart !== -1 && creditBillingStart !== -1) {
    code = code.substring(0, widgetStart) + code.substring(creditBillingStart);
}

// Also adjust the grid to center the wallet
code = code.replace(/<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">\s*\{\/\* Credit Billing Wallet panel \*\/\}\s*<div className="space-y-6">/, '<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">\n                        {/* Credit Billing Wallet panel */}\n                        <div className="md:col-span-2 space-y-6">');

fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);

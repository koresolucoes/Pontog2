import fs from 'fs';
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

code = code.replace(
    "`[Push Raio de ${campaignRange}m para ${campaignTargetTribe}] ${campaignMessage}`",
    "campaignMessage"
);

fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);

import fs from 'fs';
let code = fs.readFileSync('pages/Admin/views/B2BManagerView.tsx', 'utf8');

// Replace the joined query with sequential queries
let newCode = code.replace(
    /\.from\('b2b_wallets'\)\s*\.select\(\`[^`]+\`\);/s,
    `.from('b2b_wallets').select('*');`
);

fs.writeFileSync('pages/Admin/views/B2BManagerView.tsx', newCode);

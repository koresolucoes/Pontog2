import fs from 'fs';
let code = fs.readFileSync('pages/Admin/views/B2BManagerView.tsx', 'utf8');

// Replace the joined query with sequential queries
code = code.replace(
    /const \{ data: dbCampaigns, error: campErr \} = await supabase\s*\.from\('b2b_campaigns'\)\s*\.select\([\s\S]*?\)\s*\.order\('created_at', \{ ascending: false \}\);/s,
    `const { data: dbCampaigns, error: campErr } = await supabase.from('b2b_campaigns').select('*').order('created_at', { ascending: false });`
);

fs.writeFileSync('pages/Admin/views/B2BManagerView.tsx', code);

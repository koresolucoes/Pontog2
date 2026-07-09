import fs from 'fs';
let code = fs.readFileSync('pages/Admin/views/B2BManagerView.tsx', 'utf8');

// Add venue fetch
const venueFetch = `
            const { data: dbVenues, error: venueErr } = await supabase.from('venues').select('id, name, owner_id');
            if (venueErr) throw venueErr;
`;

code = code.replace(
    /\/\/\s*Map profiles for quick lookup/,
    venueFetch + '\n            // Map profiles for quick lookup'
);

const venueMap = `
            const venueMap = new Map<string, any>();
            if (dbVenues) {
                dbVenues.forEach(v => venueMap.set(v.id, v));
            }
`;

code = code.replace(
    /if \(profiles\) \{\s*profiles\.forEach[^}]+\}\s*/,
    `if (profiles) {\n                profiles.forEach(p => profileMap.set(p.id, p));\n            }\n` + venueMap
);

code = code.replace(
    /const venueObj = w\.venues as any;/,
    `const venueObj = venueMap.get(w.venue_id) as any;`
);

code = code.replace(
    /venueName: cmp\.venues\?.name \|\| 'Local Desconhecido',/,
    `venueName: venueMap.get(cmp.venue_id)?.name || 'Local Desconhecido',`
);

fs.writeFileSync('pages/Admin/views/B2BManagerView.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('pages/Admin/views/VenuesView.tsx', 'utf8');

// Add states for search and import
code = code.replace(
    /const \[filter, setFilter\] = useState<'all' \| 'pending'>\('all'\);/,
    "const [filter, setFilter] = useState<'all' | 'pending'>('all');\n    const [searchQuery, setSearchQuery] = useState('');\n    const [importing, setImporting] = useState(false);"
);

// Add the import function
code = code.replace(
    /const fetchVenues = async \(\) => {/,
    `const handleMassImport = async () => {
        if (!confirm('Deseja importar a base inicial de locais LGBT nas principais cidades?')) return;
        setImporting(true);
        try {
            const res = await fetch('/api/admin/mass-import', {
                method: 'POST',
                headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ venues: [] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(\`Importação concluída: \${data.count} locais inseridos.\`);
            fetchVenues();
        } catch(err: any) {
            toast.error(err.message || 'Erro na importação');
        } finally {
            setImporting(false);
        }
    };

    const fetchVenues = async () => {`
);

// Add the import button to the header
code = code.replace(
    /<button \n                     onClick=\{\(\) => setEditingVenue\(DEFAULT_VENUE_STATE\)\}/,
    `<div className="flex gap-2">
                    <button 
                        onClick={handleMassImport}
                        disabled={importing}
                        className="bg-slate-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-rounded">download</span>
                        {importing ? 'Importando...' : 'Importação em Massa'}
                    </button>
                    <button 
                     onClick={() => setEditingVenue(DEFAULT_VENUE_STATE)}`
);

// Close the button wrap
code = code.replace(
    /Novo Local\n                <\/button>\n            <\/div>/,
    `Novo Local
                </button>
                </div>
            </div>`
);

// Add the search bar to the filter area
code = code.replace(
    /<div className="flex gap-2 mb-6 border-b border-white\/10 pb-1">/,
    `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                <div className="flex gap-2">`
);

// Close the flex and add search bar
code = code.replace(
    /Pendentes \(\{venues\.filter\(v => !v\.is_verified\)\.length\}\)\n                <\/button>\n            <\/div>/,
    `Pendentes ({venues.filter(v => !v.is_verified).length})
                </button>
                </div>
                <div className="relative w-full sm:w-64">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                        type="text"
                        placeholder="Buscar local..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                </div>
            </div>`
);

// Update filteredVenues logic to use searchQuery
code = code.replace(
    /const filteredVenues = venues\.filter\(v => \{\n        if \(filter === 'pending'\) return !v\.is_verified;\n        return true;\n    \}\);/,
    `const filteredVenues = venues.filter(v => {
        if (filter === 'pending' && v.is_verified) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return v.name.toLowerCase().includes(q) || v.address?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q);
        }
        return true;
    });`
);

fs.writeFileSync('pages/Admin/views/VenuesView.tsx', code);

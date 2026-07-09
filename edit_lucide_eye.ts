import fs from 'fs';
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

if (!code.includes('Eye,')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Eye} from 'lucide-react';");
}

fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);

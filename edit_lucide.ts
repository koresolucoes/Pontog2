import fs from 'fs';
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

if (!code.includes('Image as ImageIcon') && !code.includes('Image,')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Image} from 'lucide-react';");
}

fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);

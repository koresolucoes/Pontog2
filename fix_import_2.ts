import fs from 'fs';
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

const regex = /import \{([^}]+)\} from 'lucide-react';/s; // note the 's' flag
const match = code.match(regex);
if (match) {
    if (!match[1].includes('Image')) {
        code = code.replace(regex, "import {" + match[1] + ", Image} from 'lucide-react';");
        fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);
        console.log('Fixed');
    } else {
        console.log('Already has Image');
    }
} else {
    console.log('No match');
}

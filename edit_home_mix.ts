import fs from 'fs';
let code = fs.readFileSync('components/HomeView.tsx', 'utf8');

const updatedLogic = `
        const items: (User | { type: 'ad' } | Ad)[] = [];
        
        let userIdx = 0;
        let adIdx = 0;
        
        // Misturar ads no meio dos usuários
        while (userIdx < sortedUsers.length || adIdx < feedAds.length) {
            // Adicionar até 4 usuários
            for (let i = 0; i < 4 && userIdx < sortedUsers.length; i++) {
                items.push(sortedUsers[userIdx++]);
            }
            // Inserir 1 ad
            if (adIdx < feedAds.length) {
                items.push(feedAds[adIdx++]);
            }
        }
        
        // Insert AdSense after 8th item
        if (items.length > 8) {
            items.splice(8, 0, { type: 'ad' });
        }
        
        return items;
`;

code = code.replace(
    /const items: \(User \| \{ type: 'ad' \} \| Ad\)\[\] = \[\.\.\.sortedUsers\];[\s\S]*?return items;/,
    updatedLogic
);

fs.writeFileSync('components/HomeView.tsx', code);

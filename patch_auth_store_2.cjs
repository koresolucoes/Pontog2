const fs = require('fs');
let code = fs.readFileSync('stores/authStore.ts', 'utf8');

code = code.replace(
    /\(await import\('\.\/communityStore'\)\)\.subscribeToCommunityEvents\(\);/,
    `(await import('./communityStore')).subscribeToCommunityEvents();
        (await import('./agoraStore')).subscribeToAgoraEvents();`
);

fs.writeFileSync('stores/authStore.ts', code);
console.log("Patched auth store 2");

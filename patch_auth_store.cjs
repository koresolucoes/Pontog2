const fs = require('fs');
let code = fs.readFileSync('stores/authStore.ts', 'utf8');

code = code.replace(
    /\(await import\('\.\/inboxStore'\)\)\.useInboxStore\.getState\(\)\.subscribeToInboxChanges\(\);/,
    `(await import('./inboxStore')).useInboxStore.getState().subscribeToInboxChanges();
        
        // Setup real-time throttled subscriptions
        (await import('./videoStore')).subscribeToVideoEvents();
        (await import('./communityStore')).subscribeToCommunityEvents();`
);

fs.writeFileSync('stores/authStore.ts', code);
console.log("Patched auth store");

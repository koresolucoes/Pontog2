const fs = require('fs');
let code = fs.readFileSync('stores/communityStore.ts', 'utf8');

// Add to interface
code = code.replace(
    /rejectConnection: \(connectionId: string\) => Promise<void>;/,
    `rejectConnection: (connectionId: string) => Promise<void>;
    applyBatchedPostUpdates: (postUpdates: any[]) => void;`
);

// Add to implementation
code = code.replace(
    /rejectConnection: async \(connectionId: string\) => \{/,
    `applyBatchedPostUpdates: (postUpdates) => {
        set(state => {
            const newPosts = [...state.currentCommunityPosts];
            let changed = false;
            
            if (postUpdates && postUpdates.length > 0) {
                const updateMap = new Map();
                postUpdates.forEach(u => updateMap.set(u.id, u));
                for (let i = 0; i < newPosts.length; i++) {
                    const update = updateMap.get(newPosts[i].id);
                    if (update) {
                        newPosts[i] = { ...newPosts[i], ...update };
                        changed = true;
                    }
                }
            }
            
            return changed ? { currentCommunityPosts: newPosts } : {};
        });
    },
    rejectConnection: async (connectionId: string) => {`
);

// Add the subscription logic at the bottom of the file
const subLogic = `
let postUpdateBatch: any[] = [];
let isPostBatchScheduled = false;

export const subscribeToCommunityEvents = () => {
   const processBatch = () => {
        if (postUpdateBatch.length > 0) {
            useCommunityStore.getState().applyBatchedPostUpdates(postUpdateBatch);
            postUpdateBatch = [];
        }
        isPostBatchScheduled = false;
   };

   supabase.channel('community_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, payload => {
          postUpdateBatch.push(payload.new);
          if (!isPostBatchScheduled) {
              isPostBatchScheduled = true;
              setTimeout(processBatch, 2000); // 2 second throttle batch
          }
      })
      .subscribe();
};
`;
code += subLogic;
fs.writeFileSync('stores/communityStore.ts', code);
console.log("Patched community store");

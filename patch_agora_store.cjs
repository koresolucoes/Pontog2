const fs = require('fs');
let code = fs.readFileSync('stores/agoraStore.ts', 'utf8');

// Add to interface
code = code.replace(
    /createPost: \(post: Partial<AgoraPost>\) => Promise<void>;/,
    `createPost: (post: Partial<AgoraPost>) => Promise<void>;
  applyBatchedPostUpdates: (postUpdates: any[]) => void;`
);

// Add to implementation
code = code.replace(
    /createPost: async \(post: Partial<AgoraPost>\) => \{/,
    `applyBatchedPostUpdates: (postUpdates) => {
      set(state => {
          const newPosts = [...state.posts];
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
          return changed ? { posts: newPosts } : {};
      });
  },
  createPost: async (post: Partial<AgoraPost>) => {`
);

// Add the subscription logic at the bottom of the file
const subLogic = `
let agoraPostUpdateBatch: any[] = [];
let isAgoraPostBatchScheduled = false;

export const subscribeToAgoraEvents = () => {
   const processBatch = () => {
        if (agoraPostUpdateBatch.length > 0) {
            useAgoraStore.getState().applyBatchedPostUpdates(agoraPostUpdateBatch);
            agoraPostUpdateBatch = [];
        }
        isAgoraPostBatchScheduled = false;
   };

   supabase.channel('agora_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agora_posts' }, payload => {
          agoraPostUpdateBatch.push(payload.new);
          if (!isAgoraPostBatchScheduled) {
              isAgoraPostBatchScheduled = true;
              setTimeout(processBatch, 2000); // 2 second throttle batch
          }
      })
      .subscribe();
};
`;
code += subLogic;
fs.writeFileSync('stores/agoraStore.ts', code);
console.log("Patched agora store");

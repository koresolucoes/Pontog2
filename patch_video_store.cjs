const fs = require('fs');
let code = fs.readFileSync('stores/videoStore.ts', 'utf8');

// Add applyBatchedUpdates to interface
code = code.replace(
    /deleteVideo: \(videoId: number\) => Promise<void>;/,
    `deleteVideo: (videoId: number) => Promise<void>;
    applyBatchedUpdates: (videos: any[], comments: any[]) => void;`
);

// Add applyBatchedUpdates to store
code = code.replace(
    /deleteVideo: async \(videoId: number\) => \{/,
    `applyBatchedUpdates: (videoUpdates, commentUpdates) => {
        set(state => {
            const newVideos = [...state.videos];
            let changed = false;
            
            // Process video updates (e.g. likes_count, views_count)
            if (videoUpdates && videoUpdates.length > 0) {
                const updateMap = new Map();
                videoUpdates.forEach(u => updateMap.set(u.id, u));
                for (let i = 0; i < newVideos.length; i++) {
                    const update = updateMap.get(newVideos[i].id);
                    if (update) {
                        newVideos[i] = { ...newVideos[i], ...update };
                        changed = true;
                    }
                }
            }
            
            // Note: we can't easily resolve comment profiles without a fetch, 
            // but we could just trigger fetchComments for modified video_ids if there are new comments.
            // For now, we will just update the video array.
            
            return changed ? { videos: newVideos } : {};
        });
        
        // If there are new comments, we can debounce a fetch for those specific videos
        if (commentUpdates && commentUpdates.length > 0) {
            const videoIdsToFetch = new Set<number>();
            commentUpdates.forEach(c => videoIdsToFetch.add(c.video_id));
            videoIdsToFetch.forEach(vid => {
                get().fetchComments(vid);
            });
        }
    },
    deleteVideo: async (videoId: number) => {`
);

// Add the subscription logic at the bottom of the file
const subLogic = `
let videoUpdateBatch: any[] = [];
let commentUpdateBatch: any[] = [];
let isVideoBatchScheduled = false;

export const subscribeToVideoEvents = () => {
   const processBatch = () => {
        if (videoUpdateBatch.length > 0 || commentUpdateBatch.length > 0) {
            useVideoStore.getState().applyBatchedUpdates(videoUpdateBatch, commentUpdateBatch);
            videoUpdateBatch = [];
            commentUpdateBatch = [];
        }
        isVideoBatchScheduled = false;
   };

   supabase.channel('videos_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, payload => {
          videoUpdateBatch.push(payload.new);
          if (!isVideoBatchScheduled) {
              isVideoBatchScheduled = true;
              setTimeout(processBatch, 2000); // 2 second throttle batch
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_comments' }, payload => {
          commentUpdateBatch.push(payload.new);
          if (!isVideoBatchScheduled) {
              isVideoBatchScheduled = true;
              setTimeout(processBatch, 2000);
          }
      })
      .subscribe();
};
`;
code += subLogic;
fs.writeFileSync('stores/videoStore.ts', code);
console.log("Patched video store");

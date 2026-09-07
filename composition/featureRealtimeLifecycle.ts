import { supabase } from '../lib/supabase';

type DisposeRealtime = () => void;
type FeatureView = 'agora' | 'communities' | 'videos';

type BatchController = {
  push: (payload: any) => void;
  dispose: () => void;
};

function createBatchController(flush: (updates: any[]) => void): BatchController {
  let pending: any[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const flushPending = () => {
    timeoutId = null;
    if (disposed || pending.length === 0) return;
    const updates = pending;
    pending = [];
    flush(updates);
  };

  return {
    push(payload: any) {
      if (disposed) return;
      pending.push(payload);
      if (!timeoutId) timeoutId = setTimeout(flushPending, 750);
    },
    dispose() {
      disposed = true;
      pending = [];
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    },
  };
}

async function mountAgoraRealtime(): Promise<DisposeRealtime> {
  const { useAgoraStore } = await import('../stores/agoraStore');
  const batch = createBatchController((updates) => {
    useAgoraStore.getState().applyBatchedPostUpdates(updates);
  });

  const channel = supabase
    .channel('feature:agora')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agora_posts' }, (payload) => {
      batch.push(payload.new);
    })
    .subscribe();

  return () => {
    batch.dispose();
    void supabase.removeChannel(channel);
  };
}

async function mountCommunityRealtime(): Promise<DisposeRealtime> {
  const { useCommunityStore } = await import('../stores/communityStore');
  const batch = createBatchController((updates) => {
    useCommunityStore.getState().applyBatchedPostUpdates(updates);
  });

  const channel = supabase
    .channel('feature:communities')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, (payload) => {
      batch.push(payload.new);
    })
    .subscribe();

  return () => {
    batch.dispose();
    void supabase.removeChannel(channel);
  };
}

async function mountVideosRealtime(): Promise<DisposeRealtime> {
  const { useVideoStore } = await import('../stores/videoStore');
  const videoBatch = createBatchController((updates) => {
    useVideoStore.getState().applyBatchedUpdates(updates, []);
  });
  const commentBatch = createBatchController((updates) => {
    useVideoStore.getState().applyBatchedUpdates([], updates);
  });

  const channel = supabase
    .channel('feature:videos')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, (payload) => {
      videoBatch.push(payload.new);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_comments' }, (payload) => {
      commentBatch.push(payload.new);
    })
    .subscribe();

  return () => {
    videoBatch.dispose();
    commentBatch.dispose();
    void supabase.removeChannel(channel);
  };
}

export async function mountFeatureRealtime(activeView: string): Promise<DisposeRealtime | undefined> {
  switch (activeView as FeatureView) {
    case 'agora':
      return mountAgoraRealtime();
    case 'communities':
      return mountCommunityRealtime();
    case 'videos':
      return mountVideosRealtime();
    default:
      return undefined;
  }
}

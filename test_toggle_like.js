import { create } from 'zustand';

const useStore = create((set) => ({
    likedVideos: {},
    videos: [{id: 1, likes_count: 0}],
    toggleLike: (videoId) => {
        set(state => ({
            likedVideos: { ...state.likedVideos, [videoId]: true },
            videos: state.videos.map(v => {
                if (v.id === videoId) {
                    return { ...v, likes_count: Math.max(0, (v.likes_count || 0) + 1) };
                }
                return v;
            })
        }));
    }
}));

useStore.getState().toggleLike(1);
console.log(useStore.getState().videos[0]);

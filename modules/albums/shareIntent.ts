export interface AlbumShareIntent {
  isViewOnce: boolean;
  expiresInHours?: number;
}

const pendingShareIntent = new Map<number, AlbumShareIntent>();

export const setAlbumShareIntent = (albumId: number, intent: AlbumShareIntent) => {
  pendingShareIntent.set(albumId, intent);
};

export const consumeAlbumShareIntent = (albumId: number): AlbumShareIntent => {
  const intent = pendingShareIntent.get(albumId) || { isViewOnce: false };
  pendingShareIntent.delete(albumId);
  return intent;
};

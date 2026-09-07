export interface AgoraFeedUserPost {
  id: number;
  user_id: string;
  photo_url: string;
  status_text: string | null;
  created_at: string;
  expires_at: string;
  username: string;
  avatar_url: string | null;
  age: number | null;
  is_venue: false;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

export interface AgoraFeedVenuePost {
  id: number;
  user_id: string;
  photo_url: string;
  status_text: string;
  created_at: string;
  expires_at: string;
  username: string;
  avatar_url: string | null;
  age: null;
  is_venue: true;
  venue: Record<string, unknown> | null;
  likes_count: 0;
  comments_count: 0;
  user_has_liked: false;
}

export type AgoraFeedItem = AgoraFeedUserPost | AgoraFeedVenuePost;

export interface AgoraFeedPage {
  items: AgoraFeedItem[];
  hasMore: boolean;
}

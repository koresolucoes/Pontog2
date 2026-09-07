export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';
export type WinkResult = 'success_plus' | 'success_free' | 'limit_reached' | 'already_winked' | string;

export interface ConnectionState {
  id: string | null;
  follower_id: string | null;
  following_id: string | null;
  status: ConnectionStatus;
  created_at: string | null;
  has_conversation: boolean;
}

export interface SocialConnection {
  id: string;
  follower_id: string;
  following_id: string;
  status: ConnectionStatus;
  created_at: string | null;
  other_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  other_age: number | null;
  other_is_verified: boolean;
  other_subscription_tier: string;
}

export interface ConnectionRequestResult {
  connection_id: string;
  conversation_id: number;
  status: ConnectionStatus;
}

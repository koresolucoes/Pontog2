

// types.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Tribe {
    id: number;
    name: string;
}

// Representa um perfil de usuário, alinhado com o novo schema do DB
export interface Profile {
  id: string;
  username: string;
  email: string; // Adicionado para o painel admin
  display_name: string | null;
  avatar_url: string;
  video_url: string | null; // Adicionado na Fase 1
  public_photos: string[] | null;
  status_text: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  tribes: string[] | null; // A RPC retorna um array de nomes para simplicidade
  position: string | null;
  hiv_status: string | null;
  updated_at: string;
  created_at: string;
  lat: number | null;
  lng: number | null;
  last_seen: string | null; // Adicionado para status de atividade
  distance_km: number | null; // Adicionado para distância
  subscription_tier: 'free' | 'plus'; // Adicionado para o plano premium
  subscription_expires_at: string | null; // Adicionado para data de expiração
  is_incognito: boolean; // Adicionado para o Modo Invisível
  is_traveling: boolean;
  visibility?: string; // Adicionado na Fase 1 - Modo Viajante
  city?: string;
  state?: string;
  has_completed_onboarding: boolean; // Adicionado para o fluxo de boas-vindas
  tribes_configured?: boolean;
  has_private_albums: boolean; // Adicionado para saber se o usuário tem álbuns
  status: 'active' | 'suspended' | 'banned'; // Adicionado para moderação
  suspended_until: string | null; // Adicionado para moderação
  kinks: string[] | null; // Adicionado para preferências sexuais
  can_host: boolean; // Adicionado para indicar se tem local
  is_verified: boolean; // Adicionado para selo de verificação
  has_seen_tour: boolean; // Adicionado para o tour guiado
  is_owner?: boolean; // Adicionado para painel B2B
  
  // FASE 1: Expansão para Rede Social Inclusiva (Comunidade LGBTQ+)
  gender_identity?: string;
  pronouns?: string;
  sexual_orientation?: string;
  relationship_status?: string;
  looking_for?: string[];
  interests?: string[];
  oral_preference?: string | null;
  site_preference?: string | null;
  redes_sociais?: {
    instagram?: string;
    twitter?: string;
    telegram?: string;
    onlyfans?: string;
  } | null;
  current_checkin_venue_id?: string;
  current_checkin_venue_name?: string;
}

// O tipo User estende Profile com campos calculados como 'idade'
export interface User extends Profile {
  age: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  image_url: string | null;
    repost_id?: string | null;
    tags?: string[];
    repost?: CommunityPost; // Optional populated repost
  is_view_once: boolean | null;
  viewed_at: string | null;
  created_at: string;
  read_at: string | null; // Adicionado para confirmação de leitura
  updated_at: string | null; // Adicionado para rastrear edições
}

export interface PrivateAlbumPhoto {
    id: number;
    album_id: number;
    user_id: string;
    photo_path: string;
    created_at: string;
}

export interface PrivateAlbum {
    id: number;
    user_id: string;
    name: string;
    created_at: string;
    // Isso vem da query com join no albumStore, e Supabase usa o nome da tabela
    private_album_photos: PrivateAlbumPhoto[];
}

// Novo tipo para a lista de conversas na caixa de entrada
export interface ConversationPreview {
    conversation_id: number;
    other_participant_id: string;
    other_participant_username: string;
    other_participant_avatar_url: string;
    other_participant_last_seen: string | null; // Adicionado para status de atividade
    last_message_content: string;
    last_message_created_at: string;
    last_message_sender_id: string;
    unread_count: number; // Adicionado para contagem de não lidas
    other_participant_subscription_tier: 'free' | 'plus';
}

// Novo tipo para os winks na caixa de entrada (basicamente um User)
export interface WinkWithProfile extends User {
    wink_created_at: string;
}

// Novo tipo para os visitantes do perfil (Quem Me Viu)
export interface ProfileViewWithProfile extends User {
    viewed_at: string;
}

// Novos tipos para acesso a álbuns privados
export type AlbumAccessStatus = 'pending' | 'granted' | 'denied' | null;

export interface AlbumAccessRequest {
    id: number;
    requester_id: string;
    created_at: string;
    username: string;
    avatar_url: string;
}

// Novo tipo para a funcionalidade 'Agora', agora com interações
export interface AgoraPost {
    id: number;
    user_id: string;
    photo_url: string;
    status_text: string | null;
    expires_at: string;
    // Campos do perfil do usuário, vindos do join
    username: string;
    avatar_url: string;
    age: number;
    // Campos de interação
    likes_count: number;
    comments_count: number;
    user_has_liked: boolean;
    is_venue?: boolean;
    venue?: Venue;
}

// Novo tipo para os comentários do modo 'Agora'
export interface AgoraComment {
    id: number;
    post_id: number;
    user_id: string;
    content: string;
    created_at: string;
    // Campos do perfil do autor do comentário
    profiles: {
        username: string;
        avatar_url: string;
    };
    // Campos de interação para os comentários
    likes_count: number;
    user_has_liked: boolean;
}

// Novo tipo para as preferências de notificação
export type NotificationType = 'new_message' | 'new_wink' | 'new_album_request';

export interface NotificationPreference {
    notification_type: NotificationType;
    enabled: boolean;
}

// FIX: Add missing types for Ads and TemporaryPerks
// Novos tipos para anúncios
export type AdType = 'feed' | 'inbox' | 'banner';

export interface Ad {
    id: number;
    ad_type: AdType;
    title: string;
    description: string;
    image_url: string;
    cta_text: string;
    cta_url: string;
    venue_id?: string;
}

// Novo tipo para benefícios temporários (ads recompensados)
export type PerkType = 'view_winks' | 'view_profile_views';

export interface TemporaryPerk {
    perk: PerkType;
    expires_at: string;
}

// Novo tipo para Locais/Venues (Mapa e Landing Page)
export type VenueType = 'sauna' | 'bar' | 'club' | 'cruising' | 'cinema' | 'shop' | 'event' | 'cafe' | 'restaurant' | 'ngo' | 'culture' | 'community_center';

export interface Venue {
    id: string;
    name: string;
    type: VenueType;
    description: string;
    address: string;
    lat: number;
    lng: number;
    image_url: string;
    opening_hours?: string;
    is_partner: boolean; // Se é parceiro pagante (destaque)
    owner_id?: string; // B2B Owner ID
    is_verified: boolean; // Status de verificação
    tags: string[];
    osm_id?: string; // ID do OpenStreetMap
    source_type?: 'user' | 'osm' | 'admin'; // Origem do dado
    website?: string;
    phone?: string;
    contact_email?: string;
    contact_phone?: string;
    city?: string;
    capacity?: number;
    submitted_by?: string; // ID do usuário que sugeriu
}

// Novo tipo para Check-ins em Locais/Eventos
export interface VenueCheckin {
    user_id: string;
    username: string;
    avatar_url: string;
    checked_in_at: string;
}

export interface VenueReview {
    id: string;
    venue_id: string;
    user_id: string;
    comment: string;
    photos: string[];
    created_at: string;
    likes_count?: number;
    replies_count?: number;
    user_has_liked?: boolean;
    // user profile fields fetched from join
    username?: string;
    avatar_url?: string;
}

export interface VenueReviewReply {
    id: string;
    review_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    // user profile fields fetched from join
    username?: string;
    avatar_url?: string;
}

// Novo tipo para Artigos do Blog/Notícias
export type ArticleType = 'news' | 'blog';

export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    content: string; // HTML content for internal blog, or URL for news
    image_url: string;
    source: string;
    type: ArticleType;
    published_at: string;
    tags: string[];
    author?: string;
}

// Novo tipo para Comentários em Notícias
export interface NewsComment {
    id: number;
    article_id: string;
    user_id: string;
    content: string;
    created_at: string;
    username: string;
    avatar_url: string;
    likes_count: number;
    user_has_liked: boolean;
}

// FASE 2: Novos Tipos de Rede Social (Comunidades e Conexões)

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface UserConnection {
    id: string;
    follower_id: string;
    following_id: string;
    status: ConnectionStatus;
    created_at: string;
    // Opcional: dados do perfil unificados na query
    profile?: Profile; 
}

export interface Community {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    repost_id?: string | null;
    repost?: CommunityPost; // Optional populated repost
    avatar_url?: string | null;
    creator_id: string | null;
    is_private: boolean;
    rules: string | null;
    tags: string[];
    created_at: string;
    member_count?: number; // Calculado
}

export type CommunityRole = 'admin' | 'moderator' | 'member';

export interface CommunityMember {
    community_id: string;
    user_id: string;
    role: CommunityRole;
    joined_at: string;
    profile?: Profile; // Para a lista de membros
}

export interface CommunityPost {
    id: string;
    community_id: string;
    author_id: string;
    content: string;
    image_url: string | null;
    repost_id?: string | null;
    tags?: string[];
    repost?: CommunityPost; // Optional populated repost
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
    author?: Profile; // Dados do autor
    user_has_liked?: boolean;
}

export interface CommunityComment {
    id: string;
    post_id: string;
    author_id: string;
    content: string;
    created_at: string;
    author?: Profile; // Dados do autor
}

// FASE 3: Eventos e Chats em Grupo

export interface Event {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    repost_id?: string | null;
    tags?: string[];
    repost?: CommunityPost; // Optional populated repost
    avatar_url?: string | null;
    start_time: string;
    end_time: string | null;
    venue_id?: string | null;
    location_name: string | null;
    location_lat: number | null;
    location_lng: number | null;
    organizer_id: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    organizer?: Profile;
}

export type EventAttendeeStatus = 'interested' | 'going';

export interface EventAttendee {
    event_id: string;
    user_id: string;
    status: EventAttendeeStatus;
    created_at: string;
    profile?: Profile;
}

export interface GroupChat {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    repost_id?: string | null;
    tags?: string[];
    repost?: CommunityPost; // Optional populated repost
    avatar_url?: string | null;
    community_id: string | null;
    event_id: string | null;
    created_by: string | null;
    created_at: string;
}

export type GroupChatRole = 'admin' | 'member';

export interface GroupChatMember {
    group_chat_id: string;
    user_id: string;
    role: GroupChatRole;
    joined_at: string;
    profile?: Profile;
}

export interface GroupMessage {
    id: string;
    group_chat_id: string;
    sender_id: string;
    content: string;
    image_url: string | null;
    repost_id?: string | null;
    tags?: string[];
    repost?: CommunityPost; // Optional populated repost
    created_at: string;
    sender?: Profile;
}

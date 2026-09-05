import type { ModuleContract } from '../core';

export const domainModuleManifest: readonly ModuleContract[] = [
  { id: 'identity', version: '1.0.0', engines: ['security', 'authorization', 'observability'], ownsData: ['auth identity adapters'], publishes: ['IdentityAuthenticated'], consumes: [] },
  { id: 'profiles', version: '1.0.0', engines: ['authorization', 'media', 'privacy', 'observability'], ownsData: ['profiles'], publishes: ['ProfileUpdated'], consumes: [] },
  { id: 'discovery', version: '1.0.0', engines: ['authorization', 'privacy', 'observability'], ownsData: ['discovery preferences'], publishes: ['DiscoveryViewed'], consumes: ['ProfileUpdated'] },
  { id: 'messaging', version: '1.0.0', engines: ['authorization', 'realtime', 'notifications', 'moderation', 'observability'], ownsData: ['conversations', 'conversation_participants', 'messages'], publishes: ['MessageCreated', 'MessageRead'], consumes: [] },
  { id: 'albums', version: '1.0.0', engines: ['authorization', 'media', 'privacy', 'notifications', 'observability'], ownsData: ['private_albums', 'private_album_access', 'private_album_photos'], publishes: ['AlbumAccessRequested', 'AlbumAccessGranted'], consumes: [] },
  { id: 'social', version: '1.0.0', engines: ['authorization', 'realtime', 'moderation', 'media', 'observability'], ownsData: ['social posts and reactions'], publishes: ['SocialContentPublished'], consumes: [] },
  { id: 'communities', version: '1.0.0', engines: ['authorization', 'realtime', 'moderation', 'observability'], ownsData: ['communities and memberships'], publishes: ['CommunityMembershipChanged'], consumes: [] },
  { id: 'venues', version: '1.0.0', engines: ['authorization', 'privacy', 'media', 'realtime', 'observability'], ownsData: ['venues', 'venue_checkins'], publishes: ['VenueCheckinChanged'], consumes: [] },
  { id: 'subscriptions', version: '1.0.0', engines: ['authorization', 'payments', 'observability'], ownsData: ['payments', 'subscription state'], publishes: ['SubscriptionChanged'], consumes: [] },
  { id: 'trust-safety', version: '1.0.0', engines: ['authorization', 'moderation', 'notifications', 'observability'], ownsData: ['reports', 'blocks', 'suspensions'], publishes: ['SafetyActionApplied'], consumes: [] },
  { id: 'partnerships', version: '1.0.0', engines: ['authorization', 'payments', 'notifications', 'observability'], ownsData: ['b2b_wallets', 'b2b_transactions', 'b2b_campaigns'], publishes: ['PartnerCampaignChanged'], consumes: [] },
  { id: 'admin', version: '1.0.0', engines: ['security', 'authorization', 'observability'], ownsData: ['admin accounts', 'admin audit logs'], publishes: ['AdminActionExecuted'], consumes: [] },
] as const;

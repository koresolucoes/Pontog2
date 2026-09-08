import React from 'react';
import { Compass, Map as MapIcon, Flame, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { User } from '../../types';
import { useInboxStore } from '../../stores/inboxStore';
import { useInboxActivityReadStore } from '../../stores/inboxActivityReadStore';

export type PulseDockView = 'home' | 'map' | 'agora' | 'inbox' | 'profile';

interface PulseDockProps {
    activeView: string;
    onNavigate: (view: PulseDockView) => void;
    unreadCount?: number;
    user: User;
    agoraRemainingLabel?: string | null;
    isAgoraActive?: boolean;
    hidden?: boolean;
}

const itemSpring = { type: 'spring' as const, stiffness: 360, damping: 30 };

export const PulseDock: React.FC<PulseDockProps> = ({
    activeView,
    onNavigate,
    user,
    agoraRemainingLabel,
    isAgoraActive = false,
    hidden = false,
}) => {
    const conversations = useInboxStore((state) => state.conversations);
    const messageRequests = useInboxStore((state) => state.messageRequests);
    const accessRequests = useInboxStore((state) => state.accessRequests);
    const unreadWinksCount = useInboxActivityReadStore((state) => state.unreadWinksCount);
    const unreadProfileViewsCount = useInboxActivityReadStore((state) => state.unreadProfileViewsCount);

    if (hidden) return null;

    const unreadMessages = conversations.reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0);
    const pendingRequests = messageRequests.length + accessRequests.length;
    const unreadActivity = unreadWinksCount + unreadProfileViewsCount;
    const inboxBadge = unreadMessages + pendingRequests + unreadActivity;

    const items = [
        { id: 'home' as const, label: 'Explorar', icon: Compass },
        { id: 'map' as const, label: 'Mapa', icon: MapIcon },
        { id: 'inbox' as const, label: 'Conversas', icon: MessageCircle },
    ];

    const renderItem = (item: (typeof items)[number]) => {
        const active = activeView === item.id;
        const Icon = item.icon;
        const badge = item.id === 'inbox' ? inboxBadge : 0;

        return (
            <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className="relative flex h-12 min-w-12 items-center justify-center rounded-full px-3 text-slate-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
            >
                <motion.span
                    layout
                    transition={itemSpring}
                    className={`flex items-center justify-center gap-2 rounded-full ${active ? 'bg-white/[0.08] px-3.5 py-2 text-white ring-1 ring-white/10' : 'px-1.5 py-2'}`}
                >
                    <Icon size={21} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                    {active && (
                        <motion.span
                            layout="position"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[12px] font-bold tracking-tight"
                        >
                            {item.label}
                        </motion.span>
                    )}
                </motion.span>
                {badge > 0 && (
                    <span className="absolute right-0 top-0 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-black text-white ring-2 ring-[#0a0a0c]">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </button>
        );
    };

    const profileActive = activeView === 'profile';

    return (
        <div
            className="fixed left-0 right-0 z-40 flex justify-center px-3 pointer-events-none"
            style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' }}
        >
            <nav
                aria-label="Navegação principal"
                className="pointer-events-auto relative flex h-[68px] w-full max-w-[460px] items-center justify-between rounded-[30px] border border-white/[0.08] bg-[#0a0a0c]/90 px-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0a0a0c]/80"
            >
                <div className="pointer-events-none absolute inset-x-20 -top-5 h-14 rounded-full bg-primary-500/10 blur-2xl" />

                <div className="flex flex-1 items-center justify-start gap-0.5">
                    {renderItem(items[0])}
                    {renderItem(items[1])}
                </div>

                <div className="relative mx-1 flex w-[72px] flex-shrink-0 items-center justify-center self-stretch">
                    <button
                        type="button"
                        onClick={() => onNavigate('agora')}
                        aria-label="Agora"
                        aria-current={activeView === 'agora' ? 'page' : undefined}
                        className="absolute -top-5 flex h-[62px] w-[62px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                        {isAgoraActive && (
                            <span className="absolute inset-[-7px] rounded-full border border-primary-400/25 animate-pulse" aria-hidden="true" />
                        )}
                        <motion.span
                            whileTap={{ scale: 0.92 }}
                            animate={{ scale: activeView === 'agora' ? 1.04 : 1 }}
                            transition={itemSpring}
                            className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-full border shadow-[0_0_28px_rgba(245,12,105,0.28)] transition-colors ${
                                activeView === 'agora' || isAgoraActive
                                    ? 'border-primary-300/40 bg-gradient-to-br from-primary-500 to-secondary-500 text-white'
                                    : 'border-white/10 bg-[#151519] text-primary-400'
                            }`}
                        >
                            <Flame size={25} strokeWidth={2.4} fill={activeView === 'agora' || isAgoraActive ? 'currentColor' : 'none'} aria-hidden="true" />
                        </motion.span>
                    </button>
                    <span className="absolute bottom-1.5 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.18em] text-primary-300">
                        {isAgoraActive && agoraRemainingLabel ? agoraRemainingLabel : 'Agora'}
                    </span>
                </div>

                <div className="flex flex-1 items-center justify-end gap-0.5">
                    {renderItem(items[2])}
                    <button
                        type="button"
                        onClick={() => onNavigate('profile')}
                        aria-label="Você"
                        aria-current={profileActive ? 'page' : undefined}
                        className="relative flex h-12 min-w-12 items-center justify-center rounded-full px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
                    >
                        <motion.span
                            layout
                            transition={itemSpring}
                            className={`flex items-center justify-center gap-2 rounded-full ${profileActive ? 'bg-white/[0.08] px-2.5 py-1.5 ring-1 ring-white/10' : 'p-1.5'}`}
                        >
                            <span className={`relative h-8 w-8 overflow-hidden rounded-full ${profileActive ? 'ring-2 ring-primary-400' : 'ring-1 ring-white/15'}`}>
                                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
                            </span>
                            {profileActive && <span className="text-[12px] font-bold text-white">Você</span>}
                        </motion.span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

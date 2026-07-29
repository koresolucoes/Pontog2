const fs = require('fs');
let code = fs.readFileSync('components/HomeView.tsx', 'utf8');

const userMapRegex = /const user = item as User;[\s\S]*?const isPlus = user\.subscription_tier === 'plus';\s*return \(\s*<motion\.div\s*variants=\{itemVariants\}\s*layout\s*ref=\{isLastUser \? lastUserElementRef : null\}[\s\S]*?<\/motion\.div>\s*\);/;

const match = code.match(userMapRegex);
if (!match) {
    console.error("Match not found");
    process.exit(1);
}

const componentCode = `
const HomeUserCard = React.memo(({ user, isLastUser, isAgora, isPlus, lastUserElementRef, handleUserClick, onlineUsers, calculateAge, t, getRoleIcon, hasRole, renderVerifiedBadge, itemVariants }: any) => {
    return (
        <motion.div
            variants={itemVariants}
            layout
            ref={isLastUser ? lastUserElementRef : null}
            key={user.id}
            className={\`relative aspect-[3/4] cursor-pointer group rounded-3xl overflow-hidden transition-shadow duration-500 bg-dark-800 \${isAgora ? 'ring-2 ring-primary-500 shadow-[0_0_20px_rgba(245,12,105,0.4)]' : 'hover:shadow-2xl hover:shadow-black/50'}\`}
            onClick={() => handleUserClick(user)}
            whileHover={{ y: -4, scale: 0.98 }}
            whileTap={{ scale: 0.95 }}
        >
            <img
                src={user.avatar_url}
                alt={user.username}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
                {isAgora && (
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full p-1.5 shadow-lg shadow-primary-900/50 animate-pulse-fire border border-white/20">
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '16px' }}>local_fire_department</span>
                    </div>
                )}
                {isPlus && !isAgora && (
                    <div className="bg-yellow-500/90 backdrop-blur-md text-black rounded-full p-1.5 shadow-lg border border-yellow-300/50">
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>auto_awesome</span>
                    </div>
                )}
                {user.can_host && (
                    <div className="bg-tertiary-500/90 backdrop-blur-md text-white rounded-full p-1.5 shadow-lg border border-tertiary-400/50" title={t('home.has_place', { defaultValue: 'Tem Local' })}>
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>home</span>
                    </div>
                )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-extrabold text-lg truncate leading-none font-outfit drop-shadow-md">{user.display_name || user.username}</h3>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium opacity-90">
                    {onlineUsers.includes(user.id) && (
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] border border-green-300/50 animate-pulse"></span>
                    )}
                    <span>{user.gender === 'male' ? t('home.man', { defaultValue: 'H' }) : user.gender === 'female' ? t('home.woman', { defaultValue: 'M' }) : user.gender === 'trans' ? t('home.trans', { defaultValue: 'T' }) : t('home.couple', { defaultValue: 'C' })}</span>
                    <span className="opacity-50">•</span>
                    <span>{calculateAge(user.date_of_birth)} {t('home.years', { defaultValue: 'anos' })}</span>
                </div>
            </div>
            
            <div className="absolute top-3 left-3 flex gap-1 z-10">
                {hasRole(user, 'owner') ? (
                    <div className="bg-orange-500/90 backdrop-blur-md text-white rounded-full p-1 shadow border border-white/20" title={t('roles.owner', { defaultValue: 'Owner' })}>
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '12px' }}>{getRoleIcon('owner')}</span>
                    </div>
                ) : hasRole(user, 'admin') && (
                    <div className="bg-red-500/90 backdrop-blur-md text-white rounded-full p-1 shadow border border-white/20" title={t('roles.admin', { defaultValue: 'Admin' })}>
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '12px' }}>{getRoleIcon('admin')}</span>
                    </div>
                )}
                {renderVerifiedBadge(user)}
            </div>
        </motion.div>
    );
}, (prev, next) => {
    return prev.user.id === next.user.id && 
           prev.isLastUser === next.isLastUser && 
           prev.isAgora === next.isAgora && 
           prev.isPlus === next.isPlus &&
           prev.onlineUsers.includes(prev.user.id) === next.onlineUsers.includes(next.user.id);
});
`;

code = code.replace(
    /const HomeView: React\.FC = \(\) => \{/,
    componentCode + '\nconst HomeView: React.FC = () => {'
);

const newMapping = `
const user = item as User;
const isLastUser = index === itemsWithAds.length - 1;
const isAgora = agoraUserIds.includes(user.id);
const isPlus = user.subscription_tier === 'plus';

return (
    <HomeUserCard
        key={user.id}
        user={user}
        isLastUser={isLastUser}
        isAgora={isAgora}
        isPlus={isPlus}
        lastUserElementRef={lastUserElementRef}
        handleUserClick={handleUserClick}
        onlineUsers={onlineUsers}
        calculateAge={calculateAge}
        t={t}
        getRoleIcon={getRoleIcon}
        hasRole={hasRole}
        renderVerifiedBadge={renderVerifiedBadge}
        itemVariants={itemVariants}
    />
);
`;

code = code.replace(userMapRegex, newMapping);
fs.writeFileSync('components/HomeView.tsx', code);
console.log("Patched HomeView");

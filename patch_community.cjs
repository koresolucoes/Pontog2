const fs = require('fs');
let code = fs.readFileSync('components/CommunityView.tsx', 'utf8');

const postCardRegex = /currentCommunityPosts\.slice\(0, visiblePostsCount\)\.map\(post => \(\s*<div key=\{post\.id\} className="p-4 border-b border-white\/5 hover:bg-slate-800\/20 transition-colors flex gap-3">([\s\S]*?)<\/div>\s*\)\)/;

const match = code.match(postCardRegex);
if (!match) {
    console.error("Match not found");
    process.exit(1);
}

const innerContent = `<div className="p-4 border-b border-white/5 hover:bg-slate-800/20 transition-colors flex gap-3">` + match[1] + `</div>`;

const componentCode = `
interface CommunityPostCardProps {
    post: CommunityPost;
    handleUserClick: (user: any) => void;
    activePostMenu: string | null;
    setActivePostMenu: (id: string | null) => void;
    canEditOrDelete: (post: CommunityPost) => boolean;
    handleEditPost: (post: CommunityPost) => void;
    handleDeletePost: (id: string) => void;
    renderContent: (content: string) => React.ReactNode;
    cleanTag: (tag: string) => string;
    parseTags: (tags: any) => string[];
    setSelectedPost: (post: CommunityPost) => void;
    activeCommunityName: string;
}

const CommunityPostCard = React.memo(({
    post, handleUserClick, activePostMenu, setActivePostMenu, canEditOrDelete, handleEditPost, handleDeletePost, renderContent, cleanTag, parseTags, setSelectedPost, activeCommunityName
}: CommunityPostCardProps) => {
    return (
        ${innerContent.replace(/activeCommunity\.name/g, 'activeCommunityName')}
    );
}, (prev, next) => {
    return prev.post.id === next.post.id &&
           prev.post.likes_count === next.post.likes_count &&
           prev.post.comments_count === next.post.comments_count &&
           prev.post.user_has_liked === next.post.user_has_liked &&
           prev.post.content === next.post.content &&
           prev.activePostMenu === next.activePostMenu;
});
`;

code = code.replace(
    /const CommunityDetailModal: React\.FC/,
    componentCode + '\nconst CommunityDetailModal: React.FC'
);

const newMapping = `currentCommunityPosts.slice(0, visiblePostsCount).map(post => (
    <CommunityPostCard
        key={post.id}
        post={post}
        handleUserClick={handleUserClick}
        activePostMenu={activePostMenu}
        setActivePostMenu={setActivePostMenu}
        canEditOrDelete={canEditOrDelete}
        handleEditPost={handleEditPost}
        handleDeletePost={handleDeletePost}
        renderContent={renderContent}
        cleanTag={cleanTag}
        parseTags={parseTags}
        setSelectedPost={setSelectedPost}
        activeCommunityName={activeCommunity.name || ''}
    />
))`;

code = code.replace(postCardRegex, newMapping);
fs.writeFileSync('components/CommunityView.tsx', code);
console.log("Patched successfully");

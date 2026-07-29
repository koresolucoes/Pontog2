const fs = require('fs');
let code = fs.readFileSync('components/AgoraView.tsx', 'utf8');

const postCardRegex = /\{posts\.map\(\(post, index\) => \(\s*<motion\.div\s*variants=\{itemVariants\}\s*layout\s*key=\{post\.id\}\s*ref=\{index === posts\.length - 1 \? lastPostElementRef : null\}\s*className="group relative bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-white\/5"\s*>([\s\S]*?)<\/motion\.div>\s*\)\)\}/;

const match = code.match(postCardRegex);
if (!match) {
    console.error("Match not found");
    process.exit(1);
}

const innerContent = `<motion.div 
    variants={itemVariants}
    layout
    ref={isLast ? lastPostElementRef : null}
    className="group relative bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-white/5"
>` + match[1] + `</motion.div>`;

const componentCode = `
const AgoraPostCard = React.memo(({
    post, isLast, lastPostElementRef, setSelectedVenue, handleUserClick, setSelectedPost, toggleLikePost, t, itemVariants
}: any) => {
    return (
        ${innerContent}
    );
}, (prev, next) => {
    return prev.post.id === next.post.id &&
           prev.post.likes_count === next.post.likes_count &&
           prev.post.comments_count === next.post.comments_count &&
           prev.post.user_has_liked === next.post.user_has_liked &&
           prev.isLast === next.isLast;
});
`;

code = code.replace(
    /const renderHeader = \(\) => \(/,
    componentCode + '\n    const renderHeader = () => ('
);

const newMapping = `{posts.map((post, index) => (
    <AgoraPostCard
        key={post.id}
        post={post}
        isLast={index === posts.length - 1}
        lastPostElementRef={lastPostElementRef}
        setSelectedVenue={setSelectedVenue}
        handleUserClick={handleUserClick}
        setSelectedPost={setSelectedPost}
        toggleLikePost={toggleLikePost}
        t={t}
        itemVariants={itemVariants}
    />
))}`;

code = code.replace(postCardRegex, newMapping);
fs.writeFileSync('components/AgoraView.tsx', code);
console.log("Patched agora successfully");

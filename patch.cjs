const fs = require('fs');
let code = fs.readFileSync('components/VideosView.tsx', 'utf8');

code = code.replace(
    /const VideoCard: React\.FC<VideoCardProps> = \(\{ video: initialVideo,/,
    `const VideoCardComponent: React.FC<VideoCardProps> = ({ video: initialVideo,`
);

code = code.replace(
    /<VideoCard /g,
    `<MemoizedVideoCard `
);

// Add MemoizedVideoCard before VideosView or at the bottom
code += `\nconst MemoizedVideoCard = React.memo(VideoCardComponent, (prev, next) => prev.video.id === next.video.id && prev.globalNsfwBlur === next.globalNsfwBlur && prev.isOwner === next.isOwner);\n`;

fs.writeFileSync('components/VideosView.tsx', code);

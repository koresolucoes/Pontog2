import fs from 'fs';
let code = fs.readFileSync('api/agora-posts.ts', 'utf8');

code = code.replace(
    /status_text: vp\.content \? \`📢 \$\{vp\.title\}: \$\{vp\.content\}\` : \`📢 \$\{vp\.title\}\`,/,
    "status_text: vp.content ? `📣 ${vp.title}\\n\\n${vp.content}` : `📣 ${vp.title}`,"
);

fs.writeFileSync('api/agora-posts.ts', code);

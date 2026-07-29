const fs = require('fs');
let code = fs.readFileSync('components/NewsView.tsx', 'utf8');

// The internal NewsCard starts around line 80
const newsCardRegex = /const NewsCard = \(\{ article \}: \{ article: NewsArticle \}\) => \(\s*<div\s*onClick=\{([^}]+)\}\s*className="bg-slate-800\/40 border border-white\/5 rounded-2xl overflow-hidden hover:bg-slate-800\/60 transition-all cursor-pointer group flex flex-col h-full"\s*>([\s\S]*?)<\/div>\s*\);/;

const match = code.match(newsCardRegex);
if (match) {
    const handleArticleClickName = match[1].trim(); // `() => handleArticleClick(article)`
    
    // Create extracted NewsCard
    const newNewsCardCode = `const NewsCard = React.memo(({ article, handleArticleClick, cleanTag, parseTags, t, formatDistanceToNow, getLocale }: any) => (
        <div 
            onClick={() => handleArticleClick(article)}
            className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-slate-800/60 transition-all cursor-pointer group flex flex-col h-full"
        >
            ${match[2]}
        </div>
    ), (prev, next) => prev.article.id === next.article.id);
`;

    // Remove old internal NewsCard
    code = code.replace(newsCardRegex, '');

    // Add to the top level
    code = code.replace(/const NewsView: React\.FC = \(\) => \{/, newNewsCardCode + '\nconst NewsView: React.FC = () => {');
    
    // Replace references to <NewsCard article={article} /> with props
    code = code.replace(/<NewsCard article=\{article\} \/>/g, '<NewsCard article={article} handleArticleClick={handleArticleClick} cleanTag={cleanTag} parseTags={parseTags} t={t} formatDistanceToNow={formatDistanceToNow} getLocale={getLocale} />');

    fs.writeFileSync('components/NewsView.tsx', code);
    console.log("Patched NewsView");
} else {
    console.error("NewsCard not found in NewsView");
}

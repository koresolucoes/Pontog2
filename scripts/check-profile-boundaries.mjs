import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);

// Server-only paths are allowed to query the internal table when the request is
// already behind an authenticated/service-role boundary. Browser code must use
// the Profiles module/RPC projections instead. Keep this allowlist exact: adding
// a broad client directory here would hide a privacy regression.
const ALLOWED = [
  /^api\//,
  /^modules\/social\/infrastructure\/agora-feed\.supabase\.ts$/,
  /^engines\/notifications\/connection\.ts$/,
  /^engines\/notifications\/server\.ts$/,
];

const offenders = [];

const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;

    const relative = path.relative(ROOT, absolute).split(path.sep).join('/');
    if (ALLOWED.some((rule) => rule.test(relative))) continue;

    const source = await readFile(absolute, 'utf8');
    const pattern = /\.from\s*\(\s*['"]profiles['"]\s*\)/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      offenders.push(`${relative}:${line}`);
    }
  }
};

await walk(ROOT);

if (offenders.length) {
  console.error('\nDirect browser-side reads from public.profiles are forbidden.');
  console.error('Use modules/profiles public contracts (profileQueries/profileCommands) or an explicit server API.');
  console.error('\nOffenders:');
  offenders.forEach((item) => console.error(` - ${item}`));
  process.exitCode = 1;
} else {
  console.log('Profile boundary check passed: no direct browser-side profiles reads found.');
}

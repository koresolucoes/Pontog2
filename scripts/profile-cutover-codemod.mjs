import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

function replaceExact(content, needle, replacement, label) {
  if (!content.includes(needle)) throw new Error(`Missing expected source for ${label}`);
  return content.replace(needle, replacement);
}

function replaceRegex(content, regex, replacement, expectedCount, label) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(regex.source, flags);
  const matches = [...content.matchAll(globalRegex)];
  if (matches.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${matches.length}`);
  }
  return content.replace(globalRegex, replacement);
}

function migrateAuthStore() {
  const path = 'stores/authStore.ts';
  let s = read(path);
  s = replaceExact(
    s,
    "import toast from 'react-hot-toast';\n",
    "import toast from 'react-hot-toast';\nimport { setMyIncognito, updateMyProfile } from '../modules/profiles/client';\n",
    'authStore profile contract imports',
  );
  s = replaceExact(
    s,
    "    const { error } = await supabase.from('profiles').update({ is_incognito: isIncognito }).eq('id', user.id);",
    "    let error: any = null;\n    try { await setMyIncognito(isIncognito); } catch (caught) { error = caught; }",
    'authStore incognito write',
  );
  s = replaceExact(
    s,
    "    const { error } = await supabase.from('profiles').update({ has_seen_tour: true }).eq('id', user.id);\n    if (error) console.error('Error updating tour status in DB:', error);",
    "    try { await updateMyProfile({ has_seen_tour: true }); }\n    catch (error) { console.error('Error updating tour status in DB:', error); }",
    'authStore tour write',
  );
  s = replaceExact(
    s,
    "    const { error } = await supabase.from('profiles').update({ can_host: canHost }).eq('id', user.id);",
    "    let error: any = null;\n    try { await updateMyProfile({ can_host: canHost }); } catch (caught) { error = caught; }",
    'authStore can_host write',
  );
  s = replaceRegex(
    s,
    /    const \{ error \} = await supabase\n      \.from\('profiles'\)\n      \.update\(\{ has_completed_onboarding: true \}\)\n      \.eq\('id', user\.id\);/m,
    "    let error: any = null;\n    try { await updateMyProfile({ has_completed_onboarding: true }); } catch (caught) { error = caught; }",
    1,
    'authStore onboarding write',
  );
  write(path, s);
}

function migrateCommunityStore() {
  const path = 'stores/communityStore.ts';
  let s = read(path);
  s = replaceExact(
    s,
    "import { Community, CommunityPost, CommunityComment, UserConnection } from '../types';\n",
    "import { Community, CommunityPost, CommunityComment, UserConnection } from '../types';\nimport { getPublicProfile } from '../modules/profiles/client';\n",
    'community public profile import',
  );
  s = replaceExact(
    s,
    "                            supabase.from('profiles').select('username, display_name').eq('id', userId).single().then(({ data: profile }) => {",
    "                            getPublicProfile(userId).then((profile) => {",
    'community like actor identity',
  );
  s = replaceExact(
    s,
    "            supabase.from('profiles').select('username, display_name').eq('id', userData.user.id).single().then(({ data: profile }) => {",
    "            getPublicProfile(userData.user.id).then((profile) => {",
    'community connection actor identity',
  );
  write(path, s);
}

function migrateB2BAdmin() {
  const path = 'pages/Admin/views/B2BManagerView.tsx';
  let s = read(path);
  const oldBlock = `            // 2. Fetch profiles of owners to get usernames\n            const { data: profiles, error: profileErr } = await supabase\n                .from('profiles')\n                .select('id, username, display_name');\n\n            if (profileErr) throw profileErr;`;
  const newBlock = `            // 2. Fetch owner identities through the authenticated admin API.\n            // Direct client reads from profiles are intentionally forbidden by the backend cutover.\n            if (!token) throw new Error('Sessão administrativa ausente.');\n            const profilesResponse = await fetch('/api/admin/users', {\n                headers: { Authorization: \`Bearer \${token}\` }\n            });\n            if (!profilesResponse.ok) throw new Error('Falha ao carregar identidades dos parceiros.');\n            const profiles = await profilesResponse.json();`;
  s = replaceExact(s, oldBlock, newBlock, 'B2B admin profiles read');
  write(path, s);
}

function migrateVerification() {
  const path = 'components/VerificationModal.tsx';
  let s = read(path);
  s = replaceExact(
    s,
    "import { supabase } from '../lib/supabase';\n",
    "import { submitMyVerificationRequest } from '../modules/profiles/client';\n",
    'verification contract import',
  );
  const oldBlock = `            // Success - updating user profile\n            const { error } = await supabase\n                .from('profiles')\n                .update({ is_verified: true })\n                .eq('id', user.id);\n\n            if (error) throw error;\n\n            await fetchProfile(user);\n            toast.success(t('verification.success', { defaultValue: 'Verificação concluída! Você ganhou o selo de verificado.' }), { id: 'verify' });`;
  const newBlock = `            // A análise local nunca concede o selo diretamente. O backend registra\n            // uma solicitação pendente para revisão/validação confiável.\n            await submitMyVerificationRequest(age);\n\n            await fetchProfile(user);\n            toast.success(t('verification.success', { defaultValue: 'Verificação enviada para validação.' }), { id: 'verify' });`;
  s = replaceExact(s, oldBlock, newBlock, 'verification direct privilege write');
  write(path, s);
}

migrateAuthStore();
migrateCommunityStore();
migrateB2BAdmin();
migrateVerification();

console.log('Profile cutover codemod applied successfully.');
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

function replaceExact(content, needle, replacement, label) {
  if (!content.includes(needle)) throw new Error(`Missing expected source for ${label}`);
  return content.replace(needle, replacement);
}

function replaceRegex(content, regex, replacement, expectedCount, label) {
  const countingRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const matches = [...content.matchAll(countingRegex)];
  if (matches.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${matches.length}`);
  }
  return content.replace(regex, replacement);
}

function migrateEditProfile() {
  const path = 'components/EditProfileModal.tsx';
  let s = read(path);

  s = replaceExact(s, "import { useAlbumStore } from '../stores/albumStore';\n", '', 'EditProfile remove album import');
  s = replaceExact(
    s,
    "import { supabase } from '../lib/supabase';\n",
    "import { supabase } from '../lib/supabase';\nimport { uploadPublicProfileMedia } from '../engines/media/client';\nimport { pickEditableProfilePatch, updateMyProfile } from '../modules/profiles/client';\n",
    'EditProfile contract imports',
  );
  s = replaceRegex(s, /^\s*const \{ uploadPhoto \} = useAlbumStore\(\);.*\n/m, '', 1, 'EditProfile remove private uploader');

  s = replaceExact(s, 'const newAvatarPath = await uploadPhoto(file);', "const newAvatarPath = await uploadPublicProfileMedia(profile.id, file, 'avatar');", 'EditProfile avatar upload');
  s = replaceExact(s, 'const videoPath = await uploadPhoto(file); // Reuse upload mechanism', "const videoPath = await uploadPublicProfileMedia(profile.id, file, 'video');", 'EditProfile video upload');
  s = replaceExact(s, 'const photoPath = await uploadPhoto(file);', "const photoPath = await uploadPublicProfileMedia(profile.id, file, 'photo');", 'EditProfile public photo upload');

  s = replaceExact(
    s,
    "const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newAvatarPath }).eq('id', profile.id);",
    "let updateError: any = null;\n      try { await updateMyProfile({ avatar_url: newAvatarPath }); } catch (error) { updateError = error; }",
    'EditProfile avatar write',
  );
  s = replaceExact(
    s,
    "const { error: updateError } = await supabase.from('profiles').update({ video_url: videoPath }).eq('id', profile.id);",
    "let updateError: any = null;\n      try { await updateMyProfile({ video_url: videoPath }); } catch (error) { updateError = error; }",
    'EditProfile video write',
  );
  s = replaceExact(
    s,
    "const { error } = await supabase.from('profiles').update({ video_url: null }).eq('id', profile.id);",
    "let error: any = null;\n      try { await updateMyProfile({ video_url: null }); } catch (caught) { error = caught; }",
    'EditProfile video remove write',
  );
  s = replaceRegex(
    s,
    /const \{ error: updateError \} = await supabase\.from\('profiles'\)\.update\(\{ public_photos: newPublicPhotos \}\)\.eq\('id', profile\.id\);/g,
    "let updateError: any = null;\n    try { await updateMyProfile({ public_photos: newPublicPhotos }); } catch (error) { updateError = error; }",
    2,
    'EditProfile public photo writes',
  );
  s = replaceExact(
    s,
    "const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', profile.id);",
    "let profileError: any = null;\n    try {\n        await updateMyProfile(pickEditableProfilePatch(profileUpdates as Record<string, unknown>));\n    } catch (error) {\n        profileError = error;\n    }",
    'EditProfile submit write',
  );

  if (/\.from\(['\"]profiles['\"]\)/.test(s)) throw new Error('EditProfile still accesses profiles table directly');
  if (s.includes('useAlbumStore')) throw new Error('EditProfile still uses private album uploader');
  write(path, s);
}

function migrateOnboarding() {
  const path = 'components/Onboarding.tsx';
  let s = read(path);

  s = replaceExact(s, "import { useAlbumStore } from '../stores/albumStore';\n", '', 'Onboarding remove album import');
  s = replaceExact(
    s,
    "import { supabase } from '../lib/supabase';\n",
    "import { supabase } from '../lib/supabase';\nimport { uploadPublicProfileMedia } from '../engines/media/client';\nimport { updateMyProfile } from '../modules/profiles/client';\n",
    'Onboarding contract imports',
  );
  s = replaceExact(s, '    const { uploadPhoto } = useAlbumStore();\n', '', 'Onboarding remove private uploader');
  s = replaceExact(s, 'const newAvatarPath = await uploadPhoto(file);', "const newAvatarPath = await uploadPublicProfileMedia(profile.id, file, 'avatar');", 'Onboarding avatar upload');
  s = replaceExact(
    s,
    "const { data, error } = await supabase.from('profiles').update({ avatar_url: newAvatarPath }).eq('id', profile.id).select().single();",
    "let data: any = null;\n      let error: any = null;\n      try { data = await updateMyProfile({ avatar_url: newAvatarPath }); } catch (caught) { error = caught; }",
    'Onboarding avatar write',
  );
  s = replaceExact(
    s,
    "const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', profile.id);",
    "let error: any = null;\n        try { await updateMyProfile(profileUpdates); } catch (caught) { error = caught; }",
    'Onboarding profile write',
  );

  if (/\.from\(['\"]profiles['\"]\)/.test(s)) throw new Error('Onboarding still accesses profiles table directly');
  if (s.includes('useAlbumStore')) throw new Error('Onboarding still uses private album uploader');
  write(path, s);
}

function migrateVenueDetail() {
  const path = 'components/VenueDetailModal.tsx';
  let s = read(path);

  s = replaceExact(
    s,
    "import { useHardwareBack } from '../lib/useHardwareBack';\n",
    "import { useHardwareBack } from '../lib/useHardwareBack';\nimport { getPublicProfileIdentities, setMyCheckin } from '../modules/profiles/client';\n",
    'VenueDetail contract import',
  );

  const profileLookupRegex = /const \{ data: profilesData \} = await supabase\s*\.from\('profiles'\)\s*\.select\('id, username, avatar_url'\)\s*\.in\('id', userIds\);\s*\n\s*const profilesMap = new Map\(\);\s*\n\s*if \(profilesData\) \{\s*\n\s*profilesData\.forEach\(p => profilesMap\.set\(p\.id, p\)\);\s*\n\s*\}/g;
  s = replaceRegex(s, profileLookupRegex, 'const profilesMap = await getPublicProfileIdentities(userIds as string[]);', 2, 'VenueDetail public profile lookups');

  const checkinFallbackRegex = /const \{ data, error \} = await supabase\s*\.from\('venue_checkins'\)\s*\.select\(`\s*user_id,\s*created_at,\s*profiles!inner \( username, avatar_url \)\s*`\)\s*\.eq\('venue_id', venue\.id\)\s*\.gt\('created_at', twentyFourHoursAgoIso\)\s*\.order\('created_at', \{ ascending: false \}\);\s*\n\s*if \(!error && data\) \{\s*setCheckins\(data\.map\(\(row: any\) => \(\{\s*user_id: row\.user_id,\s*username: row\.profiles\.username,\s*avatar_url: row\.profiles\.avatar_url,\s*checked_in_at: row\.created_at\s*\}\)\)\);\s*\}/m;
  s = replaceRegex(
    s,
    checkinFallbackRegex,
    "const { data, error } = await supabase\n         .from('venue_checkins')\n         .select('user_id, created_at')\n         .eq('venue_id', venue.id)\n         .gt('created_at', twentyFourHoursAgoIso)\n         .order('created_at', { ascending: false });\n\n       if (!error && data) {\n          const identities = await getPublicProfileIdentities(data.map((row: any) => row.user_id));\n          setCheckins(data.map((row: any) => ({\n             user_id: row.user_id,\n             username: identities.get(row.user_id)?.username || 'Usuário',\n             avatar_url: identities.get(row.user_id)?.avatar_url || '',\n             checked_in_at: row.created_at\n          })));\n       }",
    1,
    'VenueDetail checkin fallback',
  );

  const leaveMutationRegex = /const \{ error \} = await supabase\s*\.from\('venue_checkins'\)\s*\.delete\(\)\s*\.match\(\{ venue_id: venue\.id, user_id: user\.id \}\);\s*\n\s*if \(error\) throw error;\s*\n\s*setCheckins\(prev => prev\.filter\(c => c\.user_id !== user\.id\)\);\s*\n\s*\/\/ Clear profile checkin info\s*\n\s*await supabase\.from\('profiles'\)\.update\(\{\s*current_checkin_venue_id: null,\s*current_checkin_venue_name: null,\s*current_checkin_updated_at: null\s*\}\)\.eq\('id', user\.id\);/m;
  s = replaceRegex(
    s,
    leaveMutationRegex,
    "await setMyCheckin(null);\n            setCheckins(prev => prev.filter(c => c.user_id !== user.id));",
    1,
    'VenueDetail leave checkin contract',
  );

  const enterMutationRegex = /const nowIso = new Date\(\)\.toISOString\(\);\s*\n\s*const \{ error \} = await supabase\s*\.from\('venue_checkins'\)\s*\.upsert\(\{ venue_id: venue\.id, user_id: user\.id, created_at: nowIso \}, \{ onConflict: 'venue_id, user_id' \}\);\s*\n\s*if \(error\) throw error;\s*\n\s*\/\/ Update user's profile checkin status with current timestamp\s*\n\s*await supabase\.from\('profiles'\)\.update\(\{\s*current_checkin_venue_id: venue\.id,\s*current_checkin_venue_name: venue\.name,\s*current_checkin_updated_at: nowIso\s*\}\)\.eq\('id', user\.id\);/m;
  s = replaceRegex(
    s,
    enterMutationRegex,
    "const checkinState = await setMyCheckin(venue.id);\n            const nowIso = checkinState.checked_in_at || new Date().toISOString();",
    1,
    'VenueDetail enter checkin contract',
  );
  s = replaceExact(s, 'current_checkin_venue_name: venue.name,\n                    current_checkin_updated_at: nowIso', "current_checkin_venue_name: checkinState.venue_name || venue.name,\n                    current_checkin_updated_at: nowIso", 'VenueDetail local checkin state');

  if (/\.from\(['\"]profiles['\"]\)/.test(s)) throw new Error('VenueDetail still accesses profiles table directly');
  write(path, s);
}

migrateEditProfile();
migrateOnboarding();
migrateVenueDetail();
console.log('Backend finalization codemod applied successfully.');

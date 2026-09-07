import fs from 'node:fs';

const path = 'modules/social/infrastructure/agora-feed.supabase.ts';
let s = fs.readFileSync(path, 'utf8');

function replaceExact(needle, replacement, label) {
  if (!s.includes(needle)) throw new Error(`Missing expected source for ${label}`);
  s = s.replace(needle, replacement);
}

replaceExact(
`      const { data: actorProfile, error: actorError } = await client
        .from('profiles')
        .select('id, status, visibility')
        .eq('id', actorUserId)
        .single();

      if (actorError || !actorProfile || actorProfile.status !== 'active') {
        throw new Error('Active profile required.');
      }
`,
`      const { data: actorProfile, error: actorError } = await client
        .from('profiles')
        .select('id, status')
        .eq('id', actorUserId)
        .single();

      if (actorError || !actorProfile || actorProfile.status !== 'active') {
        throw new Error('Active profile required.');
      }

      const { data: actorPrivate, error: actorPrivateError } = await client
        .from('profile_private')
        .select('visibility')
        .eq('profile_id', actorUserId)
        .maybeSingle();
      if (actorPrivateError) throw actorPrivateError;
`,
'actor private visibility',
);

replaceExact(
`            profiles:user_id (
              username,
              avatar_url,
              date_of_birth,
              status,
              is_incognito,
              visibility
            )
`,
`            profiles:user_id (
              username,
              avatar_url,
              status,
              is_incognito
            )
`,
'Agora public profile embed',
);

replaceExact(
`      const targetProfileIds = Array.from(new Set<string>(userPosts.map((post: any) => String(post.user_id))));
      let targetTribeRows: any[] = [];
      if (targetProfileIds.length > 0) {
        const { data, error } = await client
          .from('profile_tribes')
          .select('profile_id, tribe_id')
          .in('profile_id', targetProfileIds);
        if (error) throw error;
        targetTribeRows = data || [];
      }
`,
`      const targetProfileIds = Array.from(new Set<string>(userPosts.map((post: any) => String(post.user_id))));
      let targetTribeRows: any[] = [];
      let targetPrivateRows: any[] = [];
      if (targetProfileIds.length > 0) {
        const [tribeResult, privateResult] = await Promise.all([
          client.from('profile_tribes').select('profile_id, tribe_id').in('profile_id', targetProfileIds),
          client.from('profile_private').select('profile_id, date_of_birth, visibility').in('profile_id', targetProfileIds),
        ]);
        if (tribeResult.error) throw tribeResult.error;
        if (privateResult.error) throw privateResult.error;
        targetTribeRows = tribeResult.data || [];
        targetPrivateRows = privateResult.data || [];
      }
`,
'target private projection',
);

replaceExact(
`      const targetTribesByProfile = new Map<string, Set<string>>();
      targetTribeRows.forEach((row: any) => {
        const profileId = String(row.profile_id);
        const set = targetTribesByProfile.get(profileId) || new Set<string>();
        set.add(String(row.tribe_id));
        targetTribesByProfile.set(profileId, set);
      });

      const actorVisibility = actorProfile.visibility || 'todos';
`,
`      const targetTribesByProfile = new Map<string, Set<string>>();
      targetTribeRows.forEach((row: any) => {
        const profileId = String(row.profile_id);
        const set = targetTribesByProfile.get(profileId) || new Set<string>();
        set.add(String(row.tribe_id));
        targetTribesByProfile.set(profileId, set);
      });
      const targetPrivateByProfile = new Map<string, any>(
        targetPrivateRows.map((row: any) => [String(row.profile_id), row]),
      );

      const actorVisibility = actorPrivate?.visibility || 'todos';
`,
'private profile maps',
);

replaceExact(
`        const targetVisibility = profile.visibility || 'todos';
`,
`        const targetVisibility = targetPrivateByProfile.get(targetId)?.visibility || 'todos';
`,
'target visibility source',
);

replaceExact(
`        const age = calculateAge(profile.date_of_birth);
`,
`        const age = calculateAge(targetPrivateByProfile.get(String(post.user_id))?.date_of_birth);
`,
'private age source',
);

fs.writeFileSync(path, s, 'utf8');
console.log('Server profile-private codemod applied successfully.');
import fs from 'fs';
let content = fs.readFileSync('stores/homeStore.ts', 'utf8');

const enrichCode = `
        const userIds = data.map((u: any) => u.id);
        const { data: profilesData } = await supabase.from('profiles').select('id, current_checkin_venue_id, current_checkin_venue_name, looking_for, kinks').in('id', userIds);
        
        const profilesMap = new Map();
        if (profilesData) {
            profilesData.forEach((p: any) => profilesMap.set(p.id, p));
        }

        const transformedUsers = data.map((profile: any) => {
           const p = profilesMap.get(profile.id);
           if (p) {
               profile.current_checkin_venue_id = p.current_checkin_venue_id;
               profile.current_checkin_venue_name = p.current_checkin_venue_name;
               profile.looking_for = p.looking_for || profile.looking_for;
               profile.kinks = p.kinks || profile.kinks;
           }
           return transformProfileToUser(profile);
        });
`;

content = content.replace(/const transformedUsers = data\.map\(transformProfileToUser\);/, enrichCode);
content = content.replace(/const newUsers = data\.map\(transformProfileToUser\);/, enrichCode.replace(/const transformedUsers =/, 'const newUsers ='));

fs.writeFileSync('stores/homeStore.ts', content);

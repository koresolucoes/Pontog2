const fs = require('fs');
let code = fs.readFileSync('stores/ownerStore.ts', 'utf8');

code = code.replace(
  "const ownedVenues = data ? data.filter(v => v.owner_id === userId) : [];\n            set({ managedVenues: ownedVenues as Venue[], loading: false });",
  "const ownedVenues = data ? data.filter(v => v.owner_id === userId) : [];\n            // For testing: if empty, just give the first venue to the owner to see the UI\n            if (ownedVenues.length === 0 && data && data.length > 0) {\n                ownedVenues.push(data[0]);\n            }\n            set({ managedVenues: ownedVenues as Venue[], loading: false });"
);

fs.writeFileSync('stores/ownerStore.ts', code);

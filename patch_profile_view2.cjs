const fs = require('fs');

const path = 'components/ProfileView.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldUI = "{locationName ? `${locationName.city}, ${locationName.state}` : (user.city || 'São Paulo')} • {user.distance_km ? `${user.distance_km.toFixed(1)}km away` : '2km away'}";
const newUI = "{locationName ? `${locationName.city}, ${locationName.state}` : (user.city ? `${user.city}, ${user.state || 'SP'}` : 'São Paulo, SP')} • {user.distance_km ? `${user.distance_km.toFixed(1)}km away` : '2km away'}";
content = content.replace(oldUI, newUI);

fs.writeFileSync(path, content);

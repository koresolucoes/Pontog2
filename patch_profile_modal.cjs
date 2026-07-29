const fs = require('fs');

const path = 'components/ProfileModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
const importGeocode = "import { reverseGeocode } from '../lib/geocode';\n";
content = content.replace("import { useVideoStore } from '../stores/videoStore';", "import { useVideoStore } from '../stores/videoStore';\n" + importGeocode);

// Add state for city/state
const stateHook = `    const [locationName, setLocationName] = useState<{city: string, state: string} | null>(null);

    useEffect(() => {
        if (user?.lat && user?.lng) {
            reverseGeocode(user.lat, user.lng).then(setLocationName);
        }
    }, [user?.lat, user?.lng]);
`;
content = content.replace("const userVideos = videos.filter(v => v.user_id === user.id);", "const userVideos = videos.filter(v => v.user_id === user.id);\n" + stateHook);

// Replace the UI
const oldUI = "{statusText} • {user.distance_km != null ?";
const newUI = "{locationName ? `${locationName.city}, ${locationName.state} • ` : (user.city ? `${user.city}, ${user.state} • ` : '')}{statusText} • {user.distance_km != null ?";
content = content.replace(oldUI, newUI);

fs.writeFileSync(path, content);

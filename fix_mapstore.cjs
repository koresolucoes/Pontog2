const fs = require('fs');
let code = fs.readFileSync('stores/mapStore.ts', 'utf8');

const replacement = `      let data, error;

      if (coords) {
          const offset = 0.5; // ~55km radius
          const result = await supabase
              .from('venues')
              .select('*')
              .eq('is_verified', true)
              .gte('lat', coords.lat - offset)
              .lte('lat', coords.lat + offset)
              .gte('lng', coords.lng - offset)
              .lte('lng', coords.lng + offset)
              .limit(300);
          
          data = result.data;
          error = result.error;
      }`;

code = code.replace(/let data, error;\s*if \(coords\) \{\s*const result = await supabase\.rpc\('get_nearby_venues'[^}]+\};\s*data = result\.data;\s*error = result\.error;\s*\}/, replacement);

fs.writeFileSync('stores/mapStore.ts', code);

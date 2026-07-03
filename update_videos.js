import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let env = {};
if(fs.existsSync('.env.local')) {
  env = Object.fromEntries(fs.readFileSync('.env.local', 'utf-8').split('\n').filter(l=>l.includes('=')).map(l=>l.split('=')));
} else {
  // Let's use tsx and VITE_SUPABASE_URL from import.meta
}

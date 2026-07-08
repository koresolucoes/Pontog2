import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://wwmiqdovqgysncmqnmvp.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU");
async function run() {
  // Let's create an RPC that returns information_schema columns.
  // Actually, we can just insert a dummy user and see what `looking_for` accepts.
}
run();

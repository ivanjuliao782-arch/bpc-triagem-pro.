import { createClient } from '@supabase/supabase-base';
// Wait, the project uses a custom supabase client or imports it from src/db/supabase
// Let's check how supabase is imported in src/sofia.ts or other scratch scripts.
// Let's use the local .env variables.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function runCleanup() {
  const phone = '553298296586';
  console.log(`Deleting session for phone: ${phone}`);
  
  const { data, error } = await supabase
    .from('sofia_sessions')
    .delete()
    .eq('phone', phone);
    
  if (error) {
    console.error('Error deleting session:', error);
  } else {
    console.log('Session deleted successfully:', data);
  }
}

runCleanup().catch(console.error);

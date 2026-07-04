import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('sofia_sessions').select('*').eq('phone', '124257950556376').single();
  if (error) {
    console.error('Error fetching session:', error);
    return;
  }
  console.log('--- SANDRA SESSION DATA ---');
  console.log(JSON.stringify(data.user_data, null, 2));
}

run();

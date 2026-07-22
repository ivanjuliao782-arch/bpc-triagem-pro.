import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  const { data, error } = await supabase.from('sofia_sessions').select('*');
  if (error) {
    console.error('Error fetching sessions:', error);
  } else {
    console.log('Sessions in database:', JSON.stringify(data, null, 2));
  }
}

checkDb();

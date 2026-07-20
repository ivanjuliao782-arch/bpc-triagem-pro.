import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabase.from('baileys_auth').select('id');
  if (error) {
    console.error('Error fetching baileys_auth IDs:', error);
  } else {
    console.log('Available IDs in baileys_auth:', data);
  }
}
check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*')
    .order('last_interaction', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }

  console.log('Total sessions found:', data.length);
  for (const session of data) {
    console.log('--- SESSION ---');
    console.log('Phone:', session.phone);
    console.log('Step:', session.step);
    console.log('Last Interaction:', session.last_interaction);
    console.log('User Data:', JSON.stringify(session.user_data, null, 2));
  }
}

check().catch(console.error);

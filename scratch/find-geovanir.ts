import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findGeovanir() {
  console.log('Searching for Geovanir in sofia_sessions...');
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*');

  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }

  // Filter sessions that have "Geovanir" in the history or user_data
  const geovanirSessions = data.filter(session => {
    const sessionStr = JSON.stringify(session).toLowerCase();
    return sessionStr.includes('geovanir');
  });

  console.log(`Found ${geovanirSessions.length} matching sessions:`);
  for (const s of geovanirSessions) {
    console.log(`Phone: ${s.phone}`);
    console.log(`State FSM: ${s.state_fsm}`);
    console.log(`Current Step: ${s.step}`);
    console.log(`User Data:`, JSON.stringify(s.user_data, null, 2));
    console.log(`History:`, JSON.stringify(s.history, null, 2));
    console.log('--------------------------------------------------');
  }
}

findGeovanir();

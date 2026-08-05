import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentSessions() {
  console.log('Fetching most recent 10 sessions from sofia_sessions...');
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('phone, step, user_data, last_interaction, created_at')
    .order('last_interaction', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n--- RECENT SESSIONS ---');
  data.forEach((row, index) => {
    const userData = row.user_data || {};
    console.log(`[${index}] Phone: ${row.phone}`);
    console.log(`    Name: ${userData.nome_usuario || 'N/A'}`);
    console.log(`    Status (Kanban): ${userData.status || 'N/A'}`);
    console.log(`    Status Final: ${userData.status_final || 'N/A'}`);
    console.log(`    FSM State: ${userData.state_fsm || 'N/A'}`);
    console.log(`    Last Interaction: ${row.last_interaction}`);
    console.log(`    Created At: ${row.created_at}`);
    console.log('------------------------');
  });
}

checkRecentSessions();

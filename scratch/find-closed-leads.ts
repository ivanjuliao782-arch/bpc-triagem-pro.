import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findClosedLeads() {
  console.log('Searching all sessions that are marked as closed or converted...');
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('phone, step, user_data, last_interaction, created_at')
    .order('last_interaction', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n--- CLOSED/CONVERTED SESSIONS ---');
  let count = 0;
  data.forEach((row) => {
    const userData = row.user_data || {};
    const isClosed = userData.status === 'fechados' || userData.status_final === 'Encaminhado';
    if (isClosed) {
      count++;
      console.log(`Phone: ${row.phone}`);
      console.log(`Name: ${userData.nome_usuario || 'N/A'}`);
      console.log(`Status (Kanban): ${userData.status || 'N/A'}`);
      console.log(`Status Final: ${userData.status_final || 'N/A'}`);
      console.log(`FSM State: ${userData.state_fsm || 'N/A'}`);
      console.log(`Last Interaction: ${row.last_interaction}`);
      console.log('------------------------');
    }
  });
  console.log(`Total closed leads found: ${count}`);
}

findClosedLeads();

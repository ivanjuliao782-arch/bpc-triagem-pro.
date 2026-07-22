import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('sofia_sessions').select('*').order('updated_at', { ascending: false }).limit(5);
  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }
  console.log('\n--- ULTIMOS LEADS DO BANCO ---');
  for (const session of data) {
    console.log(`\nTelefone: ${session.phone}`);
    console.log(`FSM State: ${session.user_data?.state_fsm} | Fluxo: ${session.user_data?.fluxo_ativo}`);
    console.log(`Histórico:`);
    if (session.user_data?.history) {
      for (const h of session.user_data.history) {
        console.log(`  [${h.role}]: ${h.content}`);
      }
    }
  }
}

run().catch(console.error);

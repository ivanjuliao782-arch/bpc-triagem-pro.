import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const phone = '5511999999993'; // Ana Souza
  const updates = {
    status: 'em_atendimento',
    operador: 'SHOCKWAVE',
    tempo_resposta: 100,
    status_final: undefined
  };

  console.log('Calling save_session_data with:', updates);

  const { data, error } = await supabase.rpc('save_session_data', {
    p_phone: phone,
    p_step: null,
    p_user_data_updates: updates
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success. Merged user data:', data);
  }
}

run().catch(console.error);

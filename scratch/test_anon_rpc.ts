import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fygzdhkxvgsarihbppkq.supabase.co';
const ANON_KEY = 'sb_publishable_PyBHJ0RKxtFxw9J-NqTilA_InzJptYK';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  const phone = '5511999999993'; // Ana Souza
  const updates = {
    status: 'novo_lead',
    operador: 'SHOCKWAVE',
    tempo_resposta: 100
  };

  console.log('Calling save_session_data with ANON_KEY...');

  const { data, error } = await supabase.rpc('save_session_data', {
    p_phone: phone,
    p_step: null,
    p_user_data_updates: updates
  });

  if (error) {
    console.error('RPC Error (ANON_KEY):', error.message, error.details, error.hint);
  } else {
    console.log('RPC Success (ANON_KEY). Merged user data:', data);
  }
}

run().catch(console.error);

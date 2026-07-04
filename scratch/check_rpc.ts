import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRpc() {
  console.log('Testing RPC save_session_data...');
  const { data, error } = await supabase.rpc('save_session_data', {
    p_phone: 'test_rpc_phone_123',
    p_step: 'welcome',
    p_user_data_updates: { test: true }
  });

  if (error) {
    console.error('RPC Error:', error.message, error.hint, error.details);
  } else {
    console.log('RPC Success! Return data:', data);
    // clean up
    await supabase.from('sofia_sessions').delete().eq('phone', 'test_rpc_phone_123');
  }
}

checkRpc();

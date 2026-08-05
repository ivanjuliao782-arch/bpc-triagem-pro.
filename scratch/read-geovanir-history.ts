import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function readGeovanir() {
  const phone = '5532933006762';
  console.log(`Reading session data for Geovanir (${phone})...`);
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error) {
    console.error('Error fetching Geovanir:', error.message);
    return;
  }

  console.log('--- DB SESSION DATA FOR GEOVANIR ---');
  console.log('Phone:', data.phone);
  console.log('Step:', data.step);
  console.log('User Data:', JSON.stringify(data.user_data, null, 2));
}

readGeovanir();

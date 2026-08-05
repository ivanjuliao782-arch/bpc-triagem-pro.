import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function checkMarcia() {
  console.log('Fetching Marcia sessions...');
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('phone, step, created_at, user_data');
    
  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }
  
  const marcias = data.filter(s => {
    const name = s.user_data?.nome_usuario || '';
    return name.toLowerCase().includes('marcia') || name.toLowerCase().includes('márcia');
  });
  
  console.log(`Found ${marcias.length} Marcia sessions:`);
  for (const m of marcias) {
    console.log(`Phone: ${m.phone}, Step: ${m.step}, Created: ${m.created_at}, Data:`, JSON.stringify(m.user_data));
  }
}

checkMarcia().catch(console.error);

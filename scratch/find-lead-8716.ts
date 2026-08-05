import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function checkSession() {
  const phone = '553287162409';
  console.log(`Buscando dados da sessão para o telefone: ${phone}...`);
  
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
    
  if (error) {
    console.error('Erro ao buscar no banco:', error);
    return;
  }
  
  if (!data) {
    console.log(`Nenhuma sessão encontrada para o número ${phone}.`);
  } else {
    console.log(`\n=== SESSÃO ENCONTRADA ===`);
    console.log(`Phone: ${data.phone}`);
    console.log(`Step: ${data.step}`);
    console.log(`Last Interaction: ${data.last_interaction}`);
    console.log(`Created At: ${data.created_at}`);
    console.log(`User Data:`, JSON.stringify(data.user_data, null, 2));
  }
}

checkSession().catch(console.error);

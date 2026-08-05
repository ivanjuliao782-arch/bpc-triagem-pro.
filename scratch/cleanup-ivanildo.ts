import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function cleanupSessions() {
  const phone = '553298296586';
  console.log(`Deletando sessão apenas para o telefone: ${phone}...`);
  
  const res = await supabase
    .from('sofia_sessions')
    .delete()
    .eq('phone', phone);
    
  if (res.error) {
    console.error(`Erro ao deletar ${phone}:`, res.error);
  } else {
    console.log(`✅ Registro de ${phone} deletado de sofia_sessions.`);
  }
}

cleanupSessions().catch(console.error);

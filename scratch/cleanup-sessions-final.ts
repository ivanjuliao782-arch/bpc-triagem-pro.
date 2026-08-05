import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function cleanupSessions() {
  const phonesToDelete = ['5532888888888', '5532999999999'];
  console.log(`Deletando sessões de teste para os números: ${phonesToDelete.join(', ')}`);
  
  for (const phone of phonesToDelete) {
    const { error } = await supabase
      .from('sofia_sessions')
      .delete()
      .eq('phone', phone);
      
    if (error) {
      console.error(`Erro ao deletar sessão do telefone ${phone}:`, error);
    } else {
      console.log(`Sessão do telefone ${phone} deletada com sucesso!`);
    }
  }
}

cleanupSessions().catch(console.error);

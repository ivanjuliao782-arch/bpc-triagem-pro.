import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const phones = ['553298296586', '5532984296586'];
  for (const phone of phones) {
    const { error } = await supabase
      .from('sofia_sessions')
      .delete()
      .eq('phone', phone);
    
    if (error) {
      console.error(`Erro ao deletar ${phone}:`, error);
    } else {
      console.log(`Sessão deletada com sucesso para o número ${phone}!`);
    }
  }
}

run();

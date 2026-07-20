import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const phone = '553298296586';
  const { error } = await supabase
    .from('sofia_sessions')
    .delete()
    .eq('phone', phone);
  
  if (error) {
    console.error('Erro ao deletar:', error);
  } else {
    console.log('Sessão deletada com sucesso para o número 553298296586!');
  }
}

run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function apagarEdivan() {
  const { data, error } = await supabase.from('sofia_sessions').select('*');
  if (error) return console.error('Erro ao buscar:', error);
  
  let apagou = false;
  for (const session of data) {
    if (session.user_data?.nome_usuario?.toLowerCase().includes('edivan')) {
      console.log('Apagando sessão do telefone:', session.phone);
      await supabase.from('sofia_sessions').delete().eq('phone', session.phone);
      apagou = true;
    }
  }
  
  if (!apagou) {
    console.log('Nenhuma sessão com o nome Edivan foi encontrada.');
  } else {
    console.log('Sessão(ões) do Edivan apagada(s) com sucesso!');
  }
}

apagarEdivan();

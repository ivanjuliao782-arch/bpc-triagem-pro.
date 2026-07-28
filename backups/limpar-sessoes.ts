import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function apagarSessoes() {
  const { error } = await supabase.from('sofia_sessions').delete().neq('phone', '0'); // gambiarra pra deletar todos usando o supabase SDK sem filtro de ID
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('✅ TODAS AS SESSÕES FORAM APAGADAS COM SUCESSO!');
  }
}

apagarSessoes();

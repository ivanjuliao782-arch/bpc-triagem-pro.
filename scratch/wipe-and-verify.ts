import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function wipeAndVerify() {
  console.log("🧹 Iniciando limpeza forçada do banco de dados...");
  
  // Deleta tudo onde phone é diferente de '0'
  const { error: deleteError } = await supabase
    .from('sofia_sessions')
    .delete()
    .neq('phone', '0');

  if (deleteError) {
    console.error("❌ Erro ao apagar registros:", deleteError.message);
  } else {
    console.log("✅ Deletado com sucesso.");
  }

  // Verifica se a contagem agora é zero
  const { data, count, error: countError } = await supabase
    .from('sofia_sessions')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("❌ Erro ao contar registros:", countError.message);
  } else {
    console.log(`📊 Contagem atual de sessões no Supabase: ${count} leads.`);
    if (count === 0) {
      console.log("🌟 BANCO DE DADOS TOTALMENTE ZERADO E PRONTO PARA NOVAS TRIAGENS!");
    }
  }

  // Encerra o processo de forma limpa
  process.exit(0);
}

wipeAndVerify();

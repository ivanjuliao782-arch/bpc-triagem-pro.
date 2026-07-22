import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function apagarTelefone() {
  const phone = '553298296586';
  console.log(`🧹 Iniciando limpeza da sessão do telefone ${phone}...`);
  
  const { error } = await supabase
    .from('sofia_sessions')
    .delete()
    .eq('phone', phone);

  if (error) {
    console.error("❌ Erro ao apagar registro:", error.message);
  } else {
    console.log(`✅ Sessão do telefone ${phone} apagada com sucesso.`);
  }

  process.exit(0);
}

apagarTelefone();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function findJose() {
  console.log('--- BUSCANDO LEADS NO BANCO ---');
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*');

  if (error) {
    console.error('Erro ao buscar dados:', error.message);
    return;
  }

  console.log(`Encontrados ${data.length} registros no total.`);
  
  const joses = data.filter(item => {
    const nome = item.user_data?.nome_usuario || '';
    const historyText = JSON.stringify(item.user_data?.history || '');
    return nome.toLowerCase().includes('josé') || nome.toLowerCase().includes('jose') || historyText.toLowerCase().includes('josé') || historyText.toLowerCase().includes('jose');
  });

  if (joses.length === 0) {
    console.log('Nenhum lead com o nome "José" foi encontrado no banco de dados.');
    console.log('Todos os leads no banco:', data.map(d => ({ phone: d.phone, step: d.step, user_data: { nome: d.user_data?.nome_usuario, state_fsm: d.user_data?.state_fsm } })));
  } else {
    console.log(`Encontrado(s) ${joses.length} lead(s) correspondente(s) a "José":`);
    joses.forEach((jose, index) => {
      console.log(`\n--- LEAD JOSÉ #${index + 1} ---`);
      console.log(JSON.stringify(jose, null, 2));
    });
  }
}

findJose();

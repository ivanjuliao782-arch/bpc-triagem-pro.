import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fygzdhkxvgsarihbppkq.supabase.co';
const ANON_KEY = 'sb_publishable_PyBHJ0RKxtFxw9J-NqTilA_InzJptYK';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testFrontendFetch() {
  console.log('Simulando o Dashboard carregando os dados...');
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*');

  if (error) {
    console.error('ERRO RETORNADO PARA O DASHBOARD:', error.message, error.details, error.hint);
  } else {
    console.log(`SUCESSO! O Dashboard recebeu ${data.length} registros.`);
    if (data.length > 0) {
      console.log('Exemplo do primeiro registro que o Dashboard vê:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

testFrontendFetch();

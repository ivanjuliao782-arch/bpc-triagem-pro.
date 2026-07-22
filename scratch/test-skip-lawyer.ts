import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-nao-tenho-adv-' + Date.now();

  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- CENÁRIO EXATO DA IMAGEM ---');
  console.log('Mensagem: "Oi, meu nome é Luiz, tenho 60 anos, trabalhei 30 anos de carteira assinada, trabalhei na roça quando jovem, não tenho advogado, tenho documentos em mãos, quero me aposentar"');

  const reply = await sofia.processMessage(phone,
    'Oi, meu nome é Luiz, tenho 60 anos, trabalhei 30 anos de carteira assinada, trabalhei na roça quando jovem, não tenho advogado, tenho documentos em mãos, quero me aposentar'
  );
  console.log('\nBot respondeu:', reply);

  const { data } = await supabase.from('sofia_sessions').select('step, user_data').eq('phone', phone).single();
  console.log('\nFSM State:', data?.user_data?.state_fsm);
  console.log('has_lawyer:', data?.user_data?.has_lawyer);

  const passou = data?.user_data?.state_fsm === 'AWAITING_LAWYER' && 
                 (reply || '').toLowerCase().includes('advogado');
  console.log('\n' + (passou ? '✅ PASSOU — Pergunta do advogado foi feita corretamente' : '❌ FALHOU — Pulou o advogado'));

  await supabase.from('sofia_sessions').delete().eq('phone', phone);
}

runTest().catch(console.error);

import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-inss-last-contrib-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    console.log('\n--- CENÁRIO: FLUXO INSS_CONTRIBUTIVO COM NOVA PERGUNTA E SCORE ---');
    
    // Turn 1: Nome, idade, trabalho, doença, sem advogado
    const msg1 = 'Oi, meu nome é João, tenho 50 anos, trabalho como motorista autônomo, tenho hérnia de disco e sinto muita dor. Não tenho advogado.';
    console.log(`User: ${msg1}`);
    const reply1 = await sofia.processMessage(phone, msg1);
    console.log(`Sofia: ${reply1}`);

    let { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Turn 1 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log(`Fluxo Ativo (fluxo_ativo): ${session?.user_data?.fluxo_ativo}`);
    console.log(`Nome: ${session?.user_data?.nome_usuario}`);
    console.log(`Idade: ${session?.user_data?.idade}`);
    console.log(`Como contribuiu: ${session?.user_data?.inss_como_contribuiu}`);
    console.log('-----------------------------\n');

    // Turn 2: Resposta sobre se tem advogado (para a guarda do advogado)
    const msg2 = 'Não tenho advogado não';
    console.log(`User: ${msg2}`);
    const reply2 = await sofia.processMessage(phone, msg2);
    console.log(`Sofia: ${reply2}`);

    ({ data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single());
    console.log(`\n--- DB State after Turn 2 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log('-----------------------------\n');

    // Turn 3: Resposta sobre a última contribuição (deve ir para INSS_AWAITING_LAST_CONTRIBUTION)
    const msg3 = 'Sim, eu pago o carnê todo mês, o último pagamento foi mês passado';
    console.log(`User: ${msg3}`);
    const reply3 = await sofia.processMessage(phone, msg3);
    console.log(`Sofia: ${reply3}`);

    ({ data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single());
    console.log(`\n--- DB State after Turn 3 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log(`Última contribuição: ${session?.user_data?.inss_ultima_contribuicao}`);
    console.log('-----------------------------\n');

    // Turn 4: Resposta sobre laudos médicos (deve ir para INSS_AWAITING_REPORTS)
    const msg4 = 'Sim, tenho exames e laudos médicos aqui do mês passado que provam a dor nas costas';
    console.log(`User: ${msg4}`);
    const reply4 = await sofia.processMessage(phone, msg4);
    console.log(`Sofia: ${reply4}`);

    ({ data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single());
    console.log(`\n--- DB State after Turn 4 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log(`Laudos Médicos: ${session?.user_data?.inss_laudos_medicos}`);
    console.log(`Score Total: ${session?.user_data?.score_total}`);
    console.log('-----------------------------\n');

  } catch (e: any) {
    console.error('Error during test:', e);
  } finally {
    // Clean up
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('Cleanup completed.');
  }
}

runTest();

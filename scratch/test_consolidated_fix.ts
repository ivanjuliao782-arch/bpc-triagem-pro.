import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-fix-phone-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    console.log('\n--- 1. FIRST CONSOLIDATED MESSAGE ---');
    const msg1 = 'Oi, meu nome é Luiz, tenho 60 anos, trabalhei 30 anos de carteira assinada, não tenho advogado, quero me aposentar';
    console.log(`User: ${msg1}`);
    const reply1 = await sofia.processMessage(phone, msg1);
    console.log(`Sofia: ${reply1}`);
    
    // Check state in DB
    let { data: data1 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Message 1 ---`);
    console.log(`Step in DB: ${data1?.step}`);
    console.log(`FSM State (state_fsm): ${data1?.user_data?.state_fsm}`);
    console.log(`has_lawyer: ${data1?.user_data?.has_lawyer}`);
    console.log('-----------------------------\n');

    console.log('--- 2. RESPONSE TO MANDATORY LAWYER QUESTION ---');
    const msg2 = 'Não, não tenho nenhum advogado';
    console.log(`User: ${msg2}`);
    const reply2 = await sofia.processMessage(phone, msg2);
    console.log(`Sofia: ${reply2}`);

    let { data: data2 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Message 2 ---`);
    console.log(`Step in DB: ${data2?.step}`);
    console.log(`FSM State (state_fsm): ${data2?.user_data?.state_fsm}`);
    console.log(`has_lawyer: ${data2?.user_data?.has_lawyer}`);
    console.log('-----------------------------\n');

    console.log('--- 3. SENDING PRE-ANSWERED WORK/RURAL/MILITAR ---');
    const msg3 = 'trabalho de carteira assinada há 30 anos, nunca trabalhei no rural, não fiz serviço militar';
    console.log(`User: ${msg3}`);
    const reply3 = await sofia.processMessage(phone, msg3);
    console.log(`Sofia: ${reply3}`);

    let { data: data3 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Message 3 ---`);
    console.log(`Step in DB: ${data3?.step}`);
    console.log(`FSM State (state_fsm): ${data3?.user_data?.state_fsm}`);
    console.log(`trabalha_atualmente: ${data3?.user_data?.trabalha_atualmente}`);
    console.log('-----------------------------\n');

    console.log('--- 4. ANSWERING DISEASE (TRIGGERS RETIREMENT CLASSIFICATION AND SKIP TO FINISHED) ---');
    const msg4 = 'Não tenho nenhuma doença graças a Deus';
    console.log(`User: ${msg4}`);
    const reply4 = await sofia.processMessage(phone, msg4);
    console.log(`Sofia: ${reply4}`);

    let { data: data4 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Message 4 ---`);
    console.log(`Step in DB: ${data4?.step}`);
    console.log(`Fluxo Ativo: ${data4?.user_data?.fluxo_ativo}`);
    console.log(`FSM State (state_fsm): ${data4?.user_data?.state_fsm}`);
    console.log(`User Data: ${JSON.stringify(data4?.user_data || {}, null, 2)}`);
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

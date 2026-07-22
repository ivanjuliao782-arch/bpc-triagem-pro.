import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-apose-phone-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  // Helper to print session state from database
  const printState = async (stepName: string) => {
    const { data } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n=== DB State after ${stepName} ===`);
    console.log(`Step in DB: ${data?.step}`);
    console.log(`Fluxo Ativo: ${data?.user_data?.fluxo_ativo}`);
    console.log(`FSM State: ${data?.user_data?.state_fsm}`);
    console.log(`User Data: ${JSON.stringify(data?.user_data || {}, null, 2)}`);
    console.log('===================================\n');
  };

  console.log('\n--- 1. FIRST MESSAGE (GREETING) ---');
  let reply = await sofia.processMessage(phone, 'Olá, boa tarde');
  console.log('Bot:', reply);
  await printState('Greeting');

  console.log('\n--- 2. NAME MESSAGE ---');
  reply = await sofia.processMessage(phone, 'Luiz Henrique');
  console.log('Bot:', reply);
  await printState('Name');

  console.log('\n--- 3. LAWYER ANSWER (NO) ---');
  reply = await sofia.processMessage(phone, 'Não, não tenho nenhum advogado não.');
  console.log('Bot:', reply);
  await printState('Lawyer');

  console.log('\n--- 4. AGE ANSWER ---');
  reply = await sofia.processMessage(phone, 'Tenho 60 anos de idade');
  console.log('Bot:', reply);
  await printState('Age');

  console.log('\n--- 5. WORK ANSWER ---');
  reply = await sofia.processMessage(phone, 'Não estou trabalhando no momento, mas quero me aposentar. Já trabalhei muito na vida.');
  console.log('Bot:', reply);
  await printState('Work');

  console.log('\n--- 6. CONTRIBUTION ANSWER (contains 29 years, which should be saved and later skip RETIREMENT_AWAITING_GOAL) ---');
  reply = await sofia.processMessage(phone, 'Sim, já paguei o INSS. Contribui por uns 29 anos no total.');
  console.log('Bot:', reply);
  await printState('Contribution');

  console.log('\n--- 7. DISEASE ANSWER (NO, triggers retirement classification, and should skip RETIREMENT_AWAITING_GOAL because age/contribution/work are already known) ---');
  reply = await sofia.processMessage(phone, 'Não tenho nenhuma doença graças a Deus.');
  console.log('Bot:', reply);
  await printState('Disease (Retirement Classification)');

  console.log('\n--- 8. HISTÓRICO / RURAL / MILITAR (Answer all at once to test absolute skip to FINISHED) ---');
  reply = await sofia.processMessage(phone, 'Sempre trabalhei de carteira assinada, mas trabalhei na roça dos 12 aos 18 anos de idade e também prestei o serviço militar em 1985.');
  console.log('Bot:', reply);
  await printState('All-at-once response');

  // Clean up
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  console.log('\n--- RETIREMENT FLOW TEST COMPLETED ---');
}

runTest().catch(console.error);

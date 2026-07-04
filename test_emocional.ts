import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-emocional-phone-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    console.log('\n--- CENÁRIO 1: MENSAGEM INICIAL COM LUTO (GUARD 2) ---');
    const msg1 = 'Oi, meu nome é Maria, perdi meu marido há 3 dias e estou desesperada porque não tenho renda. Quero me aposentar';
    console.log(`User: ${msg1}`);

    const reply1 = await sofia.processMessage(phone, msg1);
    console.log(`Sofia: ${reply1}`);
    
    // Check state in DB
    let { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Turn 1 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log(`Sofrimento Relatado: ${session?.user_data?.sofrimento_relatado}`);
    console.log('-----------------------------\n');

    console.log('--- TURN 2: USER ANSWERS THE LAWYER QUESTION ---');
    const msg2 = 'Não tenho advogado não';
    console.log(`User: ${msg2}`);
    
    const reply2 = await sofia.processMessage(phone, msg2);
    console.log(`Sofia: ${reply2}`);

    ({ data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single());
    console.log(`\n--- DB State after Turn 2 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log(`Has Lawyer: ${session?.user_data?.has_lawyer}`);
    console.log('-----------------------------\n');

    console.log('--- TURN 3: USER RELATES SUFFERING IN THE MIDDLE OF CONVERSATION ---');
    const msg3 = 'Não consigo trabalhar de jeito nenhum porque estou com câncer e sofrendo muito de cama';
    console.log(`User: ${msg3}`);
    
    const reply3 = await sofia.processMessage(phone, msg3);
    console.log(`Sofia: ${reply3}`);

    ({ data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single());
    console.log(`\n--- DB State after Turn 3 ---`);
    console.log(`FSM State (state_fsm): ${session?.user_data?.state_fsm}`);
    console.log(`Sofrimento Relatado: ${session?.user_data?.sofrimento_relatado}`);
    console.log(`Trabalha Atualmente: ${session?.user_data?.trabalha_atualmente}`);
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

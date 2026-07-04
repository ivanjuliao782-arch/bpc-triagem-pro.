import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-consolidated-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- SENDING CONSOLIDATED MESSAGE ---');
  const msg = 'Oi, meu nome é Luiz, tenho 60 anos, trabalhei 30 anos de carteira assinada, não tenho advogado, quero me aposentar';
  console.log(`User: ${msg}`);

  try {
    const reply = await sofia.processMessage(phone, msg);
    console.log(`Sofia: ${reply}`);
    
    // Check state in DB
    const { data } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State after Message ---`);
    console.log(`Step in DB: ${data?.step}`);
    console.log(`FSM State (state_fsm): ${data?.user_data?.state_fsm}`);
    console.log(`User Data: ${JSON.stringify(data?.user_data || {}, null, 2)}`);
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

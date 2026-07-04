import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-offtopic-phone-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- 1. FIRST MESSAGE (GREETING) ---');
  let reply = await sofia.processMessage(phone, 'Oi');
  console.log('Bot:', reply);

  console.log('\n--- 2. NAME MESSAGE ---');
  reply = await sofia.processMessage(phone, 'Renato');
  console.log('Bot:', reply);

  console.log('\n--- 3. COMPLETELY OFF-TOPIC MESSAGE ---');
  reply = await sofia.processMessage(phone, 'Qual é a receita para fazer um bolo de cenoura com cobertura de chocolate?');
  console.log('Bot:', reply);

  // Fetch the session from the DB to see if state is still AWAITING_LAWYER
  const { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log('FSM State after off-topic:', session?.user_data?.state_fsm);

  // Clean up
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  console.log('\n--- TEST FOR OFF-TOPIC COMPLETED ---');
}

runTest().catch(console.error);

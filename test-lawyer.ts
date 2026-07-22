import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-lawyer-phone-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- 1. FIRST MESSAGE (GREETING) ---');
  let reply = await sofia.processMessage(phone, 'Olá, boa tarde');
  console.log('Bot:', reply);

  console.log('\n--- 2. NAME MESSAGE (SHOULD TRIGGER AWAITING_LAWYER VIA BYPASS) ---');
  reply = await sofia.processMessage(phone, 'Gabriel');
  console.log('Bot:', reply);

  console.log('\n--- 3. LAWYER ANSWER (YES) ---');
  reply = await sofia.processMessage(phone, 'Sim, já tenho um advogado sim');
  console.log('Bot:', reply);

  console.log('\n--- 4. SUBSEQUENT MESSAGE (SHOULD BE INTERCEPTED IMMEDIATELY) ---');
  reply = await sofia.processMessage(phone, 'Mas posso te fazer uma pergunta?');
  console.log('Bot:', reply);

  // Clean up
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- TEST FOR SIM COMPLETED ---\n');

  const phone2 = 'test-lawyer-phone-no-' + Date.now();
  console.log(`Using second phone number: ${phone2}`);

  console.log('\n--- 1. FIRST MESSAGE (GREETING) ---');
  reply = await sofia.processMessage(phone2, 'Oi');
  console.log('Bot:', reply);

  console.log('\n--- 2. NAME MESSAGE ---');
  reply = await sofia.processMessage(phone2, 'Renato');
  console.log('Bot:', reply);

  console.log('\n--- 3. LAWYER ANSWER (NO) ---');
  reply = await sofia.processMessage(phone2, 'Não, não tenho nenhum advogado');
  console.log('Bot:', reply);

  // Clean up
  await supabase.from('sofia_sessions').delete().eq('phone', phone2);
  console.log('\n--- TEST FOR NAO COMPLETED ---');
}

runTest().catch(console.error);

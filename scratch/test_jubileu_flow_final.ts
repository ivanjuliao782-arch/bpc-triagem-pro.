import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const engine = new SofiaEngine();
  const phone = 'test-jubileu-final-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- 1. FIRST MESSAGE (GREETING) ---');
  let reply = await engine.processMessage(phone, 'OI');
  console.log('Lara:', reply);

  console.log('\n--- 2. UPFRONT ANSWERS (NAME, LAWYER, AGE, CONTRIBUTION) ---');
  const upfrontMsg = `JUBILEU GALILAI
EU NÃO TENHO ADVOGADO
TENHO 70 ANOS E 30 DE CONTRIBUIÇÃO`;
  console.log(`Client: "${upfrontMsg}"`);
  reply = await engine.processMessage(phone, upfrontMsg);
  console.log('Lara:', reply);

  const { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log("\n=== SESSION DATA IN DB ===");
  console.log("FSM State:", session?.user_data?.state_fsm);
  console.log("Fluxo Ativo:", session?.user_data?.fluxo_ativo);
  console.log("User Data:", JSON.stringify(session?.user_data, null, 2));

  await supabase.from('sofia_sessions').delete().eq('phone', phone);
}

run().catch(console.error);

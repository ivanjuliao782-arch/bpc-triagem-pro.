import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const engine = new SofiaEngine();
  const phone = 'test-franciele-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- FRANCIELE\'S FIRST MESSAGE ---');
  const userMsg = `OI MEU NOME É FRANCIELE . ELES CORTARAM O BENEFICIO DO NINO ELE TEM PARALISIA CEREBRAL, DISSERAM QUE É PORQUE A MINHA FILHA MAIS VELHA VAI SE CASAR E QUE AI AUMENTA A RENDA. VOCÊ CONSEGUE ME AJUDAR POR FAVOR ?`;
  console.log(`Client: "${userMsg}"`);
  
  const reply = await engine.processMessage(phone, userMsg);
  console.log('\nLara:', reply);

  const { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log("\n=== SESSION DATA IN DB ===");
  console.log("FSM State:", session?.user_data?.state_fsm);
  console.log("Fluxo Ativo:", session?.user_data?.fluxo_ativo);
  console.log("User Data:", JSON.stringify(session?.user_data, null, 2));

  await supabase.from('sofia_sessions').delete().eq('phone', phone);
}

run().catch(console.error);

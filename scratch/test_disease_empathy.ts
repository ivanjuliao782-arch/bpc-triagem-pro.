import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const engine = new SofiaEngine();
  const phone = 'test-disease-empathy-' + Date.now();
  
  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  
  // Send first message
  const text1 = "Olá, boa tarde";
  console.log("User:", text1);
  const reply1 = await engine.processMessage(phone, text1);
  console.log("Lara:", reply1);
  
  // Send second message with name, age, disease, no lawyer
  const text2 = "Meu nome é José, tenho 50 anos, tenho problema no joelho que não me deixa trabalhar. Não tenho advogado.";
  console.log("\nUser:", text2);
  const reply2 = await engine.processMessage(phone, text2);
  console.log("Lara:", reply2);

  // Print final history and DB state
  const { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log("\nFSM State:", session?.user_data?.state_fsm);
  console.log("Sofrimento Relatado:", session?.user_data?.sofrimento_relatado);
  console.log("History in DB:\n", JSON.stringify(session?.user_data?.history, null, 2));

  // Clean up
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
}

test().catch(console.error);

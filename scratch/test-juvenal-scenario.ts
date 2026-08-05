import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const phone = '5532999999999'; // Test number
  
  // Clean prior test data for this phone
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  
  const engine = new SofiaEngine(supabase);

  console.log('--- STARTING SIMULATION FOR JUVENAL ---');

  // Message 1: "oi vc é de qual cidade doutora ?"
  const msg1 = "oi vc é de qual cidade doutora ?";
  console.log(`\nUser: "${msg1}"`);
  const reply1 = await engine.processMessage(phone, msg1);
  console.log(`Lara: "${reply1}"`);

  // Message 2: "eu sou juvenal"
  const msg2 = "eu sou juvenal";
  console.log(`\nUser: "${msg2}"`);
  const reply2 = await engine.processMessage(phone, msg2);
  console.log(`Lara: "${reply2}"`);

  // Message 3: "não tenho advogado"
  const msg3 = "não tenho advogado";
  console.log(`\nUser: "${msg3}"`);
  const reply3 = await engine.processMessage(phone, msg3);
  console.log(`Lara: "${reply3}"`);

  // Message 4: "tenho 65 anos e uns 24 de contribuição, não trabalho mais consigo aposentar ?"
  const msg4 = "tenho 65 anos e uns 24 de contribuição, não trabalho mais consigo aposentar ?";
  console.log(`\nUser: "${msg4}"`);
  const reply4 = await engine.processMessage(phone, msg4);
  console.log(`Lara: "${reply4}"`);

  // Print final session state
  const { data: finalSession } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log('\n--- FINAL DATABASE SESSION STATE ---');
  console.log(JSON.stringify(finalSession?.user_data, null, 2));
}

runTest().catch(console.error);

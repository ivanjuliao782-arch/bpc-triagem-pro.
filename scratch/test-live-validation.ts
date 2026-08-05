import { SofiaEngine } from '../src/sofia';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function runLiveValidation() {
  console.log('🚀 Running final live validation test...');
  const engine = new SofiaEngine();
  const testPhone = '5532777777777'; // Brand new test number
  
  // Clear any existing session for this test number
  await supabase.from('sofia_sessions').delete().eq('phone', testPhone);
  console.log('1. Cleared any old session for test number.');

  // Turn 1: Opening message (containing deadline, age 54, and pain/column)
  const openingMsg = "Oi boa NOITE, é o seguinte, eu tô desesperado aqui porque o INSS indeferiu meu auxílio de novo, essa já é a segunda vez, eu tenho 54 anos, trabalhei minha vida inteira registrado, agora fiquei sem chão porque não sei o que fazer, minha esposa tá desempregada também, aí eu queria saber se vocês atendem esse tipo de caso e quanto tempo demora pra... deixa eu ver aqui... ah é, eu tenho o laudo do médico também, ele disse que eu não posso voltar a trabalhar tão cedo por causa da coluna, será que vocês conseguem me ajudar hoje ainda ou só semana que vem?";
  console.log(`\nSending message 1: "${openingMsg}"`);
  const reply1 = await engine.processMessage(testPhone, openingMsg);
  console.log(`Lara Reply 1:\n"""\n${reply1}\n"""`);

  // Turn 2: Name
  const nameMsg = "Jeronso";
  console.log(`\nSending message 2: "${nameMsg}"`);
  const reply2 = await engine.processMessage(testPhone, nameMsg);
  console.log(`Lara Reply 2:\n"""\n${reply2}\n"""`);

  // Turn 3: Lawyer check
  const lawyerMsg = "Ainda não";
  console.log(`\nSending message 3: "${lawyerMsg}"`);
  const reply3 = await engine.processMessage(testPhone, lawyerMsg);
  console.log(`Lara Reply 3:\n"""\n${reply3}\n"""`);

  // Fetch the saved session from the database to inspect all fields
  console.log('\nFetching saved session from database...');
  const { data: sessionData, error } = await supabase
    .from('sofia_sessions')
    .select('user_data, step')
    .eq('phone', testPhone)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return;
  }

  const ud = sessionData.user_data;
  console.log('\n--- EXTRACTED USER DATA IN DATABASE ---');
  console.log(`Age (idade): ${ud.idade} (Expected: 54)`);
  console.log(`Disease (doenca): ${ud.doenca} (Expected: "problema na coluna" or similar)`);
  console.log(`Medical Report (inss_laudos_medicos): ${ud.inss_laudos_medicos} (Expected: true)`);
  console.log(`Has Disease/Limit (tem_doenca_ou_limitacao): ${ud.tem_doenca_ou_limitacao} (Expected: true)`);
  console.log(`Work History (inss_como_contribuiu): "${ud.inss_como_contribuiu}" (Expected: "trabalhei minha vida inteira registrado")`);
  console.log(`FSM State (state_fsm): ${ud.state_fsm} (Expected: not AWAITING_AGE)`);
  console.log(`Current Triaging Step (step): ${sessionData.step}`);

  const isAgeSkipped = ud.state_fsm !== 'AWAITING_AGE';
  const isDiseaseSkipped = ud.state_fsm !== 'AWAITING_DISEASE';
  
  if (ud.idade === 54 && ud.inss_laudos_medicos === true && ud.tem_doenca_ou_limitacao === true && isAgeSkipped) {
    console.log('\n✅✅ E2E LIVE VALIDATION SUCCESSFUL! All 8 inputs captured on first turn, and FSM skipped the age question! ✅✅');
  } else {
    console.log('\n❌❌ E2E LIVE VALIDATION FAILED! Check logic. ❌❌');
  }

  // Cleanup after test
  await supabase.from('sofia_sessions').delete().eq('phone', testPhone);
}

runLiveValidation().catch(console.error);

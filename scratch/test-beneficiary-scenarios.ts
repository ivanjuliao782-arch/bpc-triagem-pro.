import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runScenarioA() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO A: LATE CORRECTION TO AUTO-BENEFICIARY 🧪');
  console.log('========================================================================');

  const sofia = new SofiaEngine();
  const phone = 'test-scen-a-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean old session
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    console.log('\n--- Turn 1: Mentioning relative early (mãe) ---');
    console.log('User: "Oi, boa tarde. Quero ver um benefício para minha mãe."');
    let reply = await sofia.processMessage(phone, 'Oi, boa tarde. Quero ver um benefício para minha mãe.');
    console.log(`Lara: "${reply}"`);

    let { data: s1 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State] state_fsm: "${s1?.user_data?.state_fsm}", beneficiario_terceiro: "${s1?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${s1?.user_data?.beneficiario_ja_confirmado}`);

    console.log('\n--- Turn 2: Setting name ---');
    console.log('User: "Meu nome é Gabriel"');
    reply = await sofia.processMessage(phone, 'Meu nome é Gabriel');
    console.log(`Lara: "${reply}"`);

    let { data: s2 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State] state_fsm: "${s2?.user_data?.state_fsm}", beneficiario_terceiro: "${s2?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${s2?.user_data?.beneficiario_ja_confirmado}`);

    console.log('\n--- Turn 3: Checking lawyer ---');
    console.log('User: "não tenho advogado"');
    reply = await sofia.processMessage(phone, 'não tenho advogado');
    console.log(`Lara: "${reply}"`);

    let { data: s3 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State] state_fsm: "${s3?.user_data?.state_fsm}", beneficiario_terceiro: "${s3?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${s3?.user_data?.beneficiario_ja_confirmado}`);

    console.log('\n--- Turn 4: Checking age ---');
    console.log('User: "ela tem 67 anos"');
    reply = await sofia.processMessage(phone, 'ela tem 67 anos');
    console.log(`Lara: "${reply}"`);

    let { data: s4 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State] state_fsm: "${s4?.user_data?.state_fsm}", beneficiario_terceiro: "${s4?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${s4?.user_data?.beneficiario_ja_confirmado}`);

    console.log('\n--- Turn 5: Late correction to self ---');
    console.log('User: "ah, na verdade é pra mim mesmo o benefício, não para ela"');
    reply = await sofia.processMessage(phone, 'ah, na verdade é pra mim mesmo o benefício, não para ela');
    console.log(`Lara: "${reply}"`);

    let { data: s5 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State Final] state_fsm: "${s5?.user_data?.state_fsm}", beneficiario_terceiro: "${s5?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${s5?.user_data?.beneficiario_ja_confirmado}`);

  } catch (err: any) {
    console.error('❌ Error in Scenario A:', err.message);
  } finally {
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('🧹 Scenario A session cleaned.');
  }
}

async function runScenarioB() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO B: INCIDENTAL MENTION OF RELATIVE WITHOUT CHANGING BENEFICIARY 🧪');
  console.log('========================================================================');

  const sofia = new SofiaEngine();
  const phone = 'test-scen-b-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean old session
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    // Pre-fill user data where beneficiary is the user themselves (beneficiario_terceiro = null)
    // and we are at BPC_AWAITING_HOUSEHOLD_INCOME state.
    const initialUserData = {
      nome_usuario: 'Gabriel',
      has_lawyer: false,
      idade: 67,
      beneficiario_terceiro: null,
      beneficiario_ja_confirmado: true,
      bpc_pessoas_casa: 'moro com meu pai',
      state_fsm: 'BPC_AWAITING_HOUSEHOLD_INCOME',
      history: [
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Olá Gabriel, você tem 67 anos e mora com seu pai. Alguém na sua casa trabalha ou recebe aposentadoria?' }
      ]
    };

    // Save initial session to Supabase
    await supabase.rpc('save_session_data', {
      p_phone: phone,
      p_step: 'income',
      p_user_data_updates: initialUserData
    });

    let { data: sBefore } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State Before] state_fsm: "${sBefore?.user_data?.state_fsm}", beneficiario_terceiro: "${sBefore?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${sBefore?.user_data?.beneficiario_ja_confirmado}`);

    console.log('\n--- Turn: Incidental mention of relative (pai) ---');
    console.log('User: "meu pai recebe aposentadoria"');
    let reply = await sofia.processMessage(phone, 'meu pai recebe aposentadoria');
    console.log(`Lara: "${reply}"`);

    let { data: sAfter } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`🔍 [DB State After] state_fsm: "${sAfter?.user_data?.state_fsm}", beneficiario_terceiro: "${sAfter?.user_data?.beneficiario_terceiro}", beneficiario_ja_confirmado: ${sAfter?.user_data?.beneficiario_ja_confirmado}`);

  } catch (err: any) {
    console.error('❌ Error in Scenario B:', err.message);
  } finally {
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('🧹 Scenario B session cleaned.');
  }
}

async function runAll() {
  await runScenarioA();
  await runScenarioB();
}

runAll();

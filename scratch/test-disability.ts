import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-disability-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean old session
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    // Pre-fill user data to reach AWAITING_DISABILITY state
    const initialUserData = {
      nome_usuario: 'Gabriel',
      has_lawyer: false,
      idade: 35,
      inss_tempo_carteira: '5 anos',
      esta_contribuindo_atualmente: true,
      tem_doenca_ou_limitacao: false,
      tem_deficiencia: null,
      state_fsm: 'AWAITING_DISABILITY',
      history: [
        { role: 'assistant', content: 'Gabriel, você tem alguma deficiência?' }
      ]
    };

    // Save initial session to Supabase
    const { data, error } = await supabase.rpc('save_session_data', {
      p_phone: phone,
      p_step: 'welcome',
      p_user_data_updates: initialUserData
    });

    if (error) {
      console.error('❌ RPC Error during setup:', error);
    } else {
      console.log('✅ RPC Setup Success, data returned:', JSON.stringify(data));
    }

    // Reread to confirm
    let { data: sessionBefore, error: readError } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    if (readError) {
      console.error('❌ Read Error:', readError);
    }
    console.log(`\n🔍 [DB Check Before] state_fsm: "${sessionBefore?.user_data?.state_fsm}"`);
    console.log(`🔍 [DB Check Before] user_data: ${JSON.stringify(sessionBefore?.user_data)}`);

    console.log('\n--- Sending message: "Graças a Deus não" ---');
    let reply = await sofia.processMessage(phone, 'Graças a Deus não');
    console.log(`Lara response: "${reply}"`);

    // Verify database state after sending the key message
    let { data: sessionAfter } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n🔍 [DB Check After] state_fsm: "${sessionAfter?.user_data?.state_fsm}"`);
    console.log(`🔍 [DB Check After] tem_deficiencia: ${sessionAfter?.user_data?.tem_deficiencia}`);
    console.log(`🔍 [DB Check After] is_off_topic: ${sessionAfter?.user_data?.is_off_topic}`);

  } catch (err: any) {
    console.error('❌ Error during test execution:', err.message);
  } finally {
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('\n🧹 Test session cleaned.');
  }
}

runTest();

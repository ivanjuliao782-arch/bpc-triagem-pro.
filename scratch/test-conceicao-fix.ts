import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runConceicaoTest() {
  console.log('\n========================================================================');
  console.log('🧪 RETEST: CONCEIÇÃO FIXED SEQUENCE 🧪');
  console.log('========================================================================');

  const sofia = new SofiaEngine();
  const phone = 'test-conceicao-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean old session
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    const turns = [
      { text: "Bom dia", expectedState: "AWAITING_NAME" },
      { text: "Trabalho de carteira assinada tenho direito ao bolsa famiia", expectedState: "AWAITING_NAME" },
      { text: "Conceição", expectedState: "AWAITING_LAWYER" },
      { text: "Não", expectedState: "AWAITING_AGE" },
      { text: "57 anos", expectedState: "AWAITING_TOTAL_CONTRIBUTION" },
      { text: "20 anos", expectedState: "AWAITING_DISEASE" },
      { text: "Como assim", expectedState: "AWAITING_DISEASE" },
      { text: "Não", expectedState: "AWAITING_DISABILITY" },
      { text: "Não", expectedState: "RETIREMENT_AWAITING_SPECIAL_RURAL" },
      { text: "Não", expectedState: "RETIREMENT_AWAITING_OTHER_PERIODS" },
      { text: "Sou domestia", expectedState: "FINISHED" } // Crucial turn! Should trigger the fixes!
    ];

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      console.log(`\n--- Turn ${i + 1}: "${turn.text}" ---`);
      let reply = await sofia.processMessage(phone, turn.text);
      console.log(`Lara: "${reply}"`);

      let { data: s } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
      console.log(`🔍 [DB State] state_fsm: "${s?.user_data?.state_fsm}"`);
      console.log(`              trabalha_atualmente: ${s?.user_data?.trabalha_atualmente}`);
      console.log(`              esta_contribuindo_atualmente: ${s?.user_data?.esta_contribuindo_atualmente}`);
      console.log(`              retirement_other_periods: "${s?.user_data?.retirement_other_periods}"`);
      
      if (s?.user_data?.state_fsm === 'FINISHED') {
        console.log('✅ Success! FSM successfully reached FINISHED state.');
        break;
      }
    }

  } catch (err: any) {
    console.error('❌ Error in Conceicao Retest:', err.message);
  } finally {
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('🧹 Test session cleaned.');
  }
}

runConceicaoTest();

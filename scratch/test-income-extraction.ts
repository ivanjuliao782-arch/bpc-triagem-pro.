import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runIncomeTests() {
  const sofia = new SofiaEngine();
  const phone = 'test-income-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  try {
    // ------------------------------------------------------------------------
    // Scenario 1: "recebo 600 mas pago 400 de aluguel" (familySize = 1)
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('🧪 SCENARIO 1: "recebo 600 mas pago 400 de aluguel" 🧪');
    console.log('========================================================================');
    
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    const u1 = {
      nome_usuario: 'Gabriel',
      has_lawyer: false,
      idade: 67,
      beneficiario_terceiro: null,
      beneficiario_ja_confirmado: true,
      bpc_pessoas_casa: 'moro sozinho',
      state_fsm: 'BPC_AWAITING_HOUSEHOLD_INCOME',
      history: [
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Olá Gabriel, você mora sozinho. Alguém na sua casa trabalha ou recebe aposentadoria?' }
      ]
    };
    await supabase.rpc('save_session_data', { p_phone: phone, p_step: 'income', p_user_data_updates: u1 });

    let reply1 = await sofia.processMessage(phone, 'recebo 600 mas pago 400 de aluguel');
    console.log(`Lara: "${reply1}"`);

    let { data: s1 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n🔍 [Result Scenario 1]`);
    console.log(`  bpc_renda_familiar: ${s1?.user_data?.bpc_renda_familiar}`);
    console.log(`  bpc_quem_renda: "${s1?.user_data?.bpc_quem_renda}"`);
    console.log(`  bpc_valor_renda_total: ${s1?.user_data?.bpc_valor_renda_total}`);
    console.log(`  state_fsm (expected FINISHED/disqualified or AWAITING): "${s1?.user_data?.state_fsm}"`);

    // ------------------------------------------------------------------------
    // Scenario 2: "minha mãe tem 65 anos e ganha 800 de aposentadoria" (familySize = 2)
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('🧪 SCENARIO 2: "minha mãe tem 65 anos e ganha 800 de aposentadoria" 🧪');
    console.log('========================================================================');
    
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    const u2 = {
      nome_usuario: 'Gabriel',
      has_lawyer: false,
      idade: 67,
      beneficiario_terceiro: null,
      beneficiario_ja_confirmado: true,
      bpc_pessoas_casa: 'moro com minha mae',
      state_fsm: 'BPC_AWAITING_HOUSEHOLD_INCOME',
      history: [
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Olá Gabriel, você mora com sua mãe. Alguém na sua casa trabalha ou recebe aposentadoria?' }
      ]
    };
    await supabase.rpc('save_session_data', { p_phone: phone, p_step: 'income', p_user_data_updates: u2 });

    let reply2 = await sofia.processMessage(phone, 'minha mãe tem 65 anos e ganha 800 de aposentadoria');
    console.log(`Lara: "${reply2}"`);

    let { data: s2 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n🔍 [Result Scenario 2]`);
    console.log(`  bpc_renda_familiar: ${s2?.user_data?.bpc_renda_familiar}`);
    console.log(`  bpc_quem_renda: "${s2?.user_data?.bpc_quem_renda}"`);
    console.log(`  bpc_valor_renda_total: ${s2?.user_data?.bpc_valor_renda_total}`);
    console.log(`  state_fsm (expected FINISHED or BPC_AWAITING_HOME_STATUS): "${s2?.user_data?.state_fsm}"`);

  } catch (err: any) {
    console.error('❌ Error during income tests:', err.message);
  } finally {
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('\n🧹 Test session cleaned.');
  }
}

runIncomeTests();

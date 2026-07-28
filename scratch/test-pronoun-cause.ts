import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runExperiment() {
  const sofia = new SofiaEngine();
  const phone = 'test-pronoun-' + Date.now();

  try {
    // Experiment 1: Elderly (Age 67), mentioning father
    // FSM = BPC_AWAITING_HOUSEHOLD_INCOME
    console.log('\n--- Experiment 1: Age 67, mention "pai" ---');
    const u1 = {
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
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    await supabase.rpc('save_session_data', { p_phone: phone, p_step: 'income', p_user_data_updates: u1 });
    let reply1 = await sofia.processMessage(phone, 'meu pai recebe aposentadoria');
    console.log(`Lara (67yo, "pai"): "${reply1}"`);

    // Experiment 2: Young (Age 35), mentioning father
    console.log('\n--- Experiment 2: Age 35, mention "pai" ---');
    const u2 = {
      nome_usuario: 'Gabriel',
      has_lawyer: false,
      idade: 35,
      inss_tempo_carteira: undefined,
      beneficiario_terceiro: null,
      beneficiario_ja_confirmado: true,
      bpc_pessoas_casa: 'moro com meu pai',
      state_fsm: 'BPC_AWAITING_HOUSEHOLD_INCOME',
      history: [
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Olá Gabriel, você tem 35 anos e mora com seu pai. Alguém na sua casa trabalha ou recebe aposentadoria?' }
      ]
    };
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    await supabase.rpc('save_session_data', { p_phone: phone, p_step: 'income', p_user_data_updates: u2 });
    let reply2 = await sofia.processMessage(phone, 'meu pai recebe aposentadoria');
    console.log(`Lara (35yo, "pai"): "${reply2}"`);

    // Experiment 3: Elderly (Age 67), mentioning wife (no "pai")
    console.log('\n--- Experiment 3: Age 67, mention "esposa" (no "pai") ---');
    const u3 = {
      nome_usuario: 'Gabriel',
      has_lawyer: false,
      idade: 67,
      beneficiario_terceiro: null,
      beneficiario_ja_confirmado: true,
      bpc_pessoas_casa: 'moro com minha esposa',
      state_fsm: 'BPC_AWAITING_HOUSEHOLD_INCOME',
      history: [
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Olá Gabriel, você tem 67 anos e mora com sua esposa. Alguém na sua casa trabalha ou recebe aposentadoria?' }
      ]
    };
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    await supabase.rpc('save_session_data', { p_phone: phone, p_step: 'income', p_user_data_updates: u3 });
    let reply3 = await sofia.processMessage(phone, 'minha esposa recebe aposentadoria');
    console.log(`Lara (67yo, "esposa"): "${reply3}"`);

  } catch (err: any) {
    console.error('❌ Experiment error:', err.message);
  } finally {
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
  }
}

runExperiment();

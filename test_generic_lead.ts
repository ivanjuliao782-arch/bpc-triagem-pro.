import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-generic-lead-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Clean up session if exists
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    console.log('\n--- CENÁRIO: TESTANDO LEAD GENÉRICO "RENATA" (INSS_CONTRIBUTIVO) ---');
    
    // Turn 1: Renata se apresenta, relata câncer, sem advogado, 52 anos, trabalhadora de carteira assinada
    const msg1 = 'Olá, sou a Renata, tenho 52 anos, trabalhei de carteira assinada. Tenho câncer de mama e não consigo mais trabalhar. Não tenho advogado.';
    console.log(`User: ${msg1}`);
    const reply1 = await sofia.processMessage(phone, msg1);
    console.log(`Sofia: ${reply1}`);

    // Turn 2: Confirmar pergunta de advogado (Guarda de Advogado)
    const msg2 = 'Não tenho advogado não';
    console.log(`User: ${msg2}`);
    const reply2 = await sofia.processMessage(phone, msg2);
    console.log(`Sofia: ${reply2}`);

    // Turn 3: Responder sobre última contribuição (INSS_AWAITING_LAST_CONTRIBUTION)
    const msg3 = 'Minha última contribuição foi há 1 ano';
    console.log(`User: ${msg3}`);
    const reply3 = await sofia.processMessage(phone, msg3);
    console.log(`Sofia: ${reply3}`);

    // Turn 4: Responder sobre laudos médicos (INSS_AWAITING_REPORTS) - inss_laudos_medicos = true
    const msg4 = 'Sim, tenho todos os laudos e exames aqui do hospital de 2026';
    console.log(`User: ${msg4}`);
    const reply4 = await sofia.processMessage(phone, msg4);
    console.log(`Sofia: ${reply4}`);

    // Obter dados finais do banco
    const { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n--- DB State for Renata ---`);
    console.log(`Nome: ${session?.user_data?.nome_usuario}`);
    console.log(`Idade: ${session?.user_data?.idade}`);
    console.log(`Doença: ${session?.user_data?.doenca}`);
    console.log(`Laudos Médicos: ${session?.user_data?.inss_laudos_medicos}`);
    console.log(`Última contribuição: ${session?.user_data?.inss_ultima_contribuicao}`);
    console.log(`Score Total: ${session?.user_data?.score_total} pts`);
    console.log('-----------------------------\n');

  } catch (e: any) {
    console.error('Error during test:', e);
  } finally {
    // Clean up
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('Cleanup completed.');
  }
}

runTest();

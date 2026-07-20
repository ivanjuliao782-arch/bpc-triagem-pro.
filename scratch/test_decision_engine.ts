import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTestDecisionEngine() {
  const sofia = new SofiaEngine();

  // ==========================================
  // CENÁRIO 1: AUXÍLIO-DOENÇA (Incapacidade + Qualidade de segurado)
  // Mariana: 40 anos, 10 anos pagos, parou há 5 meses (tempoParado <= 36), tem doença (câncer)
  // ==========================================
  console.log('\n==========================================');
  console.log('🔥 TESTE 1: AUXÍLIO-DOENÇA (Mariana)');
  console.log('Esperado: Ir direto para INSS_CONTRIBUTIVO (Auxílio-doença)');
  console.log('==========================================');
  const phone1 = 'test-decision-auxilio-' + Date.now();
  await supabase.from('sofia_sessions').delete().eq('phone', phone1);

  console.log('Mariana: "Boa noite"');
  let r1 = await sofia.processMessage(phone1, 'Boa noite');

  console.log('Mariana: "Sou a Mariana."');
  r1 = await sofia.processMessage(phone1, 'Sou a Mariana.');

  console.log('Mariana: "Não"');
  r1 = await sofia.processMessage(phone1, 'Não');

  console.log('Mariana: "Tenho 40 anos"');
  r1 = await sofia.processMessage(phone1, 'Tenho 40 anos');

  console.log('Mariana: "Tenho 10 anos de contribuição"');
  r1 = await sofia.processMessage(phone1, 'Tenho 10 anos de contribuição');

  console.log('Mariana: "Não, parei em fevereiro deste ano"');
  r1 = await sofia.processMessage(phone1, 'Não, parei em fevereiro deste ano');

  console.log('Mariana: "Tenho câncer de mama"');
  r1 = await sofia.processMessage(phone1, 'Tenho câncer de mama');

  console.log('Mariana: "Não tenho deficiência"');
  r1 = await sofia.processMessage(phone1, 'Não tenho deficiência');
  console.log('Lara:', r1);

  const { data: d1 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone1).single();
  console.log(`\n➡️ FSM State final do Teste 1: ${d1?.user_data?.state_fsm} | Fluxo Ativo: ${d1?.user_data?.fluxo_ativo}`);
  await supabase.from('sofia_sessions').delete().eq('phone', phone1);


  // ==========================================
  // CENÁRIO 2: APOSENTADORIA (Sem doença, 55 anos + 15 anos pagos)
  // Roberto: 55 anos, 15 anos pagos, sem doença, sem deficiência
  // ==========================================
  console.log('\n==========================================');
  console.log('🔥 TESTE 2: APOSENTADORIA (Roberto)');
  console.log('Esperado: Ir direto para APOSENTADORIA');
  console.log('==========================================');
  const phone2 = 'test-decision-aposentadoria-' + Date.now();
  await supabase.from('sofia_sessions').delete().eq('phone', phone2);

  console.log('Roberto: "Boa tarde"');
  let r2 = await sofia.processMessage(phone2, 'Boa tarde');

  console.log('Roberto: "Sou o Roberto"');
  r2 = await sofia.processMessage(phone2, 'Sou o Roberto');

  console.log('Roberto: "Não"');
  r2 = await sofia.processMessage(phone2, 'Não');

  console.log('Roberto: "Tenho 55 anos"');
  r2 = await sofia.processMessage(phone2, 'Tenho 55 anos');

  console.log('Roberto: "Tenho 15 anos de carteira assinada"');
  r2 = await sofia.processMessage(phone2, 'Tenho 15 anos de carteira assinada');

  console.log('Roberto: "Sim, pago até hoje"');
  r2 = await sofia.processMessage(phone2, 'Sim, pago até hoje');

  console.log('Roberto: "Não, não tenho nenhuma doença"');
  r2 = await sofia.processMessage(phone2, 'Não, não tenho nenhuma doença');

  console.log('Roberto: "Não tenho deficiência"');
  r2 = await sofia.processMessage(phone2, 'Não tenho deficiência');
  console.log('Lara:', r2);

  const { data: d2 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone2).single();
  console.log(`\n➡️ FSM State final do Teste 2: ${d2?.user_data?.state_fsm} | Fluxo Ativo: ${d2?.user_data?.fluxo_ativo}`);
  await supabase.from('sofia_sessions').delete().eq('phone', phone2);


  // ==========================================
  // CENÁRIO 3: BPC (Deficiente sem contribuição / tempoParado > 24)
  // Severino: 60 anos, sem contribuições relevantes, doença grave, parou há 4 anos
  // ==========================================
  console.log('\n==========================================');
  console.log('🔥 TESTE 3: BPC DEFICIENTE (Severino)');
  console.log('Esperado: Ir direto para BPC_DEFICIENTE');
  console.log('==========================================');
  const phone3 = 'test-decision-bpc-' + Date.now();
  await supabase.from('sofia_sessions').delete().eq('phone', phone3);

  console.log('Severino: "Oi"');
  let r3 = await sofia.processMessage(phone3, 'Oi');

  console.log('Severino: "Sou o Severino"');
  r3 = await sofia.processMessage(phone3, 'Sou o Severino');

  console.log('Severino: "Não"');
  r3 = await sofia.processMessage(phone3, 'Não');

  console.log('Severino: "Tenho 60 anos"');
  r3 = await sofia.processMessage(phone3, 'Tenho 60 anos');

  console.log('Severino: "Nunca paguei INSS na vida"');
  r3 = await sofia.processMessage(phone3, 'Nunca paguei INSS na vida');

  console.log('Severino: "Não estou contribuindo atualmente"');
  r3 = await sofia.processMessage(phone3, 'Não estou contribuindo atualmente');

  console.log('Severino: "Tenho problema cardíaco grave que me impede de trabalhar"');
  r3 = await sofia.processMessage(phone3, 'Tenho problema cardíaco grave que me impede de trabalhar');

  console.log('Severino: "Não"');
  r3 = await sofia.processMessage(phone3, 'Não');
  console.log('Lara:', r3);

  const { data: d3 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone3).single();
  console.log(`\n➡️ FSM State final do Teste 3: ${d3?.user_data?.state_fsm} | Fluxo Ativo: ${d3?.user_data?.fluxo_ativo}`);
  await supabase.from('sofia_sessions').delete().eq('phone', phone3);

  console.log('\n==========================================');
  console.log('🎉 TODOS OS TESTES DE DECISÃO DE ENTRADA CONCLUÍDOS!');
  console.log('==========================================');
}

runTestDecisionEngine().catch(console.error);

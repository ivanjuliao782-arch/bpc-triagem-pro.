import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTestAllFunnels() {
  const sofia = new SofiaEngine();

  // ==========================================
  // FUNIL 1: APOSENTADORIA (Roberto, 50 anos, 27 anos pagos)
  // ==========================================
  console.log('\n==========================================');
  console.log('🔥 FUNIL 1: APOSENTADORIA (Roberto, 50 anos, 27 contribuição)');
  console.log('==========================================');
  const phone1 = 'test-apose-funnel-' + Date.now();
  await supabase.from('sofia_sessions').delete().eq('phone', phone1);

  console.log('Roberto: "Boa noite"');
  let r1 = await sofia.processMessage(phone1, 'Boa noite');
  console.log('Lara:', r1);

  console.log('Roberto: "Sou o Roberto. Tenho 50 anos e 27 de contribuição."');
  r1 = await sofia.processMessage(phone1, 'Sou o Roberto. Tenho 50 anos e 27 de contribuição.');
  console.log('Lara:', r1);

  console.log('Roberto: "Ainda não doutora"');
  r1 = await sofia.processMessage(phone1, 'Ainda não doutora');
  console.log('Lara:', r1);

  console.log('Roberto: "As vezes"');
  r1 = await sofia.processMessage(phone1, 'As vezes');
  console.log('Lara:', r1);

  console.log('Roberto: "Sim Lara sinto muita dor na coluna, tem dia que não consigo andar"');
  r1 = await sofia.processMessage(phone1, 'Sim Lara sinto muita dor na coluna, tem dia que não consigo andar');
  console.log('Lara:', r1);

  console.log('Roberto: "Não estou há exatamente 3 meses sem contribuir"');
  r1 = await sofia.processMessage(phone1, 'Não estou há exatamente 3 meses sem contribuir');
  console.log('Lara:', r1);

  console.log('Roberto: "Sempre trabalhei de carteira assinada"');
  r1 = await sofia.processMessage(phone1, 'Sempre trabalhei de carteira assinada');
  console.log('Lara:', r1);

  console.log('Roberto: "Não, nunca trabalhei na roça nem com ruído ou produto químico"');
  r1 = await sofia.processMessage(phone1, 'Não, nunca trabalhei na roça nem com ruído ou produto químico');
  console.log('Lara:', r1);

  console.log('Roberto: "Não, nunca trabalhei no serviço público nem no exército"');
  r1 = await sofia.processMessage(phone1, 'Não, nunca trabalhei no serviço público nem no exército');
  console.log('Lara:', r1);

  const { data: d1 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone1).single();
  console.log(`\n➡️ Resultado Funil 1 - FSM State: ${d1?.user_data?.state_fsm} | Fluxo Ativo: ${d1?.user_data?.fluxo_ativo}`);
  await supabase.from('sofia_sessions').delete().eq('phone', phone1);


  // ==========================================
  // FUNIL 2: AUXÍLIO-DOENÇA (Mariana, 40 anos, 10 anos pagos, parou há 5 meses)
  // ==========================================
  console.log('\n==========================================');
  console.log('🔥 FUNIL 2: AUXÍLIO-DOENÇA / INSS CONTRIBUTIVO (Mariana, 40 anos, 10 contribuição)');
  console.log('==========================================');
  const phone2 = 'test-doenca-funnel-' + Date.now();
  await supabase.from('sofia_sessions').delete().eq('phone', phone2);

  console.log('Mariana: "Oi Lara"');
  let r2 = await sofia.processMessage(phone2, 'Oi Lara');
  console.log('Lara:', r2);

  console.log('Mariana: "Meu nome é Mariana"');
  r2 = await sofia.processMessage(phone2, 'Meu nome é Mariana');
  console.log('Lara:', r2);

  console.log('Mariana: "Não"');
  r2 = await sofia.processMessage(phone2, 'Não');
  console.log('Lara:', r2);

  console.log('Mariana: "Tenho 40 anos"');
  r2 = await sofia.processMessage(phone2, 'Tenho 40 anos');
  console.log('Lara:', r2);

  console.log('Mariana: "Infelizmente não consigo trabalhar mais por conta de um câncer de mama"');
  r2 = await sofia.processMessage(phone2, 'Infelizmente não consigo trabalhar mais por conta de um câncer de mama');
  console.log('Lara:', r2);

  console.log('Mariana: "Não estou contribuindo mais. Parou em fevereiro deste ano"');
  r2 = await sofia.processMessage(phone2, 'Não estou contribuindo mais. Parou em fevereiro deste ano');
  console.log('Lara:', r2);

  console.log('Mariana: "Tenho 10 anos de carteira assinada"');
  r2 = await sofia.processMessage(phone2, 'Tenho 10 anos de carteira assinada');
  console.log('Lara:', r2);

  console.log('Mariana: "Sim, tenho exames e laudos que o médico me deu"');
  r2 = await sofia.processMessage(phone2, 'Sim, tenho exames e laudos que o médico me deu');
  console.log('Lara:', r2);

  const { data: d2 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone2).single();
  console.log(`\n➡️ Resultado Funil 2 - FSM State: ${d2?.user_data?.state_fsm} | Fluxo Ativo: ${d2?.user_data?.fluxo_ativo}`);
  await supabase.from('sofia_sessions').delete().eq('phone', phone2);


  // ==========================================
  // FUNIL 3: BPC IDOSO (Severino, 67 anos, nunca contribuiu)
  // ==========================================
  console.log('\n==========================================');
  console.log('🔥 FUNIL 3: BPC IDOSO (Severino, 67 anos, sem contribuição)');
  console.log('==========================================');
  const phone3 = 'test-bpc-funnel-' + Date.now();
  await supabase.from('sofia_sessions').delete().eq('phone', phone3);

  console.log('Severino: "Boa tarde"');
  let r3 = await sofia.processMessage(phone3, 'Boa tarde');
  console.log('Lara:', r3);

  console.log('Severino: "Sou o Severino"');
  r3 = await sofia.processMessage(phone3, 'Sou o Severino');
  console.log('Lara:', r3);

  console.log('Severino: "Não tenho advogado não"');
  r3 = await sofia.processMessage(phone3, 'Não tenho advogado não');
  console.log('Lara:', r3);

  console.log('Severino: "Tenho 67 anos de idade"');
  r3 = await sofia.processMessage(phone3, 'Tenho 67 anos de idade');
  console.log('Lara:', r3);

  console.log('Severino: "Não consigo trabalhar, sou idoso e tenho dores no corpo"');
  r3 = await sofia.processMessage(phone3, 'Não consigo trabalhar, sou idoso e tenho dores no corpo');
  console.log('Lara:', r3);

  console.log('Severino: "Não, nunca paguei INSS e não estou contribuindo"');
  r3 = await sofia.processMessage(phone3, 'Não, nunca paguei INSS e não estou contribuindo');
  console.log('Lara:', r3);

  console.log('Severino: "Moro eu e minha esposa"');
  r3 = await sofia.processMessage(phone3, 'Moro eu e minha esposa');
  console.log('Lara:', r3);

  console.log('Severino: "Apenas ela recebe um salário de aposentadoria dela"');
  r3 = await sofia.processMessage(phone3, 'Apenas ela recebe um salário de aposentadoria dela');
  console.log('Lara:', r3);

  console.log('Severino: "A casa é nossa"');
  r3 = await sofia.processMessage(phone3, 'A casa é nossa');
  console.log('Lara:', r3);

  console.log('Severino: "Sim, temos cadúnico atualizado"');
  r3 = await sofia.processMessage(phone3, 'Sim, temos cadúnico atualizado');
  console.log('Lara:', r3);

  const { data: d3 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone3).single();
  console.log(`\n➡️ Resultado Funil 3 - FSM State: ${d3?.user_data?.state_fsm} | Fluxo Ativo: ${d3?.user_data?.fluxo_ativo}`);
  await supabase.from('sofia_sessions').delete().eq('phone', phone3);

  console.log('\n==========================================');
  console.log('🎉 TODOS OS FUNIS FORAM EXECUTADOS COM SUCESSO!');
  console.log('==========================================');
}

runTestAllFunnels().catch(console.error);

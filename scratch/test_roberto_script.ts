import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-roberto-full-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Limpa antes
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  console.log('\n--- 1. FIRST MESSAGE (GREETING) ---');
  let reply = await sofia.processMessage(phone, 'Boa noite');
  console.log('Bot:', reply);

  console.log('\n--- 2. NAME, AGE, CONTRIBUTION ---');
  reply = await sofia.processMessage(phone, 'Sou o Roberto. Tenho 50 anos e 27 de contribuição.');
  console.log('Bot:', reply);

  console.log('\n--- 3. LAWYER ANSWER (NO) ---');
  reply = await sofia.processMessage(phone, 'Ainda não doutora');
  console.log('Bot:', reply);

  console.log('\n--- 4. WORK ANSWER ---');
  reply = await sofia.processMessage(phone, 'As vezes');
  console.log('Bot:', reply);

  console.log('\n--- 5. DISEASE ANSWER ---');
  reply = await sofia.processMessage(phone, 'Sim Lara sinto muita dor na coluna, tem dia que não consigo andar');
  console.log('Bot:', reply);

  console.log('\n--- 6. CURRENT CONTRIBUTION ANSWER ---');
  reply = await sofia.processMessage(phone, 'Não estou há exatamente 3 meses sem contribuir');
  console.log('Bot:', reply);

  console.log('\n--- 7. WORK HISTORY ANSWER ---');
  reply = await sofia.processMessage(phone, 'Sempre trabalhei de carteira assinada');
  console.log('Bot:', reply);

  console.log('\n--- 8. SPECIAL / RURAL WORK ANSWER ---');
  reply = await sofia.processMessage(phone, 'Não, nunca trabalhei na roça nem com ruído ou produto químico');
  console.log('Bot:', reply);

  console.log('\n--- 9. OTHER PERIODS (PUBLIC, MILITARY, TECH) ANSWER ---');
  reply = await sofia.processMessage(phone, 'Não, nunca trabalhei no serviço público nem no exército');
  console.log('Bot:', reply);

  console.log('\n--- 10. FOLLOW UP MESSAGE AFTER FINISHED STATE ---');
  reply = await sofia.processMessage(phone, 'Obrigado!');
  console.log('Bot:', reply);

  console.log('\n--- 11. FINAL STATE VERIFICATION ---');
  const { data } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`Estado final da FSM no banco: ${data?.user_data?.state_fsm}`);
  console.log(`Dados completos da triagem: ${JSON.stringify(data?.user_data || {}, null, 2)}`);

  // Limpa depois
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  console.log('\n--- TESTE COMPLETO FINALIZADO COM SUCESSO ---');
}

runTest().catch(console.error);

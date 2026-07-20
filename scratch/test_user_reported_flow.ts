import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const engine = new SofiaEngine();
  const phone = 'test-joaquina-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  const m1 = "Deixa eu te dizer, bom dia. Tá aparecendo uma lei nova aí, passando pelo Congresso, negócio de 15 anos, 20 anos e sei lá mais quantos. Eu tenho 57 anos, 15 anos de INSS pago, né, deve ter um pouco mais. Eu acho que já posso me aposentar pelo INSS, certo? Porque pegar o LOAS é arriscado. Eu não quero saber de, de como, é... Não, Deus me livre disso. A gente não pode entrar num negócio pra perder, tem que ganhar, é... entrar numa coisa pra ganhar, saca? Acha, me roubar um dinheiro dos rapazes especiais, tá ficando maluco? Não, BPC LOAS é, eu acho que é cilada. Nossa Senhora! Porque aí, você falando, se o benefício for cortado, entra na justiça. As contas não esperam por ninguém, né?";
  console.log(`\n--- MESSAGE 1: ---`);
  console.log(`👤 Client: ${m1}`);
  let reply = await engine.processMessage(phone, m1);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s1 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M1:`, JSON.stringify(s1?.user_data, null, 2));

  const m2 = "MEU NOME É JOAQUINA";
  console.log(`\n--- MESSAGE 2: ---`);
  console.log(`👤 Client: ${m2}`);
  reply = await engine.processMessage(phone, m2);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s2 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M2:`, JSON.stringify(s2?.user_data, null, 2));

  const m3 = "AINDA NÃO ESTOU PROCURANDO UM , VIM PELO ANÚNCIO";
  console.log(`\n--- MESSAGE 3: ---`);
  console.log(`👤 Client: ${m3}`);
  reply = await engine.processMessage(phone, m3);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s3 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M3:`, JSON.stringify(s3?.user_data, null, 2));

  const m4 = "TENHO SINDROME DO TUNEL DO CARPO NÃO CONSIGO TRABALHAR TODOS OS DIAS";
  console.log(`\n--- MESSAGE 4: ---`);
  console.log(`👤 Client: ${m4}`);
  reply = await engine.processMessage(phone, m4);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s4 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M4:`, JSON.stringify(s4?.user_data, null, 2));

  const m5 = "NUNCA PAREI";
  console.log(`\n--- MESSAGE 5: ---`);
  console.log(`👤 Client: ${m5}`);
  reply = await engine.processMessage(phone, m5);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s5 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M5:`, JSON.stringify(s5?.user_data, null, 2));

  const m6 = "NÃO";
  console.log(`\n--- MESSAGE 6: ---`);
  console.log(`👤 Client: ${m6}`);
  reply = await engine.processMessage(phone, m6);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s6 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M6:`, JSON.stringify(s6?.user_data, null, 2));

  const m7 = "CARTEIRA";
  console.log(`\n--- MESSAGE 7: ---`);
  console.log(`👤 Client: ${m7}`);
  reply = await engine.processMessage(phone, m7);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s7 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M7:`, JSON.stringify(s7?.user_data, null, 2));

  const m8 = "COM SEU CU PIRANHA";
  console.log(`\n--- MESSAGE 8 (AGGRESSIVE): ---`);
  console.log(`👤 Client: ${m8}`);
  reply = await engine.processMessage(phone, m8);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s8 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M8:`, JSON.stringify(s8?.user_data, null, 2));

  const m9 = "Sim, sempre trabalhei com carteira assinada.";
  console.log(`\n--- MESSAGE 9 (RECOVERY): ---`);
  console.log(`👤 Client: ${m9}`);
  reply = await engine.processMessage(phone, m9);
  console.log(`🤖 Lara: ${reply}`);
  let { data: s9 } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log(`User Data after M9:`, JSON.stringify(s9?.user_data, null, 2));

  const { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
  console.log("\n=== FINAL STATE ===");
  console.log("FSM State:", session?.user_data?.state_fsm);
  console.log("Fluxo Ativo:", session?.user_data?.fluxo_ativo);
  console.log("User Data:", JSON.stringify(session?.user_data, null, 2));

  await supabase.from('sofia_sessions').delete().eq('phone', phone);
}

run().catch(console.error);

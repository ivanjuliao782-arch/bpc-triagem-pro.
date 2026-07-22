import { SofiaEngine } from './src/sofia';
import * as dotenv from 'dotenv';
dotenv.config();

async function runDraTest() {
  console.log("🎬 INICIANDO TESTE DO CENÁRIO 'DOUTORA'...");
  const engine = new SofiaEngine();
  
  // Caso 1: Usuário manda apenas "oi doutora" (comprimento curto mas chama de doutora)
  const phone1 = `test_dra_1_${Date.now()}`;
  await engine['supabase'].from('sofia_sessions').delete().eq('phone', phone1);
  console.log("\n--- TESTE 1: Cliente diz 'oi doutora' ---");
  const reply1 = await engine.processMessage(phone1, "oi doutora");
  console.log(`👤 CLIENTE: "oi doutora"`);
  console.log(`🤖 LARA: "${reply1}"`);

  // Caso 2: Usuário manda desabafo completo chamando de doutora na abertura
  const phone2 = `test_dra_2_${Date.now()}`;
  await engine['supabase'].from('sofia_sessions').delete().eq('phone', phone2);
  console.log("\n--- TESTE 2: Cliente manda desabafo chamando de doutora ---");
  const reply2 = await engine.processMessage(phone2, "Oi doutora, meu nome é Rosana, meu marido faleceu e eu queria ver se consigo receber a pensão.");
  console.log(`👤 CLIENTE: "Oi doutora, meu nome é Rosana, meu marido faleceu..."`);
  console.log(`🤖 LARA: "${reply2}"`);
}

runDraTest().catch(console.error);

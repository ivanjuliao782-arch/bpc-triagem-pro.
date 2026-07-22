import { SofiaEngine } from '../src/sofia';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const engine = new SofiaEngine();
  
  // ==================== TESTE 1: ÁUDIO DE CASO SEM NOME ====================
  const phone1 = 'test_combo_flow_audio_99991';
  await (engine as any).supabase.from('sofia_sessions').delete().eq('phone', phone1);

  const audioText = "Então, o que acontece? É porque... Nossa, tem uma voz tão fina. Eu estava falando com um rapaz com uma voz mais grossa. O que acontece? É que o BBC Louros está para cortar, né? Está tendo uma coisa de doida, esse negócio do Lula aí. BBC, eu estou até com medo do deles, que foi pro juiz. Imagina, né?";

  console.log("\n=== TESTE 1: ÁUDIO COM DÚVIDA DO CASO (SEM SE IDENTIFICAR) ===");
  console.log(`👤 CLIENTE: "${audioText}"`);
  
  const reply1 = await engine.processMessage(phone1, audioText);
  console.log(`🤖 LARA: "${reply1}"`);
  
  // ==================== TESTE 2: TEXTO DE VIÚVA SEM NOME ====================
  const phone2 = 'test_combo_flow_text_99992';
  await (engine as any).supabase.from('sofia_sessions').delete().eq('phone', phone2);

  const textInput = "Boa tarde, meu marido faleceu há duas semanas e estou muito perdida sem saber o que fazer com as contas de casa.";

  console.log("\n=== TESTE 2: TEXTO DE LUTOSEM NOME (ENTRADA) ===");
  console.log(`👤 CLIENTE: "${textInput}"`);
  
  const reply2 = await engine.processMessage(phone2, textInput);
  console.log(`🤖 LARA: "${reply2}"`);
  console.log("\n==============================================");
}

run();

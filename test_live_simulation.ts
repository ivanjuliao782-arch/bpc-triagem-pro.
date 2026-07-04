import { SofiaEngine } from './src/sofia';
import * as dotenv from 'dotenv';
dotenv.config();

async function runLiveSimulation() {
  console.log("🎬 INICIANDO SIMULAÇÃO DE TRIAGEM CONVERSACIONAL...");
  const engine = new SofiaEngine();
  const phone = `sim_live_${Date.now()}`;

  // Limpa sessão anterior
  await engine['supabase'].from('sofia_sessions').delete().eq('phone', phone);

  const turns = [
    {
      input: "Oi, tudo bem? Meu nome é Sandra. Estou desesperada pq ando com muita dor na coluna e não consigo mais trabalhar de jeito nenhum.",
      label: "Turno 1: Saudação inicial + Desabafo de dor"
    },
    {
      input: "não tenho nenhum advogado não, estou tentando resolver isso sozinha",
      label: "Turno 2: Pergunta do advogado"
    },
    {
      input: "Tenho 59 anos de idade",
      label: "Turno 3: Pergunta de idade"
    },
    {
      input: "Não estou conseguindo trabalhar de nada, fico só em casa sentindo dor",
      label: "Turno 4: Pergunta de trabalho"
    },
    {
      input: "Já trabalhei sim de carteira assinada, acho que tenho uns 15 anos de contribuição pagos",
      label: "Turno 5: Pergunta de contribuição"
    }
  ];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    console.log(`\n========================================`);
    console.log(`👤 CLIENTE (${turn.label}):`);
    console.log(`> "${turn.input}"`);
    console.log(`----------------------------------------`);
    
    const reply = await engine.processMessage(phone, turn.input);
    
    console.log(`🤖 LARA (Resposta):`);
    console.log(`> "${reply}"`);
  }
  
  console.log(`========================================\n`);
  console.log("🏁 FIM DA SIMULAÇÃO.");
}

runLiveSimulation().catch(console.error);


import { SofiaEngine } from './sofia';

async function testBrain() {
  const sofia = new SofiaEngine();
  console.log("--- TESTE DE CÉREBRO INICIADO ---\n");

  const p1 = await sofia.processMessage('teste-123', 'Oi, tudo bem? Queria saber sobre o BPC');
  console.log("Sofia:", p1);

  const p2 = await sofia.processMessage('teste-123', 'Meu nome é João e tenho 72 anos');
  console.log("Sofia:", p2);

  const p3 = await sofia.processMessage('teste-123', 'Moro com minha esposa, a gente ganha 500 reais por mês');
  console.log("Sofia:", p3);

  const p4 = await sofia.processMessage('teste-123', 'Não recebemos nada do governo');
  console.log("Sofia:", p4);

  console.log("\n--- TESTE FINALIZADO ---");
}

testBrain();

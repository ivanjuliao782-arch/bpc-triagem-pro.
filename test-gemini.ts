import { SofiaEngine } from './src/sofia';

async function test() {
  const sofia = new SofiaEngine();
  console.log("Enviando 1ª mensagem: 'Oi, quero ajuda'");
  const reply1 = await sofia.processMessage('5511999999999', 'Oi, quero ajuda');
  console.log("Sofia respondeu:", reply1);

  console.log("\nEnviando 2ª mensagem: 'Meu nome é João'");
  const reply2 = await sofia.processMessage('5511999999999', 'Meu nome é João');
  console.log("Sofia respondeu:", reply2);
}

test();

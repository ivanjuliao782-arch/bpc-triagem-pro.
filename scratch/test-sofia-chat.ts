
import { SofiaEngine } from '../src/sofia';
import readline from 'readline';

const sofia = new SofiaEngine();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const testPhone = '5511999999999';

async function chat() {
  console.log('--- SIMULADOR DE CHAT DA SOFIA ---');
  console.log('Digite sua mensagem para a Sofia (ou "sair" para encerrar):');

  const ask = () => {
    rl.question('Você: ', async (answer) => {
      if (answer.toLowerCase() === 'sair') {
        rl.close();
        return;
      }

      console.log('Sofia processando...');
      const reply = await sofia.processMessage(testPhone, answer);
      console.log(`Sofia: ${reply}`);
      ask();
    });
  };

  ask();
}

chat();

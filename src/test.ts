import { SofiaEngine } from './sofia';

async function runTest() {
  const engine = new SofiaEngine();
  const phone = '5511999999999';

  console.log('--- INICIANDO TESTE DA SOFIA (NOVO AMBIENTE) ---');
  
  const steps = [
    'Oi', 
    'Gabriel',                
    '70',                     
    'Ganho 300 reais', 
    'Não',        
    'Tenho sim'               
  ];

  for (const msg of steps) {
    console.log(`\nUsuário: ${msg}`);
    try {
      const response = await engine.processMessage(phone, msg);
      console.log(`Sofia: ${response}`);
    } catch (e: any) {
      console.log('Erro de Execução:', e.message);
      break;
    }
  }
}

runTest();

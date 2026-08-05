import fs from 'fs';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\tasks\\task-3501.log';

function showLeadHistory(phone: string) {
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist');
    return;
  }
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  console.log(`=== HISTORY FOR LEAD ${phone} ===`);
  for (const line of lines) {
    if (line.includes(`Lead: ${phone}`) && (line.includes('1. Mensagem recebida') || line.includes('9. Resposta final') || line.includes('4. Dados extraídos') || line.includes('5. Estado calculado') || line.includes('FSM='))) {
      console.log(line);
    }
  }
}

showLeadHistory('553299083661');
showLeadHistory('553284451653');

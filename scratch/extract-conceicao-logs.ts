import * as fs from 'fs';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\646360d3-098e-40f9-93d8-fca88c80f9c0\\.system_generated\\tasks\\task-1317.log';
const phone = '553288746642';

function run() {
  if (!fs.existsSync(logPath)) {
    console.log(`Log file not found at ${logPath}`);
    return;
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`--- Extracting Lara logs for Conceição (${phone}) ---`);
  
  let currentGroup: string[] = [];
  let lastTimestamp = '';
  
  for (const line of lines) {
    if (line.includes(phone)) {
      // Find timestamp if any
      const matchTime = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      if (matchTime) {
        lastTimestamp = matchTime[1];
      }
      
      // Clean prefix if any
      let cleanLine = line;
      // Strip things like "[123] " prefix from task-324 output, though here we read raw file
      currentGroup.push(line);
    } else {
      // If we had a group, check if it's been completed and print
      if (currentGroup.length > 0) {
        console.log(`\n==================================================`);
        console.log(`⏰ Timestamp: ${lastTimestamp}`);
        console.log(`==================================================`);
        for (const g of currentGroup) {
          // Print only clean [INSTRUMENTAÇÃO] lines or response lines
          if (g.includes('[INSTRUMENTAÇÃO]') || g.includes('Lara processando') || g.includes('Mensagem recebida') || g.includes('Resposta final') || g.includes('Dados extraídos') || g.includes('Payload enviado')) {
            console.log(g.trim());
          }
        }
        currentGroup = [];
      }
    }
  }
}

run();

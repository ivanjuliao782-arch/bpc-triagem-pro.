import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\tasks\\task-2211.log';

function readElisangela() {
  if (!fs.existsSync(logPath)) {
    console.error('task-2211.log not found');
    return;
  }
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  let matches = [];
  for (const line of lines) {
    if (line.includes('9105-5601') || line.includes('553291055601')) {
      matches.push(line);
    }
  }
  
  console.log(`Found ${matches.length} lines.`);
  for (const match of matches) {
    console.log('--- LINE ---');
    console.log(match.substring(0, 3000));
  }
}

readElisangela();

import fs from 'fs';
import path from 'path';

const logsDir = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\tasks';

function searchGeovanirLogs() {
  console.log('Searching all task log files for Geovanir\'s phone...');
  const files = fs.readdirSync(logsDir);
  for (const file of files) {
    if (file.endsWith('.log')) {
      const filePath = path.join(logsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('5532933006762')) {
        console.log(`=== MATCH IN FILE: ${file} ===`);
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes('5532933006762') || line.includes('Geovanir') || line.includes('geovanir')) {
            console.log(line);
          }
        }
      }
    }
  }
}

searchGeovanirLogs();

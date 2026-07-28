import * as fs from 'fs';
import * as path from 'path';

const query = '553288746642';

function searchRecursive(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      continue;
    }
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchRecursive(filePath);
      }
    } else {
      if (filePath.endsWith('.log') || filePath.endsWith('.txt') || filePath.endsWith('.jsonl')) {
        let content = '';
        try {
          content = fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
          continue;
        }
        if (content.includes(query)) {
          console.log(`FOUND QUERY IN FILE: ${filePath}`);
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(query)) {
              console.log(`Line ${i + 1}: ${lines[i]}`);
              const start = Math.max(0, i - 10);
              const end = Math.min(lines.length - 1, i + 30);
              console.log('--- SURROUNDING LINES ---');
              for (let j = start; j <= end; j++) {
                console.log(`[${j + 1}] ${lines[j]}`);
              }
              console.log('-------------------------');
            }
          }
        }
      }
    }
  }
}

console.log('Searching in bpc-triagem-pro...');
searchRecursive('C:\\Users\\gabri\\Downloads\\bpc-triagem-pro');

console.log('Searching in gemini brain...');
searchRecursive('C:\\Users\\gabri\\.gemini\\antigravity\\brain');

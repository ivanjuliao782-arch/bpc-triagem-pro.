import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\tasks\\task-1727.log';

function readFullMichel() {
  if (!fs.existsSync(logPath)) {
    console.error('task-1727.log not found');
    return;
  }
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  // Find lines containing both 553284233201 and updates
  let lastUpdatesLine = '';
  for (const line of lines) {
    if (line.includes('553284233201') && line.includes('updates=')) {
      lastUpdatesLine = line;
    }
  }
  
  if (lastUpdatesLine) {
    console.log('--- FOUND LAST UPDATES LINE ---');
    console.log(lastUpdatesLine.substring(0, 4000));
  } else {
    console.log('No updates line found for Michel');
  }
}

readFullMichel();

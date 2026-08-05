import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\tasks\\task-1727.log';

function readBotLog() {
  if (!fs.existsSync(logPath)) {
    console.error('task-1727.log not found');
    return;
  }
  const content = fs.readFileSync(logPath, 'utf8');
  console.log(`Log file size: ${content.length}`);
  
  // Find lines with Michel history or payload updates
  const matches = content.match(/updates=\{[^}]*history[^}]*\}/g);
  if (matches) {
    console.log(`Found ${matches.length} history payloads.`);
    // Print the last one (which contains the full history)
    console.log(matches[matches.length - 1]);
  } else {
    console.log('No history payload matches found.');
    // Let's print any payload containing "Michel"
    const michelMatches = content.match(/"nome_usuario":"Michel"[^]*?\}/g);
    if (michelMatches) {
      console.log('Found michel data match:', michelMatches[michelMatches.length - 1]);
    }
  }
}

readBotLog();

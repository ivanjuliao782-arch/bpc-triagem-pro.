import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\logs\\transcript.jsonl';

function readTranscript() {
  if (!fs.existsSync(logPath)) {
    console.error('transcript.jsonl not found');
    return;
  }
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  console.log(`Total lines: ${lines.length}`);
  let count = 0;
  for (const line of lines) {
    if (line.includes('553284233201') && !line.includes('readTranscript') && !line.includes('CodeContent')) {
      console.log(`--- MATCH ${count} ---`);
      // Print the line content
      if (line.length > 2000) {
        console.log(line.substring(0, 2000) + '... (TRUNCATED)');
      } else {
        console.log(line);
      }
      count++;
      if (count > 20) break;
    }
  }
}

readTranscript();

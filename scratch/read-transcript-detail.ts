import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\logs\\transcript.jsonl';

function readTranscriptDetail() {
  if (!fs.existsSync(logPath)) {
    console.error('transcript.jsonl not found');
    return;
  }
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  
  for (const line of lines) {
    if (line.includes('"step_index":')) {
      const match = line.match(/"step_index":(\d+)/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx >= 1840 && idx <= 1846) {
          console.log(`--- STEP ${idx} ---`);
          if (line.length > 2000) {
            console.log(line.substring(0, 2000) + '... (TRUNCATED)');
          } else {
            console.log(line);
          }
        }
      }
    }
  }
}

readTranscriptDetail();

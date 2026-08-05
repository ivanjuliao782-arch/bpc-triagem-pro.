import fs from 'fs';
import path from 'path';

const transcriptPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\6802d5ea-6d5e-4392-a448-d7f35a8d16aa\\.system_generated\\logs\\transcript.jsonl';

function searchTranscript() {
  if (!fs.existsSync(transcriptPath)) {
    console.log('Transcript file does not exist.');
    return;
  }
  
  console.log('Searching transcript for project name references...');
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.toLowerCase().includes('project') || line.toLowerCase().includes('dashboard') || line.includes('fygzdhkxvgsarihbppkq')) {
      // Print first 300 characters of matching line to avoid huge output
      console.log(line.substring(0, 300));
    }
  }
}

searchTranscript();

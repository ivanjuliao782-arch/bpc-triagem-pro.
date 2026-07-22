import * as fs from 'fs';
import * as readline from 'readline';

async function parse() {
  const filePath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\c5582d6d-68e2-4022-8d6f-1ad09cba7bea\\.system_generated\\logs\\transcript_full.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('"step_index":1509') || line.includes('"step_index":1510')) {
      console.log(line);
    }
  }
}

parse().catch(console.error);

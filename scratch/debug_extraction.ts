import { SofiaEngine } from '../src/sofia';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const engine = new SofiaEngine();
  const text = "TENHO SINDROME DO TUNEL DO CARPO NÃO CONSIGO TRABALHAR TODOS OS DIAS";
  const state = "AWAITING_CURRENT_CONTRIBUTION";
  
  console.log(`Extracting for: "${text}" with state "${state}"`);
  const result = await engine.runHybridExtraction(text, state);
  console.log("Extraction Result:", JSON.stringify(result, null, 2));
}

run().catch(console.error);

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function testGemini() {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  for (const modelName of models) {
    try {
      console.log(`🤖 Testando modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Oi, tudo bem?");
      console.log(`✅ Sucesso com ${modelName}:`, result.response.text());
      return;
    } catch (e: any) {
      console.error(`❌ Falhou com ${modelName}:`, e.message);
    }
  }
}

testGemini();

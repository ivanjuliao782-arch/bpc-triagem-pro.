import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

dotenv.config();

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY não encontrada no .env");
    return;
  }
  
  console.log("Chave de API encontrada. Testando modelos...");

  const modelsToTest = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTesting model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Olá! Responda apenas com a palavra 'OK' se você estiver funcionando.");
      console.log(`✅ Model ${modelName} responded:`, result.response.text().trim());
    } catch (err: any) {
      console.error(`❌ Model ${modelName} failed:`, err.message);
    }
  }
}

testModels();

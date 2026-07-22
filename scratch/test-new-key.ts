import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

const newApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(newApiKey);

async function testKey() {
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
  
  for (const modelName of models) {
    try {
      console.log(`🤖 Testando modelo ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1" });
      const result = await model.generateContent("Olá! Responda apenas com a palavra 'OK'.");
      const text = result.response.text();
      console.log(`✅ Sucesso com ${modelName}: "${text.trim()}"`);
      return; // Se um funcionar, a chave é válida!
    } catch (err: any) {
      console.error(`❌ Erro com ${modelName}:`, err.message);
    }
  }
}

testKey();

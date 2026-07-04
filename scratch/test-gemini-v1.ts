import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

dotenv.config();

async function testGeminiV1() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY não encontrada no .env");
    return;
  }

  console.log("Forçando o SDK a usar o endpoint estável (v1) do Gemini...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Forçamos apiVersion como "v1" nas RequestOptions (segundo argumento)
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: "v1" }
    );

    console.log("Enviando mensagem de teste: 'Olá, você está funcionando?'");
    const result = await model.generateContent("Olá, você está funcionando? Responda em português.");
    
    console.log("\n✅ RESPOSTA DO GEMINI (v1):");
    console.log(result.response.text().trim());
  } catch (err: any) {
    console.error("\n❌ Falha ao conectar no Gemini (v1):", err.message);
  }
}

testGeminiV1();

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

dotenv.config();

async function testNewerModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey!);

  const models = ["gemini-2.0-flash", "gemini-2.5-flash"];

  for (const m of models) {
    try {
      console.log(`Testando modelo mais novo: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m }, { apiVersion: "v1" });
      const res = await model.generateContent("Oi, responda apenas com a palavra 'OK'.");
      console.log(`✅ O modelo ${m} respondeu: ${res.response.text().trim()}`);
      return;
    } catch (err: any) {
      console.log(`❌ O modelo ${m} falhou: ${err.message}`);
    }
  }
}

testNewerModels();

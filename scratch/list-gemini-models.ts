import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

const newApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(newApiKey);

async function listModels() {
  try {
    console.log("🤖 Listando modelos disponíveis no Gemini v1...");
    // @ts-ignore
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${newApiKey}`);
    const data = await response.json();
    console.log("Modelos retornados:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("❌ Erro ao listar modelos:", err.message);
  }
}

listModels();

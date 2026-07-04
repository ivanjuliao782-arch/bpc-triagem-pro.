import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("❌ GROQ_API_KEY não encontrada no .env");
    return;
  }

  console.log("Chave do Groq encontrada. Testando modelos...");
  const groq = new Groq({ apiKey });

  const modelsToTest = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama3-70b-8192"];

  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTestando modelo Groq: ${modelName}...`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'user', content: 'Olá! Responda apenas com "OK" se você estiver funcionando.' }
        ],
        model: modelName,
      });
      console.log(`✅ Modelo ${modelName} respondeu:`, chatCompletion.choices[0]?.message?.content?.trim());
    } catch (err: any) {
      console.error(`❌ Modelo ${modelName} falhou:`, err.message);
    }
  }
}

testGroq();

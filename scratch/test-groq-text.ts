import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testGroqText() {
  try {
    console.log("🤖 Testando chat completion via Groq...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: "Olá! Responda apenas com a palavra 'FUNCIONOU'." }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });
    console.log("✅ Resposta do Groq:", chatCompletion.choices[0]?.message?.content);
  } catch (error: any) {
    console.error("❌ Erro no Groq:", error.message);
  }
}

testGroqText();

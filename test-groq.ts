import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function quickTest() {
  console.log("--- TESTANDO GROQ ---");
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Você é a Sofia, assistente de triagem BPC. Seja empática, curta e direta.' },
        { role: 'user', content: 'Oi, tudo bem?' }
      ],
      model: 'llama3-70b-8192',
      temperature: 0.3
    });
    console.log("Groq respondeu:", completion.choices[0].message.content);
  } catch (error: any) {
    console.error("Erro na Groq:", error.message);
  }
}

quickTest();

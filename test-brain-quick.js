
const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function quickTest() {
  console.log("--- TESTANDO INTELIGÊNCIA DA SOFIA ---\n");
  
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Você é a Sofia, assistente de triagem BPC. Seja empática, curta e direta (máx 3 linhas).' },
      { role: 'user', content: 'Oi, sou o João, tenho 70 anos e moro sozinho com 400 reais por mês. Posso receber o BPC?' }
    ],
    model: 'llama3-70b-8192',
    temperature: 0.3
  });

  console.log("Sofia respondeu:");
  console.log(completion.choices[0].message.content);
  console.log("\n--- TESTE FINALIZADO ---");
}

quickTest();

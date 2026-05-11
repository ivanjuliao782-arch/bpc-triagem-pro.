
import express from 'express';
import { SofiaEngine } from './src/sofia';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const sofia = new SofiaEngine();

app.post('/webhook', async (req, res) => {
  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  
  if (message) {
    const phone = message.from;
    const content = message.text?.body || "Mensagem recebida";
    console.log(`Mensagem de ${phone}: ${content}`);
    
    const reply = await sofia.processMessage(phone, content);
    console.log(`Sofia respondeu: ${reply}`);
  }
  
  res.status(200).send('EVENT_RECEIVED');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Agente Sofia LIGADO na porta ${PORT}`);
  console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
});

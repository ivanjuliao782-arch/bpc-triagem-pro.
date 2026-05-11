
import { VercelRequest, VercelResponse } from '@vercel/node';
import { SofiaEngine } from '../src/sofia';

const sofia = new SofiaEngine();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Verificação de Webhook (padrão Meta/WhatsApp)
    return res.status(200).send(req.query['hub.challenge']);
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }

    // Processar mensagem no motor da Sofia
    const reply = await sofia.processMessage(phone, message);

    // Enviar resposta (Aqui você integraria com a API do WhatsApp, ex: Twilio ou Meta Cloud API)
    console.log(`[WhatsApp Outbound] Para: ${phone} | Msg: ${reply}`);

    return res.status(200).json({ 
      success: true, 
      reply,
      timestamp: new Date().toISOString() 
    });

  } catch (error: any) {
    console.error('[Sofia Error]', error);
    return res.status(500).json({ 
      error: 'Erro interno no processamento',
      details: error.message 
    });
  }
}


import { VercelRequest, VercelResponse } from '@vercel/node';
import { SofiaEngine } from '../src/sofia';

const sofia = new SofiaEngine();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { message, phone } = req.body;
    const reply = await sofia.processMessage(phone, message);
    return res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao processar' });
  }
}

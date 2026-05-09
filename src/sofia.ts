
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

export class SofiaEngine {
  private supabase;
  private groq;

  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  // Novo: Método para transcrever áudio
  async transcribeAudio(audioBuffer: Buffer) {
    try {
      const transcription = await this.groq.audio.transcriptions.create({
        file: await Groq.toFile(audioBuffer, 'audio.ogg'),
        model: 'whisper-large-v3',
        language: 'pt'
      });
      return transcription.text;
    } catch (error) {
      console.error('Erro na transcrição:', error);
      return null;
    }
  }

  async processMessage(phone: string, input: string | Buffer) {
    let text = typeof input === 'string' ? input : await this.transcribeAudio(input);
    
    if (!text) return "Desculpe, não consegui entender o seu áudio. Pode repetir ou digitar? 🎙️";

    const { data: session } = await this.supabase.from('sofia_sessions').select('*').eq('phone', phone).single();

    if (!session) return this.startSession(phone);

    // Inteligência: Usar o Llama 3 para entender intenções complexas
    return this.handleStepWithAI(session, text);
  }

  private async handleStepWithAI(session: any, text: string) {
    const { step, user_data } = session;

    // Prompt base para manter a Sofia na linha
    const systemPrompt = `Você é a Sofia, assistente virtual de triagem BPC/LOAS. 
    Regras: Máximo 3 linhas, 1 emoji, tom empático, nunca prometa o benefício.
    Passo atual: ${step}. Dados já coletados: ${JSON.stringify(user_data)}.`;

    const chatCompletion = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      model: 'llama3-70b-8192',
      temperature: 0.3,
      max_tokens: 300
    });

    const reply = chatCompletion.choices[0].message.content;
    
    // Lógica de atualização de estado no Supabase (Baseada na resposta da IA)
    await this.updateInternalState(session.phone, step, text, reply);

    return reply;
  }

  private async updateInternalState(phone: string, currentStep: string, userInput: string, aiReply: string) {
    // Aqui implementamos a lógica de transição de passos baseada na conversa
    // Por simplicidade agora, apenas atualizamos a última interação
    await this.supabase.from('sofia_sessions').update({
      last_interaction: new Date().toISOString()
    }).eq('phone', phone);
  }

  private async startSession(phone: string) {
    await this.supabase.from('sofia_sessions').insert([{ phone }]);
    return "Olá! Sou a Sofia, assistente virtual da [EMPRESA]. Vou te ajudar com o BPC/LOAS. Qual seu nome? 😊";
  }
}

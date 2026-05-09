import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const MAX_LINES = 3;
const INCOME_LIMIT = 353;
const MIN_AGE = 65;

export class SofiaEngine {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async processMessage(phone: string, text: string) {
    const { data: session, error } = await this.supabase
      .from('sofia_sessions')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!session) {
      return this.startSession(phone);
    }

    const lastInt = new Date(session.last_interaction).getTime();
    if (Date.now() - lastInt > 5 * 60 * 1000) {
      await this.resetSession(phone);
      return "Olá! Como ficamos um tempo sem conversar, precisei reiniciar nosso atendimento. Qual seu nome? 😊";
    }

    return this.handleStep(session, text);
  }

  private async handleStep(session: any, text: string) {
    const { step, user_data } = session;

    switch (step) {
      case 'welcome':
        return this.updateStep(session.phone, 'age', { name: text }, 
          `Prazer, ${text}! Para começar, quantos anos você tem? 🎂`);
      
      case 'age':
        const age = parseInt(text);
        if (isNaN(age) || age < MIN_AGE) {
          return this.terminate(session.phone, 'Idade insuficiente', 
            `Entendi. Infelizmente o BPC é para quem tem 65 anos ou mais. Posso ajudar em algo mais?`);
        }
        return this.updateStep(session.phone, 'income', { age }, 
          `Certo. Agora, quantas pessoas moram com você e qual a renda total da casa? 🏠`);

      case 'income':
        // Extração simulada (na real integraria com a LLM aqui)
        const perCapita = 300; 
        
        if (perCapita > INCOME_LIMIT) {
          return this.terminate(session.phone, 'Renda acima', 
            `Entendi. A renda por pessoa ultrapassa o limite de R$ 353. 😔`);
        }
        return this.updateStep(session.phone, 'benefit', { perCapita }, 
          `Perfeito. Você ou alguém da casa já recebe aposentadoria ou pensão? 🔍`);

      case 'benefit':
        if (text.toLowerCase().includes('sim')) {
          return this.terminate(session.phone, 'Benefício ativo', 
            `Compreendo. O BPC não pode ser acumulado com outros benefícios. Obrigado!`);
        }
        return this.updateStep(session.phone, 'docs', { hasBenefit: false }, 
          `Ótimo! Você tem CPF, RG e comprovante de residência em mãos? 📄`);

      case 'docs':
        return this.finalize(session);

      default:
        return "Olá! Como posso te ajudar hoje? 😊";
    }
  }

  private async updateStep(phone: string, nextStep: string, newData: any, message: string) {
    await this.supabase.from('sofia_sessions').update({
      step: nextStep,
      user_data: { ...(newData || {}) },
      last_interaction: new Date().toISOString()
    }).eq('phone', phone);
    return message;
  }

  private async terminate(phone: string, reason: string, message: string) {
    await this.supabase.from('sofia_sessions').delete().eq('phone', phone);
    return message;
  }

  private async finalize(session: any) {
    await this.terminate(session.phone, 'Aprovado', '');
    return `Parabéns! Você tem o perfil para o BPC. Um especialista vai te ligar em breve para os próximos passos. 🚀`;
  }

  private async startSession(phone: string) {
    await this.supabase.from('sofia_sessions').insert([{ phone }]);
    return "Olá! Sou a Sofia, assistente virtual da [EMPRESA]. Vou te ajudar com o BPC/LOAS. Qual seu nome? 😊";
  }

  private async resetSession(phone: string) {
    await this.supabase.from('sofia_sessions').update({
      step: 'welcome',
      user_data: {},
      last_interaction: new Date().toISOString()
    }).eq('phone', phone);
  }
}

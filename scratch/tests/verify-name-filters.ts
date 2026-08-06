import { SofiaEngine } from '../../src/sofia';
import dotenv from 'dotenv';
dotenv.config();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Asserção falhou: ${message}`);
  }
}

async function runTests() {
  console.log('=== TESTANDO VALIDAÇÃO DE NOMES NO FLUXO COMPLETO ===');

  const sofia = new SofiaEngine();

  let activeSession: any = null;
  let savedUserData: any = null;

  // Mock do Supabase
  (sofia as any).supabase = {
    rpc: async (name: string, args: any) => {
      if (name === 'save_session_data') {
        savedUserData = args.p_user_data_updates;
      }
      return { data: args.p_user_data_updates, error: null };
    },
    from: (tableName: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: activeSession, error: null })
        })
      }),
      update: () => ({
        eq: async () => ({ error: null })
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ error: null })
        }),
        eq: () => ({
          single: async () => ({ error: null })
        })
      }),
      delete: () => ({
        eq: async () => ({ error: null })
      })
    })
  };

  // Mock do sendMessageCallback
  let lastSentReply = "";
  const mockSendCallback = async (msg: string) => {
    lastSentReply = msg;
    return true;
  };

  // --- CASO 1: Testar o filtro de "Meu nome é Lara" ---
  console.log('\n--- Teste 1: Responder "Meu nome é Lara" ---');
  
  // Simula que a sessão já está criada e no estado AWAITING_NAME
  const sessionCaso1: any = {
    step: 'welcome',
    phone: '553200000003',
    user_data: {
      state_fsm: 'AWAITING_NAME',
      history: []
    }
  };
  activeSession = sessionCaso1;

  // Mock do runHybridExtraction chamando a higienização de nomes do próprio SofiaEngine
  sofia.runHybridExtraction = async (text, state) => {
    const raw = { nome_usuario: "Lara" };
    return sofia.sanitizeExtractedData(raw, text, state);
  };

  // Processa a mensagem
  const reply1 = await sofia.processMessage(
    sessionCaso1.phone, 
    "Meu nome é Lara", 
    mockSendCallback
  );

  console.log(`Resposta obtida: "${reply1}"`);
  assert(reply1.includes("Que coincidência! Pode me dizer seu nome completo?"), "Deveria ter retornado a resposta de nome proibido");
  console.log('✅ Teste 1 passou!');

  // --- CASO 2: Simular o padrão da Regina e responder "Correto" ---
  console.log('\n--- Teste 2: Padrão Regina (Beneficiário Terceiro) + responder "Correto" ---');

  // Simula que a sessão já está criada com os dados da mãe Regina, e o estado é AWAITING_NAME
  const sessionCaso2: any = {
    step: 'welcome',
    phone: '553200000004',
    user_data: {
      state_fsm: 'AWAITING_NAME',
      beneficiario_terceiro: "mãe",
      idade: 72,
      history: []
    }
  };
  activeSession = sessionCaso2;

  // Mock do runHybridExtraction chamando a higienização de nomes do próprio SofiaEngine
  sofia.runHybridExtraction = async (text, state) => {
    const raw = { nome_usuario: "Correto" };
    return sofia.sanitizeExtractedData(raw, text, state);
  };

  // Processa a mensagem do lead respondendo "Correto"
  const reply2 = await sofia.processMessage(
    sessionCaso2.phone, 
    "Correto", 
    mockSendCallback
  );

  console.log(`Resposta obtida: "${reply2}"`);
  assert(reply2.includes("Não entendi seu nome. Pode me dizer como você se chama?"), "Deveria ter retornado a resposta de nome inválido");
  console.log('✅ Teste 2 passou!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});

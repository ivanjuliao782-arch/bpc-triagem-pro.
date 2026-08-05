import { SofiaEngine } from '../../src/sofia';
import dotenv from 'dotenv';
dotenv.config();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Asserção falhou: ${message}`);
  }
}

async function runFsmTests() {
  console.log('=== RODANDO TESTES DE TRANSIÇÃO DE ESTADOS (FSM) ===');

  const sofia = new SofiaEngine();

  // --- 1. TESTES PURES DE resolveFSMState ---
  console.log('\n--- 1. Testes de resolveFSMState (Mudanças de Estado) ---');

  // Caso 1: Vazio -> AWAITING_NAME
  let res = sofia.resolveFSMState({});
  console.log(`Estado inicial vazio -> Esperado: "AWAITING_NAME", Obtido: "${res.state}"`);
  assert(res.state === 'AWAITING_NAME', 'Deveria iniciar em AWAITING_NAME');

  // Caso 2: Nome preenchido -> AWAITING_LAWYER
  res = sofia.resolveFSMState({ nome_usuario: "Leandro" });
  console.log(`Com nome_usuario -> Esperado: "AWAITING_LAWYER", Obtido: "${res.state}"`);
  assert(res.state === 'AWAITING_LAWYER', 'Deveria ir para AWAITING_LAWYER');

  // Caso 3: Nome + Advogado (Não) -> AWAITING_AGE
  res = sofia.resolveFSMState({ nome_usuario: "Leandro", has_lawyer: false });
  console.log(`Nome + has_lawyer: false -> Esperado: "AWAITING_AGE", Obtido: "${res.state}"`);
  assert(res.state === 'AWAITING_AGE', 'Deveria ir para AWAITING_AGE');

  // Caso 4: Nome + Advogado (Não) + Idade (34) -> AWAITING_TOTAL_CONTRIBUTION (Fluxo INSS/BPC)
  res = sofia.resolveFSMState({ nome_usuario: "Leandro", has_lawyer: false, idade: 34 });
  console.log(`Idade 34 (jovem) -> Esperado: "AWAITING_TOTAL_CONTRIBUTION", Obtido: "${res.state}"`);
  assert(res.state === 'AWAITING_TOTAL_CONTRIBUTION', 'Deveria ir para AWAITING_TOTAL_CONTRIBUTION');

  // Caso 5: Nome + Advogado (Não) + Idade (66) + Carteira (5 anos) -> BPC_AWAITING_HOUSEHOLD (Idoso)
  res = sofia.resolveFSMState({ nome_usuario: "Leandro", has_lawyer: false, idade: 66, inss_tempo_carteira: "5 anos" });
  console.log(`Idade 66 (idoso) + contribuição 5 anos -> Esperado: "BPC_AWAITING_HOUSEHOLD", Obtido: "${res.state}"`);
  assert(res.state === 'BPC_AWAITING_HOUSEHOLD', 'Deveria ir para BPC_AWAITING_HOUSEHOLD');

  console.log('✅ Todos os testes de resolveFSMState passaram!');

  // --- 2. TESTES DE REPETIÇÃO E BYPASS (handleStepWithAI) ---
  console.log('\n--- 2. Testes de Evitação de Loop no Bypass de Deficiência ---');

  // Mock do supabase e openai para rodar sem chamadas de rede reais
  const mockSession: any = {
    step: 'benefit',
    phone: '553200000001',
    user_data: {
      nome_usuario: "Leandro",
      has_lawyer: false,
      idade: 34,
      inss_tempo_carteira: "9 anos",
      esta_contribuindo_atualmente: true,
      tem_doenca_ou_limitacao: true,
      doenca: "Alguma",
      state_fsm: "AWAITING_DISABILITY",
      history: []
    }
  };

  let savedUpdates: any = null;

  (sofia as any).supabase = {
    rpc: async (name: string, args: any) => {
      if (name === 'save_session_data') {
        savedUpdates = args.p_user_data_updates;
      }
      return { data: args.p_user_data_updates, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mockSession, error: null })
        })
      }),
      update: () => ({
        eq: async () => ({ error: null })
      })
    })
  };

  // Turno 1: A FSM está em AWAITING_DISABILITY. O usuário envia uma mensagem inválida (que não extrai deficiência).
  // Espera-se que tentativas_AWAITING_DISABILITY suba para 1.
  console.log('Simulando Turno 1 em AWAITING_DISABILITY...');
  const reply1 = await (sofia as any).handleStepWithAI(mockSession, "Qualquer resposta");
  console.log(`Turno 1: Resposta gerada -> "${reply1}"`);
  console.log(`Turno 1: tentativas_AWAITING_DISABILITY salvas -> ${savedUpdates.tentativas_AWAITING_DISABILITY}`);
  assert(savedUpdates.tentativas_AWAITING_DISABILITY === 1, "Tentativas deveria ser 1");
  assert(savedUpdates.state_fsm === 'AWAITING_DISABILITY', "Deveria permanecer no estado AWAITING_DISABILITY");

  // Turno 2: O usuário envia outra resposta sem dados. A tentativa vai de 1 para 2.
  // Deve estourar o limite, forçar fallback para 'Não' (tem_deficiencia = false) e avançar para o próximo estado.
  console.log('Simulando Turno 2 em AWAITING_DISABILITY...');
  mockSession.user_data = savedUpdates; // Atualiza a sessão com os dados salvos do turno anterior
  
  // Como estamos testando o bypass determinístico e o forceFieldFallback, queremos validar que ele sai de AWAITING_DISABILITY.
  // Para isso, precisamos simular que no Turno 2 o motor avança o estado.
  const reply2 = await (sofia as any).handleStepWithAI(mockSession, "Outra resposta inválida");
  console.log(`Turno 2: Resposta gerada -> "${reply2}"`);
  console.log(`Turno 2: tem_deficiencia forçado -> ${savedUpdates.tem_deficiencia}`);
  console.log(`Turno 2: novo estado calculado -> "${savedUpdates.state_fsm}"`);
  
  assert(savedUpdates.tem_deficiencia === false, "tem_deficiencia deveria ter sido forçado para false");
  assert(savedUpdates.state_fsm !== 'AWAITING_DISABILITY', "Deveria ter saído de AWAITING_DISABILITY");
  assert(savedUpdates.tentativas_AWAITING_DISABILITY === null, "Contador de tentativas deveria ter sido resetado");

  console.log('✅ Testes de evitação de loop de deficiência passaram com sucesso!');
}

runFsmTests().catch(err => {
  console.error(err);
  process.exit(1);
});

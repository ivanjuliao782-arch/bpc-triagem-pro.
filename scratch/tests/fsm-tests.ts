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

  // --- 3. TESTE DE EVITAÇÃO DE AVANÇO EM MENSAGENS OFF-TOPIC ---
  console.log('\n--- 3. Teste de Evitação de Avanço de Estado em Mensagens Off-Topic ---');
  
  let mockSessionOffTopic: any = {
    step: 'income',
    phone: '553200000009',
    user_data: {
      nome_usuario: "Romildo Teste",
      has_lawyer: false,
      idade: 57,
      inss_tempo_carteira: "20 anos",
      esta_contribuindo_atualmente: false,
      tem_doenca_ou_limitacao: true,
      doenca: "hérnia de disco",
      state_fsm: "AWAITING_LAST_CONTRIBUTION_TIME",
      history: []
    }
  };

  // Reseta savedUpdates
  savedUpdates = null;

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
          single: async () => ({ data: mockSessionOffTopic, error: null })
        })
      }),
      update: () => ({
        eq: async () => ({ error: null })
      })
    })
  };

  // Mock de runHybridExtraction para simular retorno de off-topic pelo LLM
  // e o interpretador de código capturando tempo_parou_contribuir verbatim
  const originalRunHybrid = sofia.runHybridExtraction;
  sofia.runHybridExtraction = async (text: string, currentState?: string) => {
    return {
      tempo_parou_contribuir: text.trim(),
      inss_ultima_contribuicao: text.trim(),
      is_off_topic: true
    };
  };

  // Simula a mensagem do lead
  console.log('Processando mensagem off-topic no estado AWAITING_LAST_CONTRIBUTION_TIME...');
  const replyOff = await sofia.processMessage("553200000009", "Eu consigo aposentar");
  
  console.log(`Resposta gerada: "${replyOff?.substring(0, 50)}..."`);
  console.log(`Estado salvo pós-processamento: "${savedUpdates?.state_fsm}"`);
  console.log(`tempo_parou_contribuir salvo: "${savedUpdates?.tempo_parou_contribuir}"`);
  
  // Asserções:
  assert(savedUpdates.state_fsm === 'AWAITING_LAST_CONTRIBUTION_TIME', "FSM não deveria ter avançado para deficiência");
  assert(savedUpdates.tempo_parou_contribuir === undefined || savedUpdates.tempo_parou_contribuir === null, "tempo_parou_contribuir deveria ter sido descartado por ser off-topic");
  
  // Restaura runHybridExtraction
  sofia.runHybridExtraction = originalRunHybrid;
  console.log('✅ Teste de evitação de avanço off-topic passou com sucesso!');
  // --- 4. TESTES DE REGRESSÃO DE BLINDAGEM GLOBAL CONTRA PERGUNTAS ---
  console.log('\n--- 4. Testes de Regressão de Blindagem Global Contra Perguntas ---');

  const runRegressionTest = async (state: string, questionText: string, expectedField: string) => {
    console.log(`Testando pergunta "${questionText}" no estado ${state}...`);
    
    let mockSessionReg: any = {
      step: 'test_step',
      phone: '553200000009',
      user_data: {
        nome_usuario: state === 'AWAITING_NAME' ? null : "Romildo Teste",
        has_lawyer: state === 'AWAITING_LAWYER' ? null : false,
        idade: state === 'AWAITING_AGE' ? null : (state.startsWith('BPC_') ? 66 : 57),
        inss_tempo_carteira: state === 'AWAITING_TOTAL_CONTRIBUTION' ? null : (state.startsWith('BPC_') ? "5 anos" : "20 anos"),
        esta_contribuindo_atualmente: state === 'AWAITING_CURRENT_CONTRIBUTION' ? null : false,
        tem_doenca_ou_limitacao: state === 'AWAITING_DISEASE' ? null : true,
        doenca: state === 'AWAITING_DISEASE' ? null : "hérnia de disco",
        state_fsm: state,
        history: []
      }
    };

    savedUpdates = null;

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
            single: async () => ({ data: mockSessionReg, error: null })
          })
        }),
        update: () => ({
          eq: async () => ({ error: null })
        })
      })
    };

    // Mock de runHybridExtraction para simular que a IA não extrai dados válidos da pergunta
    const originalRunHybrid = sofia.runHybridExtraction;
    sofia.runHybridExtraction = async (text: string, currentState?: string) => {
      return {};
    };

    await sofia.processMessage("553200000009", questionText);

    sofia.runHybridExtraction = originalRunHybrid;

    console.log(`-> FSM State obtido: "${savedUpdates?.state_fsm}"`);
    console.log(`-> Campo ${expectedField} obtido: ${savedUpdates ? JSON.stringify(savedUpdates[expectedField]) : 'N/A'}`);
    
    assert(savedUpdates.state_fsm === state, `FSM deveria permanecer no estado ${state}`);
    assert(savedUpdates[expectedField] === undefined || savedUpdates[expectedField] === null, `Campo ${expectedField} não deveria ser preenchido pela pergunta`);
  };

  // Testando diferentes estados e perguntas
  await runRegressionTest('AWAITING_AGE', 'Eu consigo me aposentar?', 'idade');
  await runRegressionTest('AWAITING_LAST_CONTRIBUTION_TIME', 'Tenho direito?', 'tempo_parou_contribuir');
  await runRegressionTest('AWAITING_LAWYER', 'Quanto custa?', 'has_lawyer');
  await runRegressionTest('BPC_AWAITING_HOUSEHOLD', 'Como funciona?', 'bpc_pessoas_casa');
  await runRegressionTest('AWAITING_NAME', 'Posso receber?', 'nome_usuario');

  // --- 5. TESTE DE RESPOSTA LEGÍTIMA APÓS UMA PERGUNTA ---
  console.log('\n--- 5. Teste de Resposta Legítima Após Uma Pergunta ---');
  let mockSessionSeq: any = {
    step: 'test_step',
    phone: '553200000009',
    user_data: {
      nome_usuario: "Romildo Teste",
      has_lawyer: false,
      idade: null, // Esperando idade
      state_fsm: 'AWAITING_AGE',
      history: []
    }
  };

  savedUpdates = null;

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
          single: async () => ({ data: mockSessionSeq, error: null })
        })
      }),
      update: () => ({
        eq: async () => ({ error: null })
      })
    })
  };

  // 1. Envia pergunta. FSM deve permanecer em AWAITING_AGE
  console.log('Passo 1: Enviando pergunta "Quanto custa?"...');
  sofia.runHybridExtraction = async (text: string, currentState?: string) => {
    return {};
  };
  await sofia.processMessage("553200000009", "Quanto custa?");
  assert(savedUpdates.state_fsm === 'AWAITING_AGE', "FSM deveria estar em AWAITING_AGE");
  assert(savedUpdates.idade === undefined || savedUpdates.idade === null, "Idade não deveria estar preenchida");

  // Atualiza sessão simulada com o estado do passo 1
  mockSessionSeq.user_data = savedUpdates;

  // 2. Envia resposta legítima "Tenho 62 anos". FSM deve avançar
  console.log('Passo 2: Enviando resposta legítima "Tenho 62 anos"...');
  // Restaura runHybridExtraction para que o interpretador de código extraia a idade
  sofia.runHybridExtraction = originalRunHybrid;
  await sofia.processMessage("553200000009", "Tenho 62 anos");
  
  console.log(`-> FSM State final: "${savedUpdates?.state_fsm}"`);
  console.log(`-> Idade extraída: ${savedUpdates?.idade}`);
  assert(savedUpdates.idade === 62, "Idade deveria ter sido extraída como 62");
  assert(savedUpdates.state_fsm !== 'AWAITING_AGE', "FSM deveria ter avançado após resposta legítima");

  // --- 6. TESTE DA SEQUÊNCIA REAL DO ROMILDO (MÚLTIPLAS DÚVIDAS E RESPOSTAS MISTAS) ---
  console.log('\n--- 6. Teste da Sequência Real do Romildo ---');
  let mockRomildoSession: any = {
    step: 'welcome',
    phone: '553298296586',
    user_data: {
      nome_usuario: "Romildo",
      has_lawyer: false,
      idade: 57,
      inss_tempo_carteira: "20 anos",
      esta_contribuindo_atualmente: false,
      tempo_parou_contribuir: "nunca",
      tem_doenca_ou_limitacao: true,
      doenca: "hérnia de disco",
      fluxo_ativo: "APOSENTADORIA",
      state_fsm: 'AWAITING_DISABILITY', // Estado inicial da deficiência
      history: []
    }
  };

  savedUpdates = null;

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
          single: async () => ({ data: mockRomildoSession, error: null })
        })
      }),
      update: () => ({
        eq: async () => ({ error: null })
      })
    })
  };

  // Romildo Turn 1: "Eu recebi um indeferimento o que isso significa?"
  console.log('Romildo Turn 1: Enviando pergunta "Eu recebi um indeferimento o que isso significa?"...');
  sofia.runHybridExtraction = async (text: string, currentState?: string) => {
    return { is_off_topic: true }; // Simula extração de off_topic pela LLM
  };
  let response = await sofia.processMessage("553298296586", "Eu recebi um indeferimento o que isso significa?");
  console.log(`-> Lara Response: "${response}"`);
  console.log(`-> FSM State: "${savedUpdates.state_fsm}"`);
  console.log(`-> Tentativas AWAITING_DISABILITY: ${savedUpdates.tentativas_AWAITING_DISABILITY}`);
  
  assert(savedUpdates.state_fsm === 'AWAITING_DISABILITY', "FSM deveria permanecer em AWAITING_DISABILITY");
  assert(!savedUpdates.tentativas_AWAITING_DISABILITY, "Contador de tentativas de AWAITING_DISABILITY não deveria ser incrementado para dúvidas");
  assert(response.includes("Como cada caso tem regras bem específicas, a Dra. Mônica e nossa equipe vão analisar toda a sua situação"), "Deveria ter respondido com desvio padrão");
  assert(response.includes("Você tem alguma deficiência?"), "Deveria ter repetido a pergunta de deficiência");

  // Atualiza a sessão para o Turn 2
  mockRomildoSession.user_data = savedUpdates;

  // Romildo Turn 2: "Não. Eu recebi um indeferimento o que isso significa?"
  console.log('Romildo Turn 2: Enviando resposta legítima + dúvida: "Não. Eu recebi um indeferimento o que isso significa?"...');
  // Restauramos a extração real para capturar o "Não"
  sofia.runHybridExtraction = originalRunHybrid;
  response = await sofia.processMessage("553298296586", "Não.  Eu recebi um indeferimento o que isso significa?");
  console.log(`-> Lara Response: "${response}"`);
  console.log(`-> FSM State: "${savedUpdates.state_fsm}"`);
  console.log(`-> Deficiência gravada: ${savedUpdates.tem_deficiencia}`);
  
  assert(savedUpdates.tem_deficiencia === false, "Deficiência deveria ter sido gravada como false");
  assert(savedUpdates.state_fsm === 'RETIREMENT_AWAITING_WORK_HISTORY', "FSM deveria ter avançado para RETIREMENT_AWAITING_WORK_HISTORY");

  // Atualiza a sessão para o Turn 3
  mockRomildoSession.user_data = savedUpdates;

  // Romildo Turn 3: "Preciso pagar esse atendimento?"
  console.log('Romildo Turn 3: Enviando dúvida sobre pagamento: "Preciso pagar esse atendimento?"...');
  sofia.runHybridExtraction = async (text: string, currentState?: string) => {
    return { is_off_topic: true }; // Simula extração de off_topic pela LLM
  };
  response = await sofia.processMessage("553298296586", "Preciso pagar esse atendimento?");
  console.log(`-> Lara Response: "${response}"`);
  console.log(`-> FSM State: "${savedUpdates.state_fsm}"`);
  console.log(`-> Tentativas RETIREMENT_AWAITING_WORK_HISTORY: ${savedUpdates.tentativas_RETIREMENT_AWAITING_WORK_HISTORY}`);
  
  assert(savedUpdates.state_fsm === 'RETIREMENT_AWAITING_WORK_HISTORY', "FSM deveria permanecer em RETIREMENT_AWAITING_WORK_HISTORY");
  assert(!savedUpdates.tentativas_RETIREMENT_AWAITING_WORK_HISTORY, "Contador de tentativas para WORK_HISTORY não deve ser incrementado para dúvidas");
  assert(response.includes("Seu histórico foi mais de carteira assinada ou autônomo?"), "Deveria ter repetido a pergunta de histórico de trabalho");

  // Atualiza a sessão para o Turn 4
  mockRomildoSession.user_data = savedUpdates;

  // Romildo Turn 4: "Carteira"
  console.log('Romildo Turn 4: Enviando resposta legítima: "Carteira"...');
  sofia.runHybridExtraction = originalRunHybrid;
  response = await sofia.processMessage("553298296586", "Carteira");
  console.log(`-> Lara Response: "${response}"`);
  console.log(`-> FSM State: "${savedUpdates.state_fsm}"`);
  console.log(`-> Histórico gravado: ${savedUpdates.retirement_work_history}`);
  
  assert(savedUpdates.retirement_work_history === 'carteira', "Histórico deveria ser gravado como carteira");
  assert(savedUpdates.state_fsm === 'RETIREMENT_AWAITING_SPECIAL_RURAL', "FSM deveria ter avançado para RETIREMENT_AWAITING_SPECIAL_RURAL");

  console.log('✅ Todos os testes de regressão de blindagem global passaram!');
}

runFsmTests().catch(err => {
  console.error(err);
  process.exit(1);
});

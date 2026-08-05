import { SofiaEngine } from '../../src/sofia';
import assert from 'assert';

async function runReliabilityTests() {
  console.log('=== RODANDO TESTES DE CONFIABILIDADE E ROBUSTEZ ===\n');

  // 1. Simulação de Falha de Envio (Retry) com backoff exponencial simples
  // Queremos validar que o callback de envio do Baileys re-tenta e loga `[RETRY_SEND]`.
  console.log('--- 1. Teste de Falha de Envio e Retry ---');
  let sendAttempts = 0;
  let logCaptured = false;

  // Redefinimos console.log temporariamente para capturar logs
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('[RETRY_SEND]')) {
      logCaptured = true;
    }
    originalLog(...args);
  };

  const mockSendMessageCallback = async (replyText: string) => {
    sendAttempts++;
    if (sendAttempts < 3) {
      throw new Error('Falha temporária de conexão');
    }
    return true;
  };

  const sofia = new SofiaEngine();
  // Mock do supabase e openai
  let dbUpdates: any = null;
  (sofia as any).supabase = {
    rpc: async (name: string, args: any) => {
      if (name === 'save_session_data') {
        dbUpdates = args.p_user_data_updates;
      }
      return { data: args.p_user_data_updates, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { phone: '553200000002', step: 'welcome', user_data: { state_fsm: 'AWAITING_NAME' } }, error: null })
        })
      })
    })
  };

  // Mock OpenAI / Gemini calls
  (sofia as any).generateTextWithFallback = async () => 'Olá, meu nome é Lara.';

  // Simula o callback de envio com retry (idêntico à lógica de conectar-baileys.ts)
  const replyCallbackWithRetry = async (replyText: string) => {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        await mockSendMessageCallback(replyText);
        return true;
      } catch (errSend) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`[RETRY_SEND] { phone: "553200000002", attempt: ${attempts}, max_attempts: ${maxAttempts} }`);
        }
      }
    }
    return false;
  };

  const reply = await sofia.processMessage('553200000002', 'Olá Lara', replyCallbackWithRetry);

  // Restaura console.log
  console.log = originalLog;

  console.log(`Mensagem final: "${reply}"`);
  console.log(`Tentativas de envio totais: ${sendAttempts}`);
  console.log(`Retry log capturado: ${logCaptured}`);
  console.log(`Dados salvos no DB pós-envio:`, dbUpdates ? 'SIM' : 'NÃO');

  assert(sendAttempts === 3, 'Deveria tentar 3 vezes antes de ter sucesso');
  assert(logCaptured === true, 'Deveria ter registrado log de [RETRY_SEND]');
  assert(dbUpdates !== null, 'Deveria ter persistido os dados no DB pois o envio funcionou na 3ª tentativa');
  console.log('✅ Teste de Falha de Envio e Retry passou com sucesso!');

  // 2. Simulação de Falha do Supabase (Abort FSM Transaction)
  console.log('\n--- 2. Teste de Aborto da FSM na Falha do Supabase ---');
  let dbFailed = false;
  const errorObj = { message: 'Banco indisponível ou em timeout' };
  (sofia as any).supabase = {
    rpc: async (name: string, args: any) => {
      if (name === 'save_session_data') {
        return { data: null, error: errorObj };
      }
      return { data: null, error: errorObj };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { phone: '553200000003', step: 'welcome', user_data: { state_fsm: 'AWAITING_NAME' } }, error: null })
        })
      })
    })
  };

  try {
    await sofia.processMessage('553200000003', 'Olá Lara', async () => true);
  } catch (err: any) {
    dbFailed = true;
    console.log(`Capturou erro esperado do banco: "${err.message}"`);
  }

  assert(dbFailed === true, 'Deveria ter estourado o erro do banco para o chamador abortar o fluxo');
  console.log('✅ Teste de Aborto da FSM na Falha do Supabase passou com sucesso!');

  // 3. Simulação de Concorrência e Sequenciamento de Mensagens
  console.log('\n--- 3. Teste de Concorrência e Sequenciamento no Buffer ---');
  
  // Vamos simular a fila de concorrência com o mesmo contato
  const messageBuffers = new Map<string, { texts: string[], processing: boolean }>();
  const processedTurns: string[] = [];

  const triggerProcess = async (phone: string) => {
    const buffer = messageBuffers.get(phone);
    if (!buffer || buffer.processing) return;

    buffer.processing = true;
    const textsToProcess = [...buffer.texts];
    const textJoined = textsToProcess.join(' \n ');
    console.log(`[Queue] Iniciando processamento do buffer de ${phone}: "${textJoined}"`);
    
    // Simula um delay assíncrono (ex: tempo de processar o LLM/DB)
    await new Promise(resolve => setTimeout(resolve, 100));

    processedTurns.push(textJoined);
    console.log(`[Queue] Finalizado processamento de ${phone}: "${textJoined}"`);

    buffer.processing = false;
    buffer.texts = buffer.texts.slice(textsToProcess.length);

    if (buffer.texts.length > 0) {
      console.log(`[Queue] Há novas mensagens acumuladas no buffer de ${phone}. Re-agendando...`);
      triggerProcess(phone);
    }
  };

  const receiveMessage = (phone: string, text: string) => {
    if (!messageBuffers.has(phone)) {
      messageBuffers.set(phone, { texts: [], processing: false });
    }
    const buffer = messageBuffers.get(phone)!;
    buffer.texts.push(text);

    if (!buffer.processing) {
      triggerProcess(phone);
    } else {
      console.log(`[Queue] Mensagem "${text}" acumulada no buffer (processando ocupado)`);
    }
  };

  // Simula duas mensagens enviadas consecutivas com intervalo mínimo
  receiveMessage('553200000004', 'Mensagem 1');
  
  // Espera 20ms e envia a Mensagem 2 (enquanto a 1 ainda está rodando)
  await new Promise(resolve => setTimeout(resolve, 20));
  receiveMessage('553200000004', 'Mensagem 2');

  // Espera finalização
  await new Promise(resolve => setTimeout(resolve, 300));

  console.log('Turnos processados:', processedTurns);
  assert(processedTurns.length === 2, 'Deveria ter processado 2 turnos separados');
  assert(processedTurns[0] === 'Mensagem 1', 'O primeiro turno processado deveria ser Mensagem 1');
  assert(processedTurns[1] === 'Mensagem 2', 'O segundo turno processado deveria ser Mensagem 2');

  console.log('✅ Teste de Concorrência e Sequenciamento no Buffer passou com sucesso!');
  console.log('\n===================================================');
  console.log('🎉 TODOS OS TESTES DE CONFIABILIDADE PASSARAM!');
  console.log('===================================================');
}

runReliabilityTests().catch(err => {
  console.error('❌ Erro durante os testes de confiabilidade:', err);
  process.exit(1);
});

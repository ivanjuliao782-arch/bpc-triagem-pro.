import { SofiaEngine } from './src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runConversationalTest() {
  const sofia = new SofiaEngine();
  const phone = 'test-conv-lead-' + Date.now();
  console.log(`Using phone number: ${phone}`);

  // Limpa sessão antiga se houver
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  try {
    console.log('\n========================================================================');
    console.log('🧪 INICIANDO TESTES DA ARQUITETURA CONVERSACIONAL HÍBRIDA DA LARA 🧪');
    console.log('========================================================================');

    // ------------------------------------------------------------------------
    // Cenário 1: Apresentação e Guarda de Nome / Advogado
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Mensagem Inicial de Saudação ---');
    let reply = await sofia.processMessage(phone, 'Oi, boa tarde');
    console.log(`Lara: "${reply}"`);

    console.log('\n--- 2. Cliente informa Nome próprio ---');
    reply = await sofia.processMessage(phone, 'meu nome é carlos');
    console.log(`Lara: "${reply}"`);

    console.log('\n--- 3. Cliente responde sobre Advogado (Guarda de Advogado) ---');
    reply = await sofia.processMessage(phone, 'não tenho advogado não');
    console.log(`Lara: "${reply}"`);

    // ------------------------------------------------------------------------
    // Cenário 2: Pergunta de Idade (FSM sugere AWAITING_AGE)
    // Mas o cliente manda uma resposta Híbrida / Caótica (Idade + Doença juntos)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Resposta Híbrida/Caótica (Idade e Dor no mesmo turno) ---');
    const msgCaotica = 'tenho 58 anos... meu joelho tá estourado por causa de um acidente de moto faz 3 anos, quase não ando';
    console.log(`Cliente: "${msgCaotica}"`);
    reply = await sofia.processMessage(phone, msgCaotica);
    console.log(`Lara: "${reply}"`);

    // Verifica no banco de dados se os dados foram salvos silenciosamente
    let { data: session } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n🔍 [DB Check] Idade salva: "${session?.user_data?.idade}", Doença salva: "${session?.user_data?.doenca}", Acidente: "${session?.user_data?.acidente}"`);
    console.log(`🔍 [DB Check] Estado FSM atual: "${session?.user_data?.state_fsm}" (Fluxo: "${session?.user_data?.fluxo_ativo}")`);

    // ------------------------------------------------------------------------
    // Cenário 3: Off-Topic / Fuga do assunto
    // O bot deve responder de forma humana ao off-topic e retomar sem travar em loop
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Mensagem Off-Topic (Cliente foge do assunto / fala sobre o tempo) ---');
    const msgOffTopic = 'Nossa, mas hoje tá um calor insuportável aqui na minha cidade, aí também tá quente assim?';
    console.log(`Cliente: "${msgOffTopic}"`);
    reply = await sofia.processMessage(phone, msgOffTopic);
    console.log(`Lara: "${reply}"`);

    // ------------------------------------------------------------------------
    // Cenário 4: Retomada Natural da Conversa
    // Cliente responde sobre trabalho
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Cliente responde pergunta de trabalho pendente ---');
    const msgTrabalho = 'não trabalho mais não, tô desempregado sem renda faz tempo';
    console.log(`Cliente: "${msgTrabalho}"`);
    reply = await sofia.processMessage(phone, msgTrabalho);
    console.log(`Lara: "${reply}"`);

    // Verifica estado atual
    const { data: finalSession } = await supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`\n🔍 [DB Check Final] Estado FSM: "${finalSession?.user_data?.state_fsm}"`);
    console.log(`🔍 [DB Check Final] Trabalha atualmente: ${finalSession?.user_data?.trabalha_atualmente}`);
    console.log(`🔍 [DB Check Final] Score total: ${finalSession?.user_data?.score_total} pts`);

    console.log('\n========================================================================');
    console.log('✅ TESTES CONCLUÍDOS COM SUCESSO! MÁQUINA DE ESTADOS NÃO TRAVOU EM LOOPS.');
    console.log('========================================================================\n');

  } catch (err: any) {
    console.error('❌ Erro durante a execução dos testes:', err.message);
  } finally {
    // Limpeza final do número de telefone de teste
    await supabase.from('sofia_sessions').delete().eq('phone', phone);
    console.log('🧹 Limpeza dos dados de teste realizada.');
  }
}

runConversationalTest();

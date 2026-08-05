import { SofiaEngine } from '../src/sofia';

async function testGeovanirRetry() {
  console.log('🧪 Iniciando teste de repetição e fallback do Geovanir...');
  const sofia = new SofiaEngine();
  const phone = 'test_geovanir_retry_phone';

  // Limpa sessão anterior no banco se existir
  const { error: deleteError } = await (sofia as any).supabase
    .from('sofia_sessions')
    .delete()
    .eq('phone', phone);

  if (deleteError) {
    console.error('Erro ao deletar:', deleteError);
  }

  // 1. Mensagem inicial
  console.log('\n--- Turno 1 ---');
  let reply = await sofia.processMessage(phone, "Doutora, meu pai era encostado pelo Loas e deu uma vencida.");
  console.log('Lara:', reply);

  // 2. Apresentação do nome
  console.log('\n--- Turno 2 ---');
  reply = await sofia.processMessage(phone, "Boa tarde sou geovanir");
  console.log('Lara:', reply);

  // 3. Advogado
  console.log('\n--- Turno 3 ---');
  reply = await sofia.processMessage(phone, "Ainda não");
  console.log('Lara:', reply);

  // 4. Idade
  console.log('\n--- Turno 4 ---');
  reply = await sofia.processMessage(phone, "Meu pai tem 71 anos");
  console.log('Lara:', reply);

  // 5. Pergunta de Contribuição - Tentativa 1 (Resposta inválida)
  console.log('\n--- Turno 5 (Tentativa 1) ---');
  reply = await sofia.processMessage(phone, "Ele morava no Rio de Janeiro");
  console.log('Lara:', reply);

  // 6. Pergunta de Contribuição - Tentativa 2 (Resposta inválida de novo -> deve avançar!)
  console.log('\n--- Turno 6 (Tentativa 2 -> Fallback) ---');
  reply = await sofia.processMessage(phone, "Ele sempre morou sozinho lá");
  console.log('Lara:', reply);

  // Verifica se o estado no banco de dados avançou
  const { data: session } = await (sofia as any).supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  console.log('\n🔍 Estado final da FSM no banco de dados:', session?.user_data?.state_fsm);
  console.log('🔍 Campo inss_tempo_carteira:', session?.user_data?.inss_tempo_carteira);
}

testGeovanirRetry();

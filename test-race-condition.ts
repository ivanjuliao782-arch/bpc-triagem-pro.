import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TEST_PHONE = '5599999999999';

async function runTest() {
  console.log('🏁 Iniciando teste de concorrência / race condition no Supabase...');

  // 1. Limpa qualquer sessão de teste antiga
  await supabase.from('sofia_sessions').delete().eq('phone', TEST_PHONE);
  console.log('🧹 Limpeza concluída.');

  // 2. Insere a sessão inicial com dados base
  console.log('🌱 Criando registro inicial...');
  const initialUserData = {
    nome_usuario: 'Edivan Teste',
    notes: [] as string[],
    status: 'novo_lead',
    history: [] as any[]
  };

  const { data: created, error: initError } = await supabase.rpc('save_session_data', {
    p_phone: TEST_PHONE,
    p_step: 'welcome',
    p_user_data_updates: initialUserData
  });

  if (initError) {
    console.error('❌ Erro ao inicializar registro no banco:', initError.message);
    process.exit(1);
  }
  console.log('✅ Registro inicial criado:', JSON.stringify(created));

  // 3. Dispara atualizações concorrentes
  console.log('⚡ Disparando gravações simultâneas (Bot vs Operador)...');

  // Atualização simulando o Bot Lara (atualiza nome, pontuação e histórico)
  const botPromise = supabase.rpc('save_session_data', {
    p_phone: TEST_PHONE,
    p_step: 'age',
    p_user_data_updates: {
      nome_usuario: 'Edivan Confirmado',
      score_total: 85,
      history: [{ role: 'user', content: 'Tenho 67 anos e 15 de contribuição.' }]
    }
  });

  // Atualização simulando o Operador no painel (atualiza status e adiciona notas internas)
  const operatorPromise = supabase.rpc('save_session_data', {
    p_phone: TEST_PHONE,
    p_step: null,
    p_user_data_updates: {
      status: 'em_atendimento',
      notes: ['Ligação efetuada. Cliente demonstrou interesse no BPC.'],
      operador: 'Mônica'
    }
  });

  // Executa simultaneamente
  const results = await Promise.all([botPromise, operatorPromise]);

  if (results[0].error) {
    console.error('❌ Erro na gravação do Bot:', results[0].error.message);
  }
  if (results[1].error) {
    console.error('❌ Erro na gravação do Operador:', results[1].error.message);
  }

  // 4. Consulta o estado final no banco de dados
  console.log('🔍 Buscando estado final no Supabase para validação...');
  const { data: finalSession, error: queryError } = await supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', TEST_PHONE)
    .single();

  if (queryError || !finalSession) {
    console.error('❌ Erro ao buscar registro final:', queryError?.message);
    process.exit(1);
  }

  const finalUserData = finalSession.user_data as any;
  console.log('\n--- RESULTADOS DA CONCURRÊNCIA NO REGISTRO ---');
  console.log('• Passo da FSM:', finalSession.step);
  console.log('• Nome do usuário:', finalUserData.nome_usuario);
  console.log('• Score total:', finalUserData.score_total);
  console.log('• Status (Operador):', finalUserData.status);
  console.log('• Operador (Operador):', finalUserData.operador);
  console.log('• Notas internas (Operador):', JSON.stringify(finalUserData.notes));
  console.log('• Histórico de chat (Bot):', JSON.stringify(finalUserData.history));
  console.log('----------------------------------------------\n');

  // Validações
  let success = true;

  if (finalSession.step !== 'age') {
    console.error('❌ FALHA: O passo não foi atualizado pelo bot!');
    success = false;
  }
  if (finalUserData.nome_usuario !== 'Edivan Confirmado') {
    console.error('❌ FALHA: O nome atualizado pelo bot foi perdido!');
    success = false;
  }
  if (finalUserData.score_total !== 85) {
    console.error('❌ FALHA: O score atualizado pelo bot foi perdido!');
    success = false;
  }
  if (finalUserData.status !== 'em_atendimento') {
    console.error('❌ FALHA: O status atualizado pelo operador foi perdido!');
    success = false;
  }
  if (finalUserData.operador !== 'Mônica') {
    console.error('❌ FALHA: O operador atualizado pelo operador foi perdido!');
    success = false;
  }
  if (!finalUserData.notes || finalUserData.notes.length === 0) {
    console.error('❌ FALHA: As notas inseridas pelo operador foram perdidas!');
    success = false;
  }
  if (!finalUserData.history || finalUserData.history.length === 0) {
    console.error('❌ FALHA: O histórico de chat gravado pelo bot foi perdido!');
    success = false;
  }

  if (success) {
    console.log('🎉 SUCESSO ABSOLUTO! O lock e mesclagem de dados evitou perdas e race conditions!');
  } else {
    console.log('💔 FALHA: Ocorreu perda de dados em atualizações concorrentes.');
    process.exit(1);
  }
}

runTest();

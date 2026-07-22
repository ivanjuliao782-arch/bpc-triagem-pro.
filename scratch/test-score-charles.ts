import { calcularScorePrevidenciario, ScoreUserData } from '../src/lib/score';
import { SofiaEngine } from '../src/sofia';
import * as dotenv from 'dotenv';

dotenv.config();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCESSO: ${message}`);
}

async function runTests() {
  console.log("=== INICIANDO TESTES DO SCORE PREVIDENCIÁRIO ===\n");

  // =========================================================================
  // CENÁRIO 1: APOSENTADORIA (CHARLES)
  // =========================================================================
  console.log("--- Cenário 1: Aposentadoria (Charles) ---");
  const charlesData: ScoreUserData = {
    fluxo_ativo: "APOSENTADORIA",
    idade: 62,
    inss_tempo_carteira: "26 anos",
    doenca: "artrose",
    has_lawyer: true,
    is_recoverable: true
  };

  let scoreCharles = calcularScorePrevidenciario(charlesData);
  console.log(`Score calculado para Charles: ${scoreCharles} pontos`);
  
  // Charles:
  // - fluxo_ativo === 'APOSENTADORIA' -> isAposentadoria === true
  // - inss_tempo_carteira: "26 anos" -> 26 anos contribuição (entre 15 e 27) -> +25 pts
  // - idade: 62 -> ageNum >= 60 -> +20 pts
  // - has_lawyer: true -> sem pontos de 'Sem advogado' (+0 pts)
  // - is_recoverable: true -> não zera o score.
  // Total esperado: 25 + 20 = 45 pontos.
  assert(scoreCharles === 45, `Score do Charles deveria ser 45 (calculado: ${scoreCharles})`);

  // Testar a trava de advogado (não-recuperável) no cenário 1
  const charlesUnrecoverable: ScoreUserData = {
    ...charlesData,
    is_recoverable: false
  };
  let scoreCharlesUnrec = calcularScorePrevidenciario(charlesUnrecoverable);
  assert(scoreCharlesUnrec === 0, `Trava de advogado não-recuperável falhou para Charles (calculado: ${scoreCharlesUnrec})`);


  // =========================================================================
  // CENÁRIO 2: BPC / LOAS (ASSISTENCIAL)
  // =========================================================================
  console.log("\n--- Cenário 2: BPC / LOAS ---");
  const bpcData: ScoreUserData = {
    fluxo_ativo: "BPC_DEFICIENTE",
    ja_contribuiu: false,
    has_no_income: true,
    bpc_cad_unico: true,
    tem_deficiencia: true,
    idade: 35,
    has_lawyer: false
  };

  let scoreBpc = calcularScorePrevidenciario(bpcData);
  console.log(`Score calculado para BPC: ${scoreBpc} pontos`);

  // BPC:
  // - ja_contribuiu: false -> +20 pts
  // - has_no_income: true -> +20 pts (renda baixa) + 10 pts (mora sozinho/renda baixa) -> +30 pts
  // - bpc_cad_unico: true -> +10 pts
  // - tem_deficiencia: true -> +20 pts
  // - idade: 35 -> +0 pts
  // Total esperado: 20 + 30 + 10 + 20 = 80 pontos.
  assert(scoreBpc === 80, `Score BPC deveria ser 80 (calculado: ${scoreBpc})`);

  // Testar a trava de advogado (não-recuperável) no cenário 2
  const bpcUnrecoverable: ScoreUserData = {
    ...bpcData,
    has_lawyer: true,
    is_recoverable: false
  };
  let scoreBpcUnrec = calcularScorePrevidenciario(bpcUnrecoverable);
  assert(scoreBpcUnrec === 0, `Trava de advogado não-recuperável falhou para BPC (calculado: ${scoreBpcUnrec})`);


  // =========================================================================
  // CENÁRIO 3: INSS POR INCAPACIDADE (AUXÍLIO-DOENÇA)
  // =========================================================================
  console.log("\n--- Cenário 3: INSS por Incapacidade (Auxílio-doença) ---");
  const incapacidadeData: ScoreUserData = {
    esta_contribuindo_atualmente: true,
    tem_doenca_ou_limitacao: true,
    doenca: "hérnia de disco",
    inss_laudos_medicos: true,
    has_lawyer: false
  };

  let scoreIncapacidade = calcularScorePrevidenciario(incapacidadeData);
  console.log(`Score calculado para Incapacidade: ${scoreIncapacidade} pontos`);

  // Incapacidade:
  // - esta_contribuindo_atualmente: true -> +30 pts
  // - tem_doenca_ou_limitacao/doenca -> +30 pts
  // - inss_laudos_medicos: true -> +20 pts
  // - has_lawyer: false -> +20 pts
  // Total esperado: 30 + 30 + 20 + 20 = 100 pontos.
  assert(scoreIncapacidade === 100, `Score de incapacidade deveria ser 100 (calculado: ${scoreIncapacidade})`);

  // Confirmar que não vazou pesos de outros funis (ex: idade ou tempo de carteira)
  // Adicionando idade 62 e tempo de carteira 26, mas como é Auxílio-doença, deve pontuar igual!
  const incapacidadeComIdadeCarteira: ScoreUserData = {
    ...incapacidadeData,
    idade: 62,
    inss_tempo_carteira: "26 anos"
  };
  let scoreIncapLeakCheck = calcularScorePrevidenciario(incapacidadeComIdadeCarteira);
  assert(scoreIncapLeakCheck === 100, `Score de incapacidade vazou regras de aposentadoria (calculado: ${scoreIncapLeakCheck})`);

  // Testar a trava de advogado (não-recuperável) no cenário 3
  const incapacidadeUnrecoverable: ScoreUserData = {
    ...incapacidadeData,
    has_lawyer: true,
    is_recoverable: false
  };
  let scoreIncapUnrec = calcularScorePrevidenciario(incapacidadeUnrecoverable);
  assert(scoreIncapUnrec === 0, `Trava de advogado não-recuperável falhou para Incapacidade (calculado: ${scoreIncapUnrec})`);


  // =========================================================================
  // TESTE DE INTEGRAÇÃO / SINK DO BUG DO REGEX (CÓDIGO PURO NO BANCO)
  // =========================================================================
  console.log("\n--- Cenário 4: Integração - Atualização de Score via RegEx ---");
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("⚠️ Credenciais do Supabase ausentes no .env. Pulando teste de integração com o banco.");
    return;
  }

  const engine = new SofiaEngine();
  const testPhone = "5500000000000";

  try {
    // 1. Limpar sessão de teste prévia se existir
    await engine['supabase'].from('sofia_sessions').delete().eq('phone', testPhone);

    // 2. Criar uma nova sessão no estado LAWYER_CHECK_PROCURACAO, simulando o Charles com advogado recuperável
    const initialUserData = {
      nome_usuario: "Charles Teste",
      has_lawyer: true,
      lawyer_has_action: "inss", // Recuperável
      lawyer_has_contract: false, // Recuperável
      state_fsm: "LAWYER_CHECK_PROCURACAO",
      idade: "62",
      inss_tempo_carteira: "26 anos",
      doenca: "artrose",
      score_total: 0 // Começa zerado (bug anterior)
    };

    console.log("Criando sessão de teste no banco...");
    await engine['supabase'].rpc('save_session_data', {
      p_phone: testPhone,
      p_step: 'welcome',
      p_user_data_updates: initialUserData
    });

    // 3. Enviar mensagem curta "Não Lara" que será resolvida por código puro (RegEx)
    console.log("Processando mensagem curta 'Não' via SofiaEngine...");
    await engine.processMessage(testPhone, "Não Lara");

    // 4. Reler a sessão do banco e verificar se o score_total foi recalculado
    const { data: session } = await engine['supabase']
      .from('sofia_sessions')
      .select('user_data')
      .eq('phone', testPhone)
      .single();

    assert(session !== null, "Sessão deveria existir no banco.");
    const finalUserData = session?.user_data;
    console.log("Dados pós-transição no banco:", JSON.stringify(finalUserData));

    // Verificações
    assert(finalUserData.lawyer_has_procuracao === false, "Deveria ter extraído lawyer_has_procuracao: false");
    assert(finalUserData.is_recoverable === true, "Deveria ter marcado is_recoverable: true");
    assert(finalUserData.state_fsm === "AWAITING_CURRENT_CONTRIBUTION", "Deveria ter transicionado para AWAITING_CURRENT_CONTRIBUTION");
    
    // O score recalculado esperado deve ser superior a 0 (pois é recuperável e tem dados preenchidos)
    assert(finalUserData.score_total > 0, `O score_total no banco deveria ser maior que 0. (Atual no banco: ${finalUserData.score_total})`);
    console.log(`O score_total foi devidamente recalculado para ${finalUserData.score_total} e salvo no banco!`);

    // 5. Limpeza
    await engine['supabase'].from('sofia_sessions').delete().eq('phone', testPhone);
    console.log("Sessão de teste limpa do banco de dados.");

  } catch (error) {
    console.error("Erro inesperado no teste de integração:", error);
    process.exit(1);
  }

  console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
}

runTests();

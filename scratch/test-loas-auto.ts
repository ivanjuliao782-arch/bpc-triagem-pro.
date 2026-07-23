import { SofiaEngine } from '../src/sofia';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCESSO: ${message}`);
}

async function runTest() {
  console.log("=== TESTANDO AUTO-INFERÊNCIA DE RECEBIMENTO DE LOAS ===\n");

  const engine = new SofiaEngine();
  
  // Dados de uma sessão em andamento
  const initialUserData = {
    nome_usuario: "Maria de Teste",
    has_lawyer: false,
    state_fsm: "AWAITING_TOTAL_CONTRIBUTION",
    idade: undefined // Ainda não informado
  };

  console.log("Simulando sanitizeExtractedData com resposta 'recebia LOAS'...");
  
  // Executa o sanitizeExtractedData diretamente
  const mergedData = { ...initialUserData };
  const sanitized = engine.sanitizeExtractedData(mergedData, "recebia LOAS", "AWAITING_TOTAL_CONTRIBUTION");

  console.log("Dados sanitizados/extraídos:", JSON.stringify(sanitized, null, 2));

  // Valida as auto-inferências injetadas pelo regex
  assert(sanitized.ja_contribuiu === false, "Deveria ter inferido ja_contribuiu: false");
  assert(sanitized.esta_contribuindo_atualmente === false, "Deveria ter inferido esta_contribuindo_atualmente: false");
  assert(sanitized.tempo_parou_contribuir === 'nunca', "Deveria ter inferido tempo_parou_contribuir: 'nunca'");
  assert(sanitized.inss_tempo_carteira === 'nenhum', "Deveria ter inferido inss_tempo_carteira: 'nenhum'");

  // Valida a transição da FSM a partir desses dados
  console.log("\nSimulando a resolução de estado da FSM...");
  const fsmResult = engine.resolveFSMState(sanitized);
  console.log("Estado FSM resultante:", JSON.stringify(fsmResult, null, 2));

  // Como idade não foi respondida, deve pular todas as perguntas de contribuição e ir direto para AWAITING_AGE
  assert(fsmResult.state === "AWAITING_AGE", `Deveria ter avançado direto para AWAITING_AGE (Atual: ${fsmResult.state})`);

  console.log("\n🎉 TESTE PASSOU COM SUCESSO! O sistema avançou direto pulando todas as perguntas de contribuição.");
}

runTest();

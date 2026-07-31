import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
  const phone = '5532999999999'; // Test number
  const engine = new SofiaEngine(supabase);

  console.log('=== VERIFICATION TEST START ===\n');

  // --- 1. Test "eu sou juvenal" name extraction ---
  console.log('--- TEST 1: Name Extraction ---');
  const name = engine.extrairNomePorCodigo("eu sou juvenal");
  console.log(`Input: "eu sou juvenal"`);
  console.log(`Extracted Name: "${name}"`);
  console.log(name === 'Juvenal' ? '✅ SUCCESS' : '❌ FAILED');

  // --- 2. Test "de qual cidade é o escritório?" address query ---
  console.log('\n--- TEST 2: Location/Address Query ---');
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  const msgAddress = "de qual cidade é o escritório?";
  const replyAddress = await engine.processMessage(phone, msgAddress);
  console.log(`Input: "${msgAddress}"`);
  console.log(`Lara Reply: "${replyAddress}"`);
  console.log(replyAddress.includes("Avenida Cardoso Saraiva") ? '✅ SUCCESS' : '❌ FAILED');

  // --- 3. Test Upfront Housing & CadUnico ---
  console.log('\n--- TEST 3: Upfront Housing & CadUnico ---');
  // Initialize a session at BPC state
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  // Simulates starting a BPC Deficiente flow for user
  const initialData = {
    nome_usuario: "Juvenal",
    idade: 65,
    history: [],
    state_fsm: 'BPC_AWAITING_HOUSEHOLD',
    fluxo_ativo: 'BPC_DEFICIENTE',
    esta_contribuindo_atualmente: false,
    tem_doenca_ou_limitacao: true,
    doenca: "Rinopatia",
    tem_deficiencia: true
  };
  await supabase.rpc('save_session_data', {
    p_phone: phone,
    p_step: 'welcome',
    p_user_data_updates: initialData
  });

  // Client provides household, housing status and CadUnico upfront:
  // "moro sozinho, casa própria, não tenho cadúnico"
  const upfrontMsg = "moro sozinho, casa própria, não tenho cadúnico";
  console.log(`Upfront message: "${upfrontMsg}"`);
  const replyUpfront = await engine.processMessage(phone, upfrontMsg);
  console.log(`Lara Reply: "${replyUpfront}"`);

  // Check what was saved
  const { data: sessionData } = await supabase.from('sofia_sessions').select('user_data').eq('phone', phone).single();
  console.log('Saved user_data keys:');
  console.log(JSON.stringify(sessionData?.user_data, null, 2));
  
  const savedHousing = sessionData?.user_data?.bpc_casa_alugada_propria;
  const savedCad = sessionData?.user_data?.bpc_cad_unico;
  console.log(`Saved Housing: "${savedHousing}" (expected: "propria")`);
  console.log(`Saved CadUnico: "${savedCad}" (expected: false)`);
  if (savedHousing === 'propria' && savedCad === false) {
    console.log('✅ SUCCESS (Global extraction worked upfront)');
  } else {
    console.log('❌ FAILED');
  }

  // --- 4. Test Quote/Reply Echo Cleaning ---
  console.log('\n--- TEST 4: Quote/Reply Echo Cleaning ---');
  const quoteText = "Prazer, Eu Michel! Sinto muito por toda essa dificuldade. Você já tem advogado te ajudando com seu caso?\nNão tenho nenhum advogado ainda";
  const clean = engine.limparEcoPerguntas(quoteText);
  console.log(`Raw Quote Text:\n"""\n${quoteText}\n"""`);
  console.log(`Cleaned Text: "${clean}"`);
  console.log(clean === 'Não tenho nenhum advogado ainda' ? '✅ SUCCESS' : '❌ FAILED');

  // --- 5. Test Disability Empathy on Disease Reporting ---
  console.log('\n--- TEST 5: Disability Empathy on Disease Reporting ---');
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  
  // Set initial state awaiting disease, with lawyer already checked
  const initialUserData = {
    nome_usuario: "Michel",
    idade: 48,
    history: [
      { role: 'user', content: "Oi" },
      { role: 'assistant', content: "Olá! Você tem alguma doença atualmente?" }
    ],
    state_fsm: 'AWAITING_DISEASE',
    has_lawyer: false,
    inss_tempo_carteira: '15 anos',
    esta_contribuindo_atualmente: false,
    tempo_parou_contribuir: '2 anos',
    tem_doenca_ou_limitacao: null,
    tem_deficiencia: null,
    ultimo_sofrimento_com_empatia: undefined
  };
  await supabase.rpc('save_session_data', {
    p_phone: phone,
    p_step: 'benefit',
    p_user_data_updates: initialUserData
  });

  const diseaseMsg = "Sim Diabetes à 16 anos Rinopatia diabética Capsulite adesiva Neuropatia diabética";
  console.log(`Input message: "${diseaseMsg}"`);
  const replyDisability = await engine.processMessage(phone, diseaseMsg);
  console.log(`Lara Reply: "${replyDisability}"`);
  
  const expectedPrefix1 = "Sinto muito que esteja passando por isso.";
  const expectedPrefix2 = "Sinto muito por toda essa dificuldade.";
  if (replyDisability.includes(expectedPrefix1) || replyDisability.includes(expectedPrefix2)) {
    console.log('✅ SUCCESS (Empathy prefixed to AWAITING_DISABILITY question)');
  } else {
    console.log('❌ FAILED (Empathy missing)');
  }

  // --- 6. Test Real-time Deadline/Prazo Query ---
  console.log('\n--- TEST 6: Real-time Deadline/Prazo Query ---');
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  
  // Edivan's initial message asking about deadline/prazo
  const deadlineMsg = "será que vocês conseguem me ajudar hoje ainda ou só semana que vem?";
  console.log(`Input message: "${deadlineMsg}"`);
  const replyDeadline = await engine.processMessage(phone, deadlineMsg);
  console.log(`Lara Reply:\n"""\n${replyDeadline}\n"""`);
  
  const expectedDeadlinePrefix = "Vou registrar todo o seu caso agora. Nossa equipe analisa com cuidado e retorna dentro de alguns instantes.";
  const hasDeadlinePrefix = replyDeadline.includes(expectedDeadlinePrefix);
  const hasAwaitingNameQuestion = replyDeadline.includes("Com quem eu falo?");
  
  if (hasDeadlinePrefix && hasAwaitingNameQuestion) {
    console.log('✅ SUCCESS (Deadline response prepended to AWAITING_NAME question)');
  } else {
    console.log('❌ FAILED');
  }

  // Turn 2: User provides name
  const nameMsg = "Eu sou o Rivaldo";
  console.log(`\nInput message 2: "${nameMsg}"`);
  const replyName = await engine.processMessage(phone, nameMsg);
  console.log(`Lara Reply:\n"""\n${replyName}\n"""`);
  
  const isAwaitingLawyer = replyName.includes("cuidando do seu caso?") || replyName.includes("ajudando com seu caso?");
  if (isAwaitingLawyer && !replyName.includes(expectedDeadlinePrefix)) {
    console.log('✅ SUCCESS (Flow continued normally without repeating deadline prefix)');
  } else {
    console.log('❌ FAILED');
  }

  // --- 7. Test Elisângela Disability Loop Fix ---
  console.log('\n--- TEST 7: Elisângela Disability Loop Fix ---');
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  
  // Set initial state waiting for disability check
  const initialUserDataElisangela = {
    nome_usuario: "Elisângela",
    idade: 47,
    history: [
      { role: 'user', content: "Oi" },
      { role: 'assistant', content: "Olá! Qual a sua idade?" },
      { role: 'user', content: "47 anos" }
    ],
    state_fsm: 'AWAITING_DISABILITY',
    has_lawyer: false,
    esta_contribuindo_atualmente: false,
    tem_doenca_ou_limitacao: true,
    doenca: "lesão por cat",
    tem_deficiencia: null
  };
  await supabase.rpc('save_session_data', {
    p_phone: phone,
    p_step: 'benefit',
    p_user_data_updates: initialUserDataElisangela
  });

  // Client responds with a description of disability instead of yes/no
  const disabilityDescMsg = "Adquiri uma sequela na córnea por uma cirurgia realizada lá msm onde trabalho.";
  console.log(`Input message: "${disabilityDescMsg}"`);
  const replyDisabilityFix = await engine.processMessage(phone, disabilityDescMsg);
  console.log(`Lara Reply:\n"""\n${replyDisabilityFix}\n"""`);

  // Check database state - should have auto-inferred tem_deficiencia = true
  const { data: dbDataElisangela } = await supabase.from('sofia_sessions').select('user_data').eq('phone', phone).single();
  const autoInferred = dbDataElisangela?.user_data?.tem_deficiencia;
  const nextState = dbDataElisangela?.user_data?.state_fsm;
  
  console.log(`Auto-inferred tem_deficiencia: ${autoInferred} (expected: true)`);
  console.log(`Next State resolved: ${nextState} (expected: INSS_AWAITING_REPORTS or AWAITING_TOTAL_CONTRIBUTION or similar, NOT AWAITING_DISABILITY)`);

  if (autoInferred === true && nextState !== 'AWAITING_DISABILITY') {
    console.log('✅ SUCCESS (Disability loop avoided via auto-inference!)');
  } else {
    console.log('❌ FAILED (Still stuck in loop)');
  }

  // --- 8. Test Third-party Confirmation Prefix & Question Routing ---
  console.log('\n--- TEST 8: Third-party Confirmation Prefix & Question Routing ---');
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  // Mother starts chat about her daughter
  const initialMsg = "Quero saber sobre aposentadoria para minha filha";
  console.log(`Input message: "${initialMsg}"`);
  const replyThirdParty = await engine.processMessage(phone, initialMsg);
  console.log(`Lara Reply:\n"""\n${replyThirdParty}\n"""`);

  // Confirm prefix is present
  const expectedConfirmPrefix = "Entendi que se trata do benefício da sua Filha.";
  const hasConfirmPrefix = replyThirdParty.includes(expectedConfirmPrefix);
  if (hasConfirmPrefix) {
    console.log('✅ SUCCESS (Third-party confirmation prefix prepended)');
  } else {
    console.log('❌ FAILED (Prefix missing)');
  }

  // Follow-up: mother replies with child name
  const daughterNameMsg = "O nome dela é Joana";
  console.log(`\nInput message 2: "${daughterNameMsg}"`);
  const replyDaughterName = await engine.processMessage(phone, daughterNameMsg);
  console.log(`Lara Reply:\n"""\n${replyDaughterName}\n"""`);
  if (!replyDaughterName.includes(expectedConfirmPrefix)) {
    console.log('✅ SUCCESS (Prefix not repeated on second turn)');
  } else {
    console.log('❌ FAILED (Prefix repeated)');
  }

  // Follow-up: mother replies to lawyer check with false, FSM moves to age
  const noLawyerMsg = "Não tem advogado";
  console.log(`\nInput message 3: "${noLawyerMsg}"`);
  const replyLawyer = await engine.processMessage(phone, noLawyerMsg);
  console.log(`Lara Reply:\n"""\n${replyLawyer}\n"""`);
  // FSM should adapt the age question to refer to the daughter: "Qual a idade da sua filha?" or "Quantos anos a Joana tem?"
  const isAdaptedAgeQuestion = replyLawyer.includes("Joana") && (replyLawyer.includes("idade") || replyLawyer.includes("anos"));
  if (isAdaptedAgeQuestion) {
    console.log('✅ SUCCESS (Age question correctly adapted to the daughter)');
  } else {
    console.log('❌ FAILED (Age question not adapted)');
  }

  // Follow-up: mother replies age is 35 (adult daughter). FSM moves to total contribution.
  const age35Msg = "Ela tem 35 anos";
  console.log(`\nInput message 4: "${age35Msg}"`);
  const replyAge = await engine.processMessage(phone, age35Msg);
  console.log(`Lara Reply:\n"""\n${replyAge}\n"""`);
  // FSM should adapt the total contribution question to refer to the daughter: "A sua filha já trabalhou..." or "Joana já trabalhou..."
  const isAdaptedContribQuestion = replyAge.includes("sua filha já trabalhou") || replyAge.includes("Joana já trabalhou");
  if (isAdaptedContribQuestion) {
    console.log('✅ SUCCESS (Contribution question correctly adapted to the daughter)');
  } else {
    console.log('❌ FAILED (Contribution question not adapted)');
  }
  // --- 9. Test Marcia Full Triage, Single Empathy & BPC Group Rule ---
  console.log('\n--- TEST 9: Marcia Full Triage, Single Empathy & BPC Group Rule ---');
  await supabase.from('sofia_sessions').delete().eq('phone', phone);

  // Turn 1: Lead describes problem without name
  const marciaMsg1 = "Quero saber sobre o loas, eu tenho 76 por cento sem audicao e 84 por cento no outro ouvido";
  console.log(`Input message 1: "${marciaMsg1}"`);
  const marciaReply1 = await engine.processMessage(phone, marciaMsg1);
  console.log(`Lara Reply 1:\n"""\n${marciaReply1}\n"""`);
  const containsEmpathy1 = marciaReply1.includes("Sinto muito") || marciaReply1.includes("Que situação difícil");

  // Turn 2: User provides name
  const marciaMsg2 = "Márcia";
  console.log(`\nInput message 2: "${marciaMsg2}"`);
  const marciaReply2 = await engine.processMessage(phone, marciaMsg2);
  console.log(`Lara Reply 2:\n"""\n${marciaReply2}\n"""`);
  const containsEmpathy2 = marciaReply2.includes("Sinto muito") || marciaReply2.includes("Que situação difícil");

  // Turn 3: User answers lawyer check
  const marciaMsg3 = "Ainda nao";
  console.log(`\nInput message 3: "${marciaMsg3}"`);
  const marciaReply3 = await engine.processMessage(phone, marciaMsg3);
  console.log(`Lara Reply 3:\n"""\n${marciaReply3}\n"""`);
  const containsEmpathy3 = marciaReply3.includes("Sinto muito") || marciaReply3.includes("Que situação difícil");

  // Turn 4: User answers age
  const marciaMsg4 = "54";
  console.log(`\nInput message 4: "${marciaMsg4}"`);
  const marciaReply4 = await engine.processMessage(phone, marciaMsg4);
  console.log(`Lara Reply 4:\n"""\n${marciaReply4}\n"""`);
  const containsEmpathy4 = marciaReply4.includes("Sinto muito") || marciaReply4.includes("Que situação difícil");

  // Turn 5: User answers contribution
  const marciaMsg5 = "Pro INSS muito pouco eu sempre trabalhei autônoma";
  console.log(`\nInput message 5: "${marciaMsg5}"`);
  const marciaReply5 = await engine.processMessage(phone, marciaMsg5);
  console.log(`Lara Reply 5:\n"""\n${marciaReply5}\n"""`);
  const containsEmpathy5 = marciaReply5.includes("Sinto muito") || marciaReply5.includes("Que situação difícil");

  // Turn 6: User answers current work
  const marciaMsg6 = "Não mais";
  console.log(`\nInput message 6: "${marciaMsg6}"`);
  const marciaReply6 = await engine.processMessage(phone, marciaMsg6);
  console.log(`Lara Reply 6:\n"""\n${marciaReply6}\n"""`);

  // Turn 7: User answers parou de trabalhar
  const marciaMsg7 = "Já tem um tempo";
  console.log(`\nInput message 7: "${marciaMsg7}"`);
  const marciaReply7 = await engine.processMessage(phone, marciaMsg7);
  console.log(`Lara Reply 7:\n"""\n${marciaReply7}\n"""`);

  // Turn 8: User answers household composition
  const marciaMsg8 = "Minha filha e dois netinhos";
  console.log(`\nInput message 8: "${marciaMsg8}"`);
  const marciaReply8 = await engine.processMessage(phone, marciaMsg8);
  console.log(`Lara Reply 8:\n"""\n${marciaReply8}\n"""`);

  // Turn 9: User answers household income - only son-in-law has income.
  // Under our BPC rule, son-in-law income should be ignored, so bpc_renda_familiar should be false.
  const marciaMsg9 = "Minha filha nao, só meu genro";
  console.log(`\nInput message 9: "${marciaMsg9}"`);
  const marciaReply9 = await engine.processMessage(phone, marciaMsg9);
  console.log(`Lara Reply 9:\n"""\n${marciaReply9}\n"""`);

  // Read FSM state and bpc_renda_familiar value after this turn
  const { data: dbDataMarcia } = await supabase.from('sofia_sessions').select('user_data').eq('phone', phone).single();
  const dbRendaFamiliar = dbDataMarcia?.user_data?.bpc_renda_familiar;
  const dbQuemRenda = dbDataMarcia?.user_data?.bpc_quem_renda;
  console.log(`DB bpc_renda_familiar: ${dbRendaFamiliar} (expected: false)`);
  console.log(`DB bpc_quem_renda: ${dbQuemRenda}`);

  // Turn 10: User answers house status
  const marciaMsg10 = "A casa é alugada pela prefeitura";
  console.log(`\nInput message 10: "${marciaMsg10}"`);
  const marciaReply10 = await engine.processMessage(phone, marciaMsg10);
  console.log(`Lara Reply 10:\n"""\n${marciaReply10}\n"""`);

  const containsEmpathyChecks = !containsEmpathy3 && !containsEmpathy4 && !containsEmpathy5;
  
  if (containsEmpathy2 && containsEmpathyChecks) {
    console.log('✅ SUCCESS (Empathy was shown once on turn 2 after name, and NEVER repeated in subsequent turns!)');
  } else {
    console.log(`❌ FAILED (Empathy repetition check failed: Turn 1: ${containsEmpathy1}, Turn 2: ${containsEmpathy2}, Turn 3: ${containsEmpathy3}, Turn 4: ${containsEmpathy4})`);
  }

  if (dbRendaFamiliar === false) {
    console.log('✅ SUCCESS (BPC Family Group rule successfully ignored the son-in-law!)');
  } else {
    console.log('❌ FAILED (BPC Family Group counted the son-in-law as family income)');
  }

  // --- TEST 10: SIMULADOR JUVENTINO (Prazo + Idade + Doença + Coluna na primeira msg) ---
  console.log('\n--- TEST 10: SIMULADOR JUVENTINO ---');
  const phoneJuventino = '5532888888888';
  await supabase.from('sofia_sessions').delete().eq('phone', phoneJuventino);

  // Turn 1: Lead sends message with deadline request, age (54), disease/column, and no name
  const juvMsg1 = "Oi boa NOITE, é o seguinte, eu tô desesperado aqui porque o INSS indeferiu meu auxílio de novo, essa já é a segunda vez, eu tenho 54 anos, trabalhei minha vida inteira registrado, agora fiquei sem chão porque não sei o que fazer, minha esposa tá desempregada também, aí eu queria saber se vocês atendem esse tipo de caso e quanto tempo demora pra... deixa eu ver aqui... ah é, eu tenho o laudo do médico também, ele disse que eu não posso voltar a trabalhar tão cedo por causa da coluna, será que vocês conseguem me ajudar hoje ainda ou só semana que vem?";
  console.log(`\nInput message 1 (Juv): "${juvMsg1}"`);
  const juvReply1 = await engine.processMessage(phoneJuventino, juvMsg1);
  console.log(`Lara Reply 1:\n"""\n${juvReply1}\n"""`);

  // Turn 2: User answers name
  const juvMsg2 = "Juventino";
  console.log(`\nInput message 2 (Juv): "${juvMsg2}"`);
  const juvReply2 = await engine.processMessage(phoneJuventino, juvMsg2);
  console.log(`Lara Reply 2:\n"""\n${juvReply2}\n"""`);

  // Turn 3: User answers lawyer check
  const juvMsg3 = "ainda não";
  console.log(`\nInput message 3 (Juv): "${juvMsg3}"`);
  const juvReply3 = await engine.processMessage(phoneJuventino, juvMsg3);
  console.log(`Lara Reply 3:\n"""\n${juvReply3}\n"""`);

  // Check state and extracted age
  const { data: dbDataJuv } = await supabase.from('sofia_sessions').select('user_data').eq('phone', phoneJuventino).single();
  const dbAgeJuv = dbDataJuv?.user_data?.idade;
  const dbDiseaseJuv = dbDataJuv?.user_data?.doenca;
  const dbFsmStateJuv = dbDataJuv?.user_data?.state_fsm;

  console.log(`DB idade: ${dbAgeJuv} (expected: 54)`);
  console.log(`DB doenca: ${dbDiseaseJuv} (expected: "coluna" or similar)`);
  console.log(`DB state_fsm: ${dbFsmStateJuv} (expected: not AWAITING_AGE)`);

  if (dbAgeJuv === 54) {
    console.log('✅ SUCCESS (Juventino age 54 was correctly extracted on first turn despite deadline interceptor!)');
  } else {
    console.log(`❌ FAILED (Juventino age was not extracted, got: ${dbAgeJuv})`);
  }

  if (dbFsmStateJuv !== 'AWAITING_AGE') {
    console.log('✅ SUCCESS (FSM skipped AWAITING_AGE because age was already known!)');
  } else {
    console.log('❌ FAILED (FSM asked for age again even though it was provided!)');
  }
}

runVerification().catch(console.error);

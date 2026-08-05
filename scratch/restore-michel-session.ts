import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreMichel() {
  const phoneTest = '5532999999999';
  const phoneReal = '553284233201';

  console.log('=== RESTORING REAL MICHEL SESSION ===');

  // 1. Delete the test session
  const delTest = await supabase.from('sofia_sessions').delete().eq('phone', phoneTest);
  if (delTest.error) {
    console.error('Error deleting test session:', delTest.error);
  } else {
    console.log(`✅ Deleted test session: ${phoneTest}`);
  }

  // 2. Delete the real session to avoid primary key conflicts
  const delReal = await supabase.from('sofia_sessions').delete().eq('phone', phoneReal);
  if (delReal.error) {
    console.error('Error clearing old real session:', delReal.error);
  } else {
    console.log(`✅ Cleared old real session: ${phoneReal}`);
  }

  // 3. Insert the correct real session
  const realUserData = {
    idade: 48,
    cidade: "São Sebastião da Vargem Alegre",
    doenca: "Rinopatia diabética, Capsulite adesiva, Neuropatia diabética",
    history: [
      { role: "user", content: "Em qual cidade é seu escritório?" },
      { role: "assistant", content: "Boa noite! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?" },
      { role: "user", content: "Eu sou Michel" },
      { role: "assistant", content: "Prazer, Michel! Sinto muito por toda essa dificuldade. Você já tem advogado te ajudando com seu caso?" },
      { role: "user", content: "Não tenho nenhum advogado ainda" },
      { role: "assistant", content: "Entendi. Só para ter uma ideia melhor, qual a sua idade?" },
      { role: "user", content: "São Sebastião da vargem Alegre \n Mg" },
      { role: "assistant", content: "Entendi. Só para ter uma ideia melhor, qual a sua idade?" },
      { role: "user", content: "48 anos" },
      { role: "assistant", content: "Como está sua rotina de trabalho hoje em dia, você está conseguindo trabalhar?" },
      { role: "user", content: "Com muita dificuldade" },
      { role: "assistant", content: "Sinto muito que você esteja passando por essa dor. Você consegue trabalhar um pouco, mesmo que com dificuldades?" },
      { role: "user", content: "Tenho que fazer alguma coisa pois no final do mês é apertado" },
      { role: "assistant", content: "Sinto muito que você esteja passando por essa situação. Você tem alguma doença atualmente?" },
      { role: "user", content: "Sim\nDiabetes à 16 anos\nRinopatia diabética \nCapsulite adesiva \nNeuropatia diabética" },
      { role: "assistant", content: "Você tem alguma deficiência física, visual, auditiva ou motora?" },
      { role: "user", content: "Não cheguei nesse estágio ainda de ficar impossibilitado de trabalhar" },
      { role: "assistant", content: "Sinto muito por toda essa dificuldade. Entendo. Você trabalhava com carteira assinada ou por conta própria?" },
      { role: "user", content: "Sou rural hoje" },
      { role: "assistant", content: "Sinto muito que esteja passando por isso. Entendi. Você trabalha como rural atualmente?" }
    ],
    state_fsm: "INSS_AWAITING_REPORTS",
    has_lawyer: false,
    deficiencia: "Não",
    fluxo_ativo: "INSS_CONTRIBUTIVO",
    score_total: 85,
    is_off_topic: false,
    nome_usuario: "Michel",
    ja_contribuiu: true,
    tem_deficiencia: false,
    contexto_offtopic: true,
    inss_tempo_carteira: "não informado",
    sofrimento_relatado: null,
    inss_como_contribuiu: "não informado",
    tempo_parou_contribuir: "Tenho que fazer alguma coisa pois no final do mês é apertado",
    tem_doenca_ou_limitacao: true,
    inss_ultima_contribuicao: "Tenho que fazer alguma coisa pois no final do mês é apertado",
    ultimo_sofrimento_com_empatia: "Rinopatia diabética, Capsulite adesiva, Neuropatia diabética",
    inss_laudos_medicos: true
  };

  const realTime = '2026-07-30T18:57:57.726-03:00';

  const { data, error } = await supabase.from('sofia_sessions').insert({
    phone: phoneReal,
    step: 'docs',
    user_data: realUserData,
    created_at: realTime,
    last_interaction: realTime
  }).select('*').single();

  if (error) {
    console.error('Error inserting real Michel session:', error);
  } else {
    console.log('✅ Real Michel session successfully restored with real number and history:', JSON.stringify(data, null, 2));
  }
}

restoreMichel().catch(console.error);

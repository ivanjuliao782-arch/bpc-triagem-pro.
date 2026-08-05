import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function restoreSession() {
  const phone = '553287162409';
  console.log(`Restaurando sessão original de ${phone}...`);

  const userData = {
    status: "com_advogado",
    history: [
      { role: "assistant", content: "Bom dia! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?" },
      { role: "user", content: "Adicionar \n Adriana" },
      { role: "user", content: "Ok intendo fico grata" },
      { role: "user", content: "Ok intendo fico grata" },
      { role: "assistant", content: "Prazer, Adicionar Adriana! Já tem advogado te ajudando com o seu caso?" }
    ],
    operador: "SHOCKWAVE",
    state_fsm: "AWAITING_LAWYER",
    nextAction: "Ligar para alinhar documentação",
    score_total: 0,
    is_off_topic: null,
    nome_usuario: "Adicionar Adriana",
    tempo_resposta: 40,
    lastInteraction: "02/08/2026, 10:49:09",
    contexto_offtopic: true,
    sofrimento_relatado: null,
    tentativas_AWAITING_LAWYER: 1,
    ultimo_sofrimento_com_empatia: "inicial"
  };

  // Insere a sessão de volta
  const { data, error } = await supabase
    .from('sofia_sessions')
    .insert([
      {
        phone: phone,
        step: 'welcome',
        user_data: userData,
        last_interaction: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error('Erro ao restaurar a sessão:', error);
  } else {
    console.log('✅ Sessão de Adriana (553287162409) restaurada com sucesso!', data);
  }
}

restoreSession().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function updateThais() {
  const phone = '70785490276410';
  console.log(`Buscando sessão do telefone ${phone} para atualizar agendamento...`);

  const { data: session, error: fetchError } = await supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (fetchError || !session) {
    console.error("❌ Não foi possível encontrar a sessão da Thaís no banco de dados:", fetchError?.message || "Sessão não encontrada.");
    return;
  }

  const updatedUserData = {
    ...session.user_data,
    agendamento: "Quarta-feira às 13:00",
    next_step: "STAGE_FINISHED"
  };

  console.log("Injetando agendamento no user_data...");
  const { error: updateError } = await supabase
    .from('sofia_sessions')
    .update({ user_data: updatedUserData })
    .eq('phone', phone);

  if (updateError) {
    console.error("❌ Erro ao atualizar o banco de dados:", updateError.message);
  } else {
    console.log("✅ AGENDAMENTO DA THAÍS INJETADO COM SUCESSO! Verifique o painel.");
  }
}

updateThais();

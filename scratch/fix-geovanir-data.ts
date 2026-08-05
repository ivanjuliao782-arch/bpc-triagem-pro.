import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGeovanir() {
  const phone = '5532933006762';
  console.log(`Fixing database session data for Geovanir (${phone})...`);

  // Fetch current data first to merge carefully
  const { data: current, error: fetchError } = await supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (fetchError) {
    console.error('Error fetching current data:', fetchError.message);
    return;
  }

  const updatedUserData = {
    ...current.user_data,
    beneficiario_terceiro: "pai",
    inss_tempo_carteira: "10 anos",
    tempo_contribuicao: "10 anos",
    trabalha_atualmente: false,
    bpc_pessoas_casa: "4 pessoas (Geovanir, esposa, enteado, pai)",
    bpc_quem_renda: "Geovanir (CLT), esposa (pensionista), enteado (CLT)",
    bpc_renda_familiar: true,
    doenca: "AVC",
    idade: 71,
    score_total: 80
  };

  const { error: updateError } = await supabase
    .from('sofia_sessions')
    .update({
      user_data: updatedUserData
    })
    .eq('phone', phone);

  if (updateError) {
    console.error('Error updating Geovanir:', updateError.message);
  } else {
    console.log('✅ Geovanir database records successfully corrected!');
  }
}

fixGeovanir();

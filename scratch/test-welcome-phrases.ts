import { SofiaEngine } from './src/sofia';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('=== TESTANDO FRASES DE APRESENTAÇÃO ===');
  
  const testPhone = '553298296586';
  
  // Limpa sessão antiga para começar do zero
  await supabase.from('sofia_sessions').delete().eq('phone', testPhone);
  
  const sofia = new SofiaEngine(supabase);
  
  // 1. Primeiro passo: envia "Oi" para criar a sessão e gerar a saudação de boas-vindas
  console.log('\nEnviando "Oi"...');
  const greeting = await sofia.processMessage(testPhone, 'Oi');
  console.log('Lara respondeu:', greeting);
  
  // As 4 frases solicitadas para teste
  const frases = [
    "Prazer, meu nome é Edivan",
    "Muito prazer, me chamo Edivan",
    "Satisfação, Edivan",
    "Prazer, Edivan"
  ];
  
  for (const frase of frases) {
    console.log(`\nTestando frase: "${frase}"`);
    
    // Zera os dados de nome para cada teste para forçar re-extração
    await supabase.from('sofia_sessions').update({
      user_data: {
        history: [
          { role: "user", content: "Oi" },
          { role: "assistant", content: "Bom dia! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?" }
        ],
        state_fsm: "AWAITING_NAME"
      }
    }).eq('phone', testPhone);
    
    const reply = await sofia.processMessage(testPhone, frase);
    
    // Busca como ficou salvo no banco de dados
    const { data: session } = await supabase
      .from('sofia_sessions')
      .select('user_data')
      .eq('phone', testPhone)
      .single();
      
    const nomeSalvo = session?.user_data?.nome_usuario;
    console.log(`Lara respondeu: "${reply}"`);
    console.log(`Nome salvo no banco: "${nomeSalvo}"`);
    
    if (nomeSalvo === 'Edivan') {
      console.log('✅ TESTE APROVADO: Nome extraído corretamente como "Edivan"');
    } else {
      console.error(`❌ TESTE FALHOU: Nome extraído foi "${nomeSalvo}" (esperado "Edivan")`);
    }
  }
}

runTests().catch(console.error);

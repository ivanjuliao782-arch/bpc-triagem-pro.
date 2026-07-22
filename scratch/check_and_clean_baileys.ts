import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkAndClean() {
    console.log('1. VERIFICANDO A AUTENTICAÇÃO BAILEYS...');
    const { data: authData, error: authError } = await supabase
        .from('baileys_auth')
        .select('id')
        .eq('id', 'sofia_principal_creds')
        .single();
    
    if (authError) {
        console.log('❌ Credenciais "sofia_principal_creds" não encontradas no banco:', authError.message);
    } else {
        console.log('✅ Credenciais "sofia_principal_creds" existem no banco de dados. Sessão previamente pareada.');
    }

    console.log('\n2. EXECUTANDO LIMPEZA DA SESSÃO DE TESTE (553298296586)...');
    const { error: deleteError } = await supabase
        .from('sofia_sessions')
        .delete()
        .eq('phone', '553298296586');

    if (deleteError) {
        console.error('❌ Erro ao deletar sessão:', deleteError.message);
    } else {
        console.log(`✅ Remoção executada com sucesso para a sessão de 553298296586.`);
    }

    console.log('\n3. VERIFICANDO LEADS RESTANTES NA TABELA...');
    const { data: remainingSessions, error: selectError } = await supabase
        .from('sofia_sessions')
        .select('phone, step, user_data');

    if (selectError) {
        console.error('❌ Erro ao ler sessões restantes:', selectError.message);
    } else {
        console.log(`Quantidade de sessões restantes: ${remainingSessions.length}`);
        remainingSessions.forEach((s, idx) => {
            console.log(`[Lead #${idx+1}] Telefone: ${s.phone} | Step: ${s.step} | Nome: ${s.user_data?.nome_usuario || 'Não informado'}`);
        });
    }
}

checkAndClean();

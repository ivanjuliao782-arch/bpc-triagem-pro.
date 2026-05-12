import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- DIAGNÓSTICO DE DADOS ---');
    const { data, error, count } = await supabase
        .from('sofia_sessions')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Erro ao ler tabela:', error.message);
    } else {
        console.log('Quantidade de leads no banco:', count);
        console.log('Primeiro lead (se houver):', data[0] ? data[0].phone : 'NENHUM');
    }

    console.log('\n--- VERIFICANDO SEGURANÇA (RLS) ---');
    const { data: rls } = await supabase.rpc('get_policies'); // se existir
    // Como RPC pode não existir, vamos tentar ver se a leitura anonima funciona
    const anonClient = createClient(process.env.SUPABASE_URL, 'sb_publishable_PyBHJ0RKxfXw9J-NqTiLA_InzJpqE');
    const { data: anonData, error: anonError } = await anonClient.from('sofia_sessions').select('*');
    
    if (anonError) {
        console.log('Acesso Anônimo (Dashboard) FALHOU:', anonError.message);
    } else if (anonData.length === 0 && count > 0) {
        console.log('RLS DETECTADO: O banco tem dados, mas o Dashboard não tem permissão para ler!');
    } else {
        console.log('Acesso Anônimo OK. Registros visíveis:', anonData.length);
    }
}

check();

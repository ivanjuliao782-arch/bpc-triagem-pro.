import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function limparAuth() {
    console.log('Limpando tabela baileys_auth...');
    const { error } = await supabase.from('baileys_auth').delete().neq('id', 'placeholder');
    
    if (error) {
        console.error('Erro ao limpar auth:', error);
    } else {
        console.log('✅ Autenticação limpa com sucesso!');
    }
}

limparAuth();

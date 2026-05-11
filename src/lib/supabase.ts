import { createClient } from '@supabase/supabase-js';

// O Vite vai substituir estas strings pelos valores reais durante o build
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('Dashboard carregando sem URL do Supabase. Verifique as variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

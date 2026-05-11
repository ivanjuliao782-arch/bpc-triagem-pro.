import { createClient } from '@supabase/supabase-js';

// Usamos as variáveis injetadas pelo Vite ou do import.meta.env
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

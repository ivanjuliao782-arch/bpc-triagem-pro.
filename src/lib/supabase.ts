import { createClient } from '@supabase/supabase-js';

// No Frontend, usamos a ANON_KEY (Publishable)
// No Backend (Bot), usamos a SERVICE_ROLE_KEY
const supabaseUrl = process.env.SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL || 'https://fygzdhkxvgsarihbppkq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PyBHJ0RKxfXw9J-NqTiLA_InzJpqE';

export const supabase = createClient(supabaseUrl, supabaseKey);

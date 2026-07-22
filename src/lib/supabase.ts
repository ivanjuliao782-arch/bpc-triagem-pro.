/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// No Frontend, usamos a ANON_KEY (Publishable)
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://fygzdhkxvgsarihbppkq.supabase.co';
const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_PyBHJ0RKxtFxw9J-NqTilA_InzJptYK';

export const supabase = createClient(supabaseUrl, supabaseKey);


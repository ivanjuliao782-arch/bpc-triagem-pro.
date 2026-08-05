import { SofiaEngine } from '../src/sofia';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

function testLocalNameExtraction() {
  const sofia = new SofiaEngine(supabase);
  
  const cases = [
    { input: "prazer joão", expected: "joão" },
    { input: "PRAZER JOÃO", expected: "joão" },
    { input: "muito prazer, sou a maria", expected: "maria" },
    { input: "satisfação, carlos", expected: "carlos" },
    { input: "eu sou o pedro", expected: "pedro" },
    { input: "meu nome é ana", expected: "ana" },
    { input: "me chamo roberto", expected: "roberto" }
  ];
  
  console.log('=== TESTE DE EXTRAÇÃO LOCAL DE NOME ===');
  for (const tc of cases) {
    const extracted = sofia.extrairNomePorCodigo(tc.input);
    console.log(`Input: "${tc.input}" -> Extraído: "${extracted}"`);
  }
}

testLocalNameExtraction();

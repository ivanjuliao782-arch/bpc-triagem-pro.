import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

async function findMichel() {
  const phone = '553284233201';
  console.log(`Searching for lead with phone: ${phone}`);
  const { data, error } = await supabase
    .from('sofia_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error) {
    console.error('Error fetching lead:', error);
  } else {
    console.log('Lead found:', JSON.stringify(data, null, 2));
  }
}

findMichel();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const phone = '553288746642'; // Let's check both with and without country code/symbols
  const variations = [phone, '553288746642@s.whatsapp.net', '+55 32 8874-6642', '3288746642'];
  
  for (const v of variations) {
    const { data, error } = await supabase
      .from('sofia_sessions')
      .select('*')
      .eq('phone', v);
    
    if (data && data.length > 0) {
      console.log(`FOUND SESSION for phone: ${v}`);
      console.log(JSON.stringify(data[0], null, 2));
      return;
    }
  }
  console.log('No session found in Supabase for Conceicao variations.');
}

check().catch(console.error);

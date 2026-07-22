import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "SELECT * FROM pg_policies WHERE tablename = 'sofia_sessions';"
  });

  if (error) {
    // Se execute_sql rpc não existir, faz outra query
    const { data: data2, error: error2 } = await supabase.from('sofia_sessions').select('*');
    console.error('RPC Error:', error.message);
  } else {
    console.log('Policies on sofia_sessions:');
    console.log(JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);

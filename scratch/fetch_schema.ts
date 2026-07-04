import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  console.log('Fetching schema from:', url);
  
  const response = await fetch(url);
  const json = await response.json();
  
  console.log('Available RPC functions:');
  const paths = Object.keys(json.paths);
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  console.log(rpcs);
}

run().catch(console.error);

import { supabase } from '../src/lib/supabase';

async function checkTable() {
  console.log('Checking if processed_messages table exists...');
  const { data, error } = await supabase
    .from('processed_messages')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Table check failed:', error.message);
  } else {
    console.log('✅ Table processed_messages exists and is accessible!');
    console.log('Data sample:', data);
  }
}

checkTable();

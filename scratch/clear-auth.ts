import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function clearAuthState() {
  console.log('🧹 Clearing WhatsApp auth state for "sofia_principal"...');
  
  const { data, error: fetchError } = await supabase
    .from('baileys_auth')
    .select('id')
    .like('id', 'sofia_principal_%');

  if (fetchError) {
    console.error('Error fetching auth keys:', fetchError);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No auth keys found for "sofia_principal".');
    return;
  }

  console.log(`Found ${data.length} auth records. Deleting...`);

  const { error: deleteError } = await supabase
    .from('baileys_auth')
    .delete()
    .like('id', 'sofia_principal_%');

  if (deleteError) {
    console.error('Error deleting auth keys:', deleteError);
  } else {
    console.log('✅ WhatsApp auth state cleared successfully!');
  }
}

clearAuthState();

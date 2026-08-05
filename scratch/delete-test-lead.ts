import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestLead() {
  const phone = '259004227956924';
  console.log(`Deleting test lead with phone ${phone}...`);
  const { data, error } = await supabase
    .from('sofia_sessions')
    .delete()
    .eq('phone', phone);

  if (error) {
    console.error('Error deleting test lead:', error.message);
  } else {
    console.log('✅ Test lead 259004227956924 successfully deleted from Supabase!');
  }
}

deleteTestLead();

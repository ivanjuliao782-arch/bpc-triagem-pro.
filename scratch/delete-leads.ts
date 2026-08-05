import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteLeads() {
  const phoneRivaldo = '553298296586';
  const phoneMichel = '553284233201';

  console.log('=== DELETING LEADS ===');

  // Delete Rivaldo
  const res1 = await supabase.from('sofia_sessions').delete().eq('phone', phoneRivaldo);
  if (res1.error) {
    console.error(`Error deleting Rivaldo (${phoneRivaldo}):`, res1.error);
  } else {
    console.log(`✅ Rivaldo (${phoneRivaldo}) deleted from sofia_sessions.`);
  }

  // Delete processed_messages for Rivaldo
  const res2 = await supabase.from('processed_messages').delete().eq('phone', phoneRivaldo);
  if (res2.error) {
    console.error(`Error deleting processed_messages for Rivaldo:`, res2.error);
  } else {
    console.log(`✅ Rivaldo processed messages cleared.`);
  }

  // Delete Michel
  const res3 = await supabase.from('sofia_sessions').delete().eq('phone', phoneMichel);
  if (res3.error) {
    console.error(`Error deleting Michel (${phoneMichel}):`, res3.error);
  } else {
    console.log(`✅ Michel (${phoneMichel}) deleted from sofia_sessions.`);
  }

  // Delete processed_messages for Michel
  const res4 = await supabase.from('processed_messages').delete().eq('phone', phoneMichel);
  if (res4.error) {
    console.error(`Error deleting processed_messages for Michel:`, res4.error);
  } else {
    console.log(`✅ Michel processed messages cleared.`);
  }

  console.log('=== DONE ===');
}

deleteLeads().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearSession() {
  const rawPhone = '553298296586';
  console.log(`Searching sessions for phone containing: ${rawPhone}`);

  // Query sessions that match or contain this number
  const { data: sessions, error: searchError } = await supabase
    .from('sofia_sessions')
    .select('*');

  if (searchError) {
    console.error('Error fetching sessions:', searchError.message);
    return;
  }

  // Filter sessions that have rawPhone anywhere in their phone field
  const targets = sessions.filter(s => s.phone.replace(/\D/g, '').includes(rawPhone));

  if (targets.length === 0) {
    console.log('No sessions found for this number.');
    return;
  }

  console.log(`Found ${targets.length} session(s) to clear:`);
  for (const t of targets) {
    console.log(`- ID: ${t.id}, Phone: ${t.phone}, User: ${t.user_data?.nome_usuario || 'N/A'}`);
    
    // Delete session
    const { error: deleteError } = await supabase
      .from('sofia_sessions')
      .delete()
      .eq('id', t.id);

    if (deleteError) {
      console.error(`Error deleting session ${t.id}:`, deleteError.message);
    } else {
      console.log(`✅ Session ${t.id} successfully deleted from sofia_sessions.`);
    }

    // Also clear processed_messages if any
    const { error: msgDeleteError } = await supabase
      .from('processed_messages')
      .delete()
      .ilike('message_id', `%${t.phone}%`);
    
    if (msgDeleteError) {
      console.log(`No processed_messages cleared or error: ${msgDeleteError.message}`);
    } else {
      console.log(`✅ Cleared message deduplication records for phone ${t.phone}.`);
    }
  }
}

clearSession();

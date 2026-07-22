import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const leads = [
    {
      phone: '5511999999991',
      step: 'finished',
      last_interaction: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 min ago
      user_data: {
        nome_usuario: 'Maria Silva',
        idade: 67,
        doenca: 'Artrite',
        status: 'novo_lead'
      }
    },
    {
      phone: '5511999999992',
      step: 'finished',
      last_interaction: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
      user_data: {
        nome_usuario: 'João Santos',
        idade: 72,
        doenca: 'Catarata',
        status: 'novo_lead'
      }
    },
    {
      phone: '5511999999993',
      step: 'finished',
      last_interaction: new Date().toISOString(), // now
      user_data: {
        nome_usuario: 'Ana Souza',
        idade: 60,
        doenca: 'Coluna',
        status: 'novo_lead'
      }
    }
  ];

  for (const lead of leads) {
    const { data, error } = await supabase.from('sofia_sessions').upsert(lead, { onConflict: 'phone' }).select();
    if (error) {
      console.error('Error inserting lead:', lead.phone, error);
    } else {
      console.log('Inserted lead:', lead.phone, data);
    }
  }
}

run().catch(console.error);

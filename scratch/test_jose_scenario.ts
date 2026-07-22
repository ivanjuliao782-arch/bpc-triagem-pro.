import { SofiaEngine } from '../src/sofia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTestJose() {
  const sofia = new SofiaEngine();
  const phone = 'test-jose-' + Date.now();

  console.log('\n==========================================');
  console.log('🤖 SIMULANDO CENÁRIO DO JOSÉ');
  console.log('==========================================');

  console.log('\nUser: "Oi boa noite. Meu nome é José. Tenho 68 anos e 27 de contribuição. Consigo aposentar doutora?"');
  let r1 = await sofia.processMessage(phone, 'Oi boa noite. Meu nome é José. Tenho 68 anos e 27 de contribuição. Consigo aposentar doutora?');
  console.log('Lara:', r1);

  console.log('\nUser: "Não senhora"');
  let r2 = await sofia.processMessage(phone, 'Não senhora');
  console.log('Lara:', r2);

  // Limpa sessão de teste
  await supabase.from('sofia_sessions').delete().eq('phone', phone);
  console.log('\n==========================================');
}

runTestJose().catch(console.error);

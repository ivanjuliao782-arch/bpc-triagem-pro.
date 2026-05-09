
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  console.log('Iniciando instalação da Sofia no Supabase...');

  const sql = `
    -- 1. Criar tipo ENUM para os passos do fluxo
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sofia_step') THEN
            CREATE TYPE sofia_step AS ENUM ('welcome', 'age', 'income', 'benefit', 'docs', 'finished');
        END IF;
    END $$;

    -- 2. Criar tabela de sessões
    CREATE TABLE IF NOT EXISTS sofia_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone TEXT UNIQUE NOT NULL,
      step sofia_step DEFAULT 'welcome',
      user_data JSONB DEFAULT '{}'::jsonb,
      last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 3. Criar index
    CREATE INDEX IF NOT EXISTS idx_sofia_sessions_phone ON sofia_sessions(phone);
  `;

  // No Supabase, para rodar SQL via JS, usamos a extensão 'pg_net' ou um RPC.
  // Como alternativa segura, vou te pedir para rodar o SQL uma única vez
  // enquanto eu preparo o restante do código.
  
  console.log('Script de instalação pronto.');
}

setup();

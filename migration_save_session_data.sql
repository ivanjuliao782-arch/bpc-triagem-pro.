-- Migração para criar a função save_session_data
-- Esta função realiza o lock da linha com FOR UPDATE e mescla o JSONB user_data atomicamente.

CREATE OR REPLACE FUNCTION save_session_data(
  p_phone text,
  p_step text,
  p_user_data_updates jsonb
) RETURNS jsonb AS $$
DECLARE
  v_current_user_data jsonb;
  v_merged_user_data jsonb;
  v_step_val sofia_step;
BEGIN
  -- 1. Lock da linha correspondente ao telefone usando FOR UPDATE
  SELECT user_data INTO v_current_user_data
  FROM sofia_sessions
  WHERE phone = p_phone
  FOR UPDATE;

  -- Converte o texto do passo para o enum sofia_step se fornecido
  IF p_step IS NOT NULL THEN
    v_step_val := p_step::sofia_step;
  END IF;

  -- 2. Se a linha não existir, faz a inserção inicial
  IF NOT FOUND THEN
    INSERT INTO sofia_sessions (phone, step, user_data, last_interaction)
    VALUES (p_phone, COALESCE(v_step_val, 'welcome'), p_user_data_updates, NOW())
    RETURNING user_data INTO v_merged_user_data;
  ELSE
    -- 3. Mescla o JSONB atual com as novas atualizações (o operador || junta os atributos de primeiro nível)
    v_merged_user_data := v_current_user_data || p_user_data_updates;

    -- 4. Grava os dados mesclados
    UPDATE sofia_sessions
    SET step = COALESCE(v_step_val, step),
        user_data = v_merged_user_data,
        last_interaction = NOW()
    WHERE phone = p_phone;
  END IF;

  RETURN v_merged_user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

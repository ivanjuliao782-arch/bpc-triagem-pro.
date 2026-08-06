import { execSync } from 'child_process';
import { SofiaEngine } from '../../src/sofia';
import dotenv from 'dotenv';
dotenv.config();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Asserção falhou: ${message}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO EXECUÇÃO DA SUÍTE UNIFICADA DE TESTES');
  console.log('====================================================');

  // 1. Executar unit-tests.ts
  console.log('\n[1/4] Executando Testes Unitários...');
  try {
    const out = execSync('npx tsx scratch/tests/unit-tests.ts', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Falha nos Testes Unitários.');
    process.exit(1);
  }

  // 2. Executar fsm-tests.ts
  console.log('\n[2/4] Executando Testes da FSM (Máquina de Estados)...');
  try {
    const out = execSync('npx tsx scratch/tests/fsm-tests.ts', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Falha nos Testes de FSM.');
    process.exit(1);
  }

  // 3. Executar verify-name-filters.ts
  console.log('\n[3/4] Executando Testes de Validação de Nome...');
  try {
    const out = execSync('npx tsx scratch/tests/verify-name-filters.ts', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Falha nos Testes de Validação de Nome.');
    process.exit(1);
  }

  // 4. Executar Teste de Pensão por Morte (Inline)
  console.log('\n[4/4] Executando Teste de Pensão por Morte (Rejeição)...');
  try {
    const sofia = new SofiaEngine();
    let savedUserData: any = null;

    // Mock do Supabase para criar uma nova sessão do zero
    (sofia as any).supabase = {
      rpc: async (name: string, args: any) => {
        if (name === 'save_session_data') {
          savedUserData = args.p_user_data_updates;
        }
        return { data: args.p_user_data_updates, error: null };
      },
      from: (tableName: string) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }) // sem sessão pré-existente
          })
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ error: null })
          })
        })
      })
    };

    let sentReply = "";
    const mockSendCallback = async (msg: string) => {
      sentReply = msg;
      return true;
    };

    // Processa a mensagem que menciona "pensão por morte"
    const reply = await sofia.processMessage(
      "553200000005",
      "Quero dar entrada em pensão por morte porque meu esposo faleceu",
      mockSendCallback
    );

    console.log(`Resposta obtida: "${reply}"`);
    assert(reply.includes("Infelizmente nosso escritório não atua com pensão por morte"), "Deveria conter a mensagem de rejeição de pensão");
    assert(savedUserData !== null, "Deveria ter salvo os dados da sessão");
    assert(savedUserData.state_fsm === 'FINISHED', "Deveria mover o estado da FSM para FINISHED");
    assert(savedUserData.status_final === 'pensao_por_morte', "Deveria marcar status_final como pensao_por_morte");
    assert(savedUserData.score_total === 0, "O score previdenciário de pensão por morte deve ser zero");

    console.log('✅ Teste de Pensão por Morte passou com sucesso!');
  } catch (err: any) {
    console.error('❌ Falha no Teste de Pensão por Morte:', err.message);
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 TODAS AS VERIFICAÇÕES PASSARAM COM SUCESSO!');
  console.log('====================================================');
}

runAllTests().catch(err => {
  console.error(err);
  process.exit(1);
});

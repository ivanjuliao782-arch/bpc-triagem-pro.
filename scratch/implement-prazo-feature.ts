import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function implementPrazo() {
  if (!fs.existsSync(file)) {
    console.error('sofia.ts not found');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  // Normalize CRLF to LF
  const isCRLF = content.includes('\r\n');
  if (isCRLF) {
    content = content.replace(/\r\n/g, '\n');
  }

  // 1. Insert detecting function
  const functionTarget = `  detectarPerguntaValor(text: string): boolean {
    const cleanText = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    return /\\b(quanto cobra|quanto e|quanto custa|valor|preco|custo|taxa|honorario|paga|pagar|pagamento|pagamentos|cobranca|cobrancas|cobra quanto|qual o valor|quais os valores|tem que pagar|pegar pelo|pegar para|pegar por|e de graca|e gratuito)\\b/i.test(cleanText);
  }`;

  const functionReplacement = `  detectarPerguntaValor(text: string): boolean {
    const cleanText = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    return /\\b(quanto cobra|quanto e|quanto custa|valor|preco|custo|taxa|honorario|paga|pagar|pagamento|pagamentos|cobranca|cobrancas|cobra quanto|qual o valor|quais os valores|tem que pagar|pegar pelo|pegar para|pegar por|e de graca|e gratuito)\\b/i.test(cleanText);
  }

  detectarPerguntaPrazo(text: string): boolean {
    const cleanText = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    return /\\b(hoje ainda|hoje mesmo|semana que vem|quanto tempo demora|quando voc(e|ê)s|em quanto tempo|prazo de atendimento|prazo pra|quando posso esperar)\\b/i.test(cleanText);
  }`;

  if (content.includes(functionTarget)) {
    content = content.replace(functionTarget, functionReplacement);
    console.log('✅ detectarPerguntaPrazo function definition added.');
  } else {
    console.error('❌ Target function block not found in sofia.ts');
  }

  // 2. Insert call guard before valor guard
  const guardTarget = `    // GUARDA DETERMINÍSTICO PARA VALOR / HONORÁRIOS
    if (this.detectarPerguntaValor(text)) {`;

  const guardReplacement = `    // GUARDA DETERMINÍSTICO PARA PRAZO / ATENDIMENTO
    if (this.detectarPerguntaPrazo(text)) {
      const nome = user_data.nome_usuario ? \`, \${user_data.nome_usuario}\` : "";
      const familiar = user_data.beneficiario_terceiro;
      
      // Pega a pergunta correspondente ao estado atual
      let dryQuestion = "";
      if (stateFsm === 'AWAITING_NAME') {
        dryQuestion = "Boa tarde! Tudo bem?\\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?";
      } else if (resolved.fluxo_ativo === 'EXCECAO') {
        dryQuestion = EXCECAO_QUESTIONS[Math.floor(Math.random() * EXCECAO_QUESTIONS.length)];
      } else {
        let questionsList = STATE_QUESTIONS[stateFsm];
        if (stateFsm === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
          const moraSozinho = user_data.bpc_pessoas_casa && (
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('sozinh') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro só') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro so') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro solo') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('vivo só') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('vivo so') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('apenas eu') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('somente eu') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('só eu') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('so eu') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('eu mesmo') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('eu mesma') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('eu sozinho') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('eu sozinha') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('ninguem mais') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('ninguém mais') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro sem ninguem') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('não moro com ninguém') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('nao moro com ninguem') ||
            String(user_data.bpc_pessoas_casa).toLowerCase() === 'eu' ||
            String(user_data.bpc_pessoas_casa).toLowerCase() === 'so' ||
            String(user_data.bpc_pessoas_casa).toLowerCase() === 'só' ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('1 pessoa') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('uma pessoa') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro individual') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('resido só') ||
            String(user_data.bpc_pessoas_casa).toLowerCase().includes('resido so')
          );
          if (moraSozinho) {
            questionsList = ["Você recebe algum dinheiro? Bolsa família, pensão, aposentadoria ou alguma outra renda?"];
          }
        }
        dryQuestion = questionsList ? questionsList[Math.floor(Math.random() * questionsList.length)] : "";
      }

      // Se houver familiar, adapta
      if (familiar) {
        const fem = ['filha', 'esposa', 'mãe', 'neta', 'irmã', 'avó', 'tia', 'sogra', 'sobrinha', 'nora', 'enteada', 'companheira'].includes(familiar.toLowerCase());
        const art = fem ? 'A sua' : 'O seu';
        const artLC = fem ? 'sua' : 'seu';
        const prep = fem ? 'da' : 'do';
        const pron = fem ? 'ela' : 'ele';
        const pronPoss = fem ? 'dela' : 'dele';

        if (stateFsm === 'AWAITING_LAWYER') {
          dryQuestion = \`\${art} \${familiar} já tem advogado cuidando do caso?\`;
        } else if (stateFsm === 'LAWYER_CHECK_ACTION') {
          dryQuestion = \`Esse advogado já entrou com ação na Justiça em nome \${prep} \${artLC} \${familiar} ou só deu entrada no INSS?\`;
        } else if (stateFsm === 'LAWYER_CHECK_CONTRACT') {
          dryQuestion = \`\${art} \${familiar} chegou a assinar contrato com esse advogado?\`;
        } else if (stateFsm === 'LAWYER_CHECK_PROCURACAO') {
          dryQuestion = \`\${art} \${familiar} assinou procuração para esse advogado representar \${pron}?\`;
        } else if (stateFsm === 'AWAITING_AGE') {
          dryQuestion = \`Qual a idade \${prep} \${artLC} \${familiar}?\`;
        } else if (stateFsm === 'AWAITING_DISEASE') {
          dryQuestion = \`\${art} \${familiar} tem alguma doença atualmente?\`;
        } else if (stateFsm === 'AWAITING_DISABILITY') {
          dryQuestion = \`\${art} \${familiar} tem alguma deficiência?\`;
        } else if (stateFsm === 'AWAITING_TOTAL_CONTRIBUTION') {
          dryQuestion = \`\${art} \${familiar} já trabalhou de carteira assinada ou contribuiu para o INSS?\`;
        } else if (stateFsm === 'AWAITING_CURRENT_CONTRIBUTION') {
          dryQuestion = \`Como está a rotina de trabalho \${prep} \${artLC} \${familiar} hoje em dia? \${pron.toUpperCase()} está conseguindo trabalhar?\`;
        } else if (stateFsm === 'AWAITING_LAST_CONTRIBUTION_TIME') {
          dryQuestion = \`Tem quanto tempo que \${art.toLowerCase()} \${familiar} se afastou ou parou de trabalhar?\`;
        } else if (stateFsm === 'INSS_AWAITING_EMPLOYMENT_TYPE') {
          dryQuestion = \`Como \${art.toLowerCase()} \${familiar} contribuía para o INSS? Era por carteira assinada, carnê ou MEI?\`;
        } else if (stateFsm === 'INSS_AWAITING_LAST_CONTRIBUTION') {
          dryQuestion = \`Tem quanto tempo que \${art.toLowerCase()} \${familiar} se afastou? Foi em que ano?\`;
        } else if (stateFsm === 'INSS_AWAITING_REPORTS') {
          dryQuestion = \`\${art} \${familiar} possui exames, receitas ou laudos médicos recentes?\`;
        } else if (stateFsm === 'BPC_AWAITING_HOUSEHOLD') {
          dryQuestion = \`Quem mora com \${art.toLowerCase()} \${familiar} na casa \${pronPoss} hoje?\`;
        } else if (stateFsm === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
          dryQuestion = \`Das pessoas que moram com \${art.toLowerCase()} \${familiar}, alguém trabalha ou recebe algum dinheiro?\`;
        } else if (stateFsm === 'BPC_AWAITING_HOME_STATUS') {
          dryQuestion = \`A casa \${prep} \${artLC} \${familiar} é própria, alugada ou cedida?\`;
        } else if (stateFsm === 'BPC_AWAITING_CADUNICO') {
          dryQuestion = \`\${art} \${familiar} possui CadÚnico atualizado?\`;
        }
      }

      // Se o estado for AWAITING_AGE e is_recoverable for true, usa a pergunta otimizada comercialmente!
      const transitionAlreadySent = history.some((h: any) => h.role === 'assistant' && h.content.includes("é bem comum o pedido ficar só no INSS mesmo"));
      if (stateFsm === 'AWAITING_AGE' && user_data.is_recoverable === true && !transitionAlreadySent) {
        if (familiar) {
          const fem = ['filha', 'esposa', 'mãe', 'neta', 'irmã', 'avó', 'tia', 'sogra', 'sobrinha', 'nora', 'enteada', 'companheira'].includes(familiar.toLowerCase());
          const art = fem ? 'a sua' : 'o seu';
          const artLC = fem ? 'sua' : 'seu';
          const prep = fem ? 'da' : 'do';
          dryQuestion = \`Entendi\${nome}. Nesse caso é bem comum o pedido ficar só no INSS mesmo e acabar demorando ou sendo negado.\\n\\nAqui no escritório a gente analisa justamente se existe uma forma mais rápida ou segura de conseguir esse benefício para \${art} \${familiar}.\\n\\nPra eu te orientar melhor, qual a idade \${prep} \${artLC} \${familiar}?\`;
        } else {
          dryQuestion = \`Entendi\${nome}. Nesse caso é bem comum o pedido ficar só no INSS mesmo e acabar demorando ou sendo negado.\\n\\nAqui no escritório a gente analisa justamente se existe uma forma mais rápida ou segura de conseguir esse benefício.\\n\\nPra eu te orientar melhor, qual a sua idade?\`;
        }
      }

      const cleanText = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
      const calledWrongName = /\\b(doutora|dra|senhora|senhor|moca)\\b/i.test(cleanText);
      const ehPrimeiraMensagem = !history || history.length === 0;
      let prefixoCorrecao = "";
      if (calledWrongName && !ehPrimeiraMensagem) {
        prefixoCorrecao = "Pode me chamar de Lara. ";
      }

      const reply = \`\${prefixoCorrecao}Vou registrar todo o seu caso agora. Nossa equipe analisa com cuidado e retorna dentro de alguns instantes.\\n\\n\${dryQuestion}\`;
      const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }];

      const updates = {
        ...user_data,
        history: newHistory,
        state_fsm: stateFsm
      };

      await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: session?.step || 'welcome',
        p_user_data_updates: updates
      });

      console.log(\`[INSTRUMENTAÇÃO] [\${new Date().toISOString()}] [Lead: \${phone}] 9. Resposta de prazo enviada: "\${reply}"\`);
      return reply;
    }

    // GUARDA DETERMINÍSTICO PARA VALOR / HONORÁRIOS
    if (this.detectarPerguntaValor(text)) {`;

  if (content.includes(guardTarget)) {
    content = content.replace(guardTarget, guardReplacement);
    console.log('✅ detectarPerguntaPrazo call guard added before valor guard.');
  } else {
    console.error('❌ guardTarget not found in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with deadline/prazo feature!');
}

implementPrazo();

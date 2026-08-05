import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyMarciaFixes() {
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

  // 1. Grab initialUserData block to inject initial empathy flag
  const initialUserTarget = `        const initialUserData = {
          history: [
            { role: 'user', content: text },
            { role: 'assistant', content: finalReply }
          ],
          state_fsm: 'AWAITING_NAME',
          ...extractedData
        };`;

  const initialUserReplacement = `        const initialUserData = {
          history: [
            { role: 'user', content: text },
            { role: 'assistant', content: finalReply }
          ],
          state_fsm: 'AWAITING_NAME',
          ultimo_sofrimento_com_empatia: extractedData.doenca || extractedData.sofrimento_relatado || 'inicial',
          ...extractedData
        };`;

  if (content.includes(initialUserTarget)) {
    content = content.replace(initialUserTarget, initialUserReplacement);
    console.log('✅ initialUserData updated with initial empathy flag.');
  } else {
    console.error('❌ initialUserTarget not found');
  }

  // 2. Update smart empathy comparison in AWAITING_DISABILITY bypass block
  const empathyBypassTarget = `      const cleanSofrimento = sofrimentoAtualParaComparacao.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      const cleanUltimo = String(ultimoComEmpatia).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      const jaMostrouEmpatia = cleanUltimo !== "" && (cleanSofrimento.includes(cleanUltimo) || cleanUltimo.includes(cleanSofrimento));

      if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || !jaMostrouEmpatia)) {`;

  const empathyBypassReplacement = `      const jaEnviouEmpatia = !!user_data.ultimo_sofrimento_com_empatia;

      if ((temCorteOuProblema || temDesesperoFinanceiro) && !jaEnviouEmpatia) {`;

  if (content.includes(empathyBypassTarget)) {
    content = content.replace(empathyBypassTarget, empathyBypassReplacement);
    console.log('✅ AWAITING_DISABILITY bypass empathy changed to single-trigger.');
  } else {
    console.error('❌ empathyBypassTarget not found');
  }

  // 3. Update smart empathy comparison in handleStepWithAI block
  const empathyMainTarget = `    const cleanSofrimento = sofrimentoAtualParaComparacao.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    const cleanUltimo = String(ultimoComEmpatia).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    const jaMostrouEmpatia = cleanUltimo !== "" && (cleanSofrimento.includes(cleanUltimo) || cleanUltimo.includes(cleanSofrimento));

    if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || !jaMostrouEmpatia)) {`;

  const empathyMainReplacement = `    const jaEnviouEmpatia = !!user_data.ultimo_sofrimento_com_empatia;

    if ((temCorteOuProblema || temDesesperoFinanceiro) && !jaEnviouEmpatia) {`;

  if (content.includes(empathyMainTarget)) {
    content = content.replace(empathyMainTarget, empathyMainReplacement);
    console.log('✅ handleStepWithAI empathy changed to single-trigger.');
  } else {
    console.error('❌ empathyMainTarget not found');
  }

  // 4. Update the prompt to tell LLM not to show empathy if already shown once
  const promptTarget = `const promptSofia = \`Você é Lara, atendente humana do escritório de advocacia previdenciária da Dra. Mônica Lucioli.`;
  const promptReplacement = `const promptSofia = \`Você é Lara, atendente humana do escritório de advocacia previdenciária da Dra. Mônica Lucioli.
Empatia/Acolhimento de dor ou doença já demonstrado nesta conversa: \${user_data.ultimo_sofrimento_com_empatia ? "SIM (É TERMINANTEMENTE PROIBIDO repetir ou iniciar sua resposta com frases de empatia como 'sinto muito', 'que situação difícil', 'poxa', etc. Vá direto à pergunta!)" : "NÃO"}`;

  if (content.includes(promptTarget)) {
    content = content.replace(promptTarget, promptReplacement);
    console.log('✅ promptSofia updated with dynamic empathy state.');
  } else {
    console.error('❌ promptTarget not found');
  }

  // 5. Restrict isClosingReply to the end of the triages
  const isClosingReplyTarget = `    const isClosingReply = /(entrar[aã]o?\\s+em\\s+contato|encaminhar\\s+(suas\\s+informações|seu\\s+caso)|nossa\\s+equipe\\s+pode\\s+te\\s+ajudar)/i.test(finalReply);
    if (isClosingReply) {
      console.log(\`[FSM FORCE FINISHED] Forçando estado FSM para FINISHED pois a resposta da IA é de encerramento.\`);
      finalState = 'FINISHED';
    }`;

  const isClosingReplyReplacement = `    const isClosingReply = /(entrar[aã]o?\\s+em\\s+contato|encaminhar\\s+(suas\\s+informações|seu\\s+caso)|nossa\\s+equipe\\s+pode\\s+te\\s+ajudar)/i.test(finalReply);
    if (isClosingReply && (finalState === 'FINISHED' || finalState === 'AWAITING_REPORTS' || finalState === 'INSS_AWAITING_REPORTS' || finalState === 'BPC_AWAITING_CADUNICO')) {
      console.log(\`[FSM FORCE FINISHED] Forçando estado FSM para FINISHED pois a resposta da IA é de encerramento.\`);
      finalState = 'FINISHED';
    }`;

  if (content.includes(isClosingReplyTarget)) {
    content = content.replace(isClosingReplyTarget, isClosingReplyReplacement);
    console.log('✅ isClosingReply restricted to exit states.');
  } else {
    console.error('❌ isClosingReplyTarget not found');
  }

  // 6. Update the bpc_renda_familiar description in the prompt of runExtraction
  const bpcRendaPromptTarget = `- bpc_renda_familiar: (boolean ou null) Se o cliente ou alguém na casa dele possui renda, salário, pensão, benefício, aposentadoria ou faz bicos/trabalho informal (true se tiver alguma renda/receber dinheiro/fizer bicos/trabalho, false se disser que não recebe nada, não tem renda ou usar expressões como "quem me dera", e null se não for mencionado). ATENÇÃO: Ajuda financeira informal, doações ou mesadas de parentes/filhos que NÃO moram na mesma casa NÃO devem ser consideradas renda (retorne false ou null).`;
  
  const bpcRendaPromptReplacement = `- bpc_renda_familiar: (boolean ou null) Se o cliente ou alguém na casa dele possui renda, salário, pensão, benefício, aposentadoria ou faz bicos/trabalho informal (true se tiver alguma renda/receber dinheiro/fizer bicos/trabalho, false se disser que não recebe nada, não tem renda ou usar expressões como "quem me dera", e null se não for mencionado). ATENÇÃO: Ajuda financeira informal, doações ou mesadas de parentes/filhos que NÃO moram na mesma casa NÃO devem ser consideradas renda. Além disso, no BPC, parentes como genro, nora, netos, tios e primos NÃO fazem parte do grupo familiar legal. Se apenas o genro, nora, netos ou tios possuírem renda na casa, retorne false para bpc_renda_familiar (pois a renda do grupo familiar legal é zero).`;

  if (content.includes(bpcRendaPromptTarget)) {
    content = content.replace(bpcRendaPromptTarget, bpcRendaPromptReplacement);
    console.log('✅ bpc_renda_familiar prompt description updated for BPC family group rules.');
  } else {
    console.error('❌ bpcRendaPromptTarget not found');
  }

  // 7. Update sanitizeExtractedData to ignore genro/nora/netos/tios/primos income
  const sanitizeRendaTarget = `      } else if (/\\b(sim|recebo|recebe|recebem|receber|ganho|ganha|ganham|ganhar|trabalha|trabalham|trabalhar|bolsa|pensao|aposentadoria|aposentado|aposentada|pensionista|bpc|loas|ajuda|salario|renda|auxilio|bico|bicos)\\b/.test(clean)) {
        data.bpc_renda_familiar = true;
      }`;

  const sanitizeRendaReplacement = `      } else if (/\\b(sim|recebo|recebe|recebem|receber|ganho|ganha|ganham|ganhar|trabalha|trabalham|trabalhar|bolsa|pensao|aposentadoria|aposentado|aposentada|pensionista|bpc|loas|ajuda|salario|renda|auxilio|bico|bicos)\\b/.test(clean)) {
        const mentionsGenroNoraNeto = /\\b(genro|nora|neto|neta|netos|netas|tio|tia|tios|tias|primo|prima|primos|primas)\\b/i.test(clean);
        const mentionsFamilyGroup = /\\b(eu|filho|filha|filhos|filhas|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/i.test(clean);
        if (mentionsGenroNoraNeto && !mentionsFamilyGroup && /\\b(so|apenas|somente|unico|unica)\\b/i.test(clean)) {
          data.bpc_renda_familiar = false;
          data.bpc_quem_renda = 'nenhuma (apenas genro/nora/neto)';
        } else {
          data.bpc_renda_familiar = true;
        }
      }`;

  if (content.includes(sanitizeRendaTarget)) {
    content = content.replace(sanitizeRendaTarget, sanitizeRendaReplacement);
    console.log('✅ sanitizeExtractedData updated for BPC family group rules.');
  } else {
    console.error('❌ sanitizeRendaTarget not found');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with all Marcia and single-trigger empathy fixes!');
}

applyMarciaFixes();
export {};

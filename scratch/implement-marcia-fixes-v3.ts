import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyMarciaFixesV3() {
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

  // 1. Fix line 2214 and 2453 (use || 'enviado')
  const line2214Target = `        user_data.ultimo_sofrimento_com_empatia = sofrimentoAtualParaComparacao;`;
  const line2214Replacement = `        user_data.ultimo_sofrimento_com_empatia = sofrimentoAtualParaComparacao || 'enviado';`;
  if (content.includes(line2214Target)) {
    content = content.replace(line2214Target, line2214Replacement);
    console.log('✅ Line 2214 updated to guarantee truthy empathy value.');
  }

  const line2453Target = `      user_data.ultimo_sofrimento_com_empatia = sofrimentoAtualParaComparacao;`;
  const line2453Replacement = `      user_data.ultimo_sofrimento_com_empatia = sofrimentoAtualParaComparacao || 'enviado';`;
  if (content.includes(line2453Target)) {
    content = content.replace(line2453Target, line2453Replacement);
    console.log('✅ Line 2453 updated to guarantee truthy empathy value.');
  }

  // 2. Fix regex for empathy replacement to include optional leading spaces/newlines (^\s*)
  const regexTarget1 = `      if (jaEnviouEmpatia) {
        reply = reply.replace(/^(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade|que você esteja passando por essa dor)\\.?\\s*|Que situação difícil, sinto muito\\.?\\s*|Poxa, isso é muito pesado\\.?\\s*)+/gi, '');
      }`;
  const regexReplacement1 = `      if (jaEnviouEmpatia) {
        reply = reply.replace(/^\\s*(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade|que você esteja passando por essa dor)\\.?\\s*|Que situação difícil, sinto muito\\.?\\s*|Poxa, isso é muito pesado\\.?\\s*)+/gi, '');
      }`;
  if (content.includes(regexTarget1)) {
    content = content.replace(regexTarget1, regexReplacement1);
    console.log('✅ Empathy regex 1 updated with leading whitespace support.');
  }

  const regexTarget2 = `    if (jaEnviouEmpatia) {
      finalReply = finalReply.replace(/^(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade|que você esteja passando por essa dor)\\.?\\s*|Que situação difícil, sinto muito\\.?\\s*|Poxa, isso é muito pesado\\.?\\s*)+/gi, '');
    }`;
  const regexReplacement2 = `    if (jaEnviouEmpatia) {
      finalReply = finalReply.replace(/^\\s*(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade|que você esteja passando por essa dor)\\.?\\s*|Que situação difícil, sinto muito\\.?\\s*|Poxa, isso é muito pesado\\.?\\s*)+/gi, '');
    }`;
  if (content.includes(regexTarget2)) {
    content = content.replace(regexTarget2, regexReplacement2);
    console.log('✅ Empathy regex 2 updated with leading whitespace support.');
  }

  // 3. Make BPC income check global + negation extraction
  const bpcIncomeTarget = `    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME)
    if (currentState === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
      if (
        /\\b(nao|nada|nenhuma|nenhum|nunca|sem renda|quem me dera|nao recebo|recebo nao|infelizmente nao)\\b/.test(clean) ||
        clean.includes("quem me dera") ||
        clean.includes("nao tenho renda") ||
        clean.includes("nao ganho nada")
      ) {
        data.bpc_renda_familiar = false;
        data.bpc_quem_renda = 'nenhuma';
      } else if (/\\b(sim|recebo|recebe|recebem|receber|ganho|ganha|ganham|ganhar|trabalha|trabalham|trabalhar|bolsa|pensao|aposentadoria|aposentado|aposentada|pensionista|bpc|loas|ajuda|salario|renda|auxilio|bico|bicos)\\b/.test(clean)) {
        const mentionsGenroNoraNeto = /\\b(genro|nora|neto|neta|netos|netas|tio|tia|tios|tias|primo|prima|primos|primas)\\b/i.test(clean);
        const mentionsFamilyGroup = /\\b(eu|filho|filha|filhos|filhas|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/i.test(clean);
        if (mentionsGenroNoraNeto && !mentionsFamilyGroup) {
          data.bpc_renda_familiar = false;
          data.bpc_quem_renda = 'nenhuma (apenas genro/nora/neto)';
        } else {
          data.bpc_renda_familiar = true;
        }
      }
    }`;

  const bpcIncomeReplacement = `    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME) - Extração Global com suporte a negação
    const mentionsIncomeKeywords = /\\b(renda|recebo|recebe|salario|trabalha|trabalham|bico|bicos|aposentador|pensao|ganha|ganham|ajuda financeira)\\b/i.test(clean);
    if (currentState === 'BPC_AWAITING_HOUSEHOLD_INCOME' || mentionsIncomeKeywords) {
      if (
        /\\b(nao|nada|nenhuma|nenhum|nunca|sem renda|quem me dera|nao recebo|recebo nao|infelizmente nao)\\b/.test(clean) ||
        clean.includes("quem me dera") ||
        clean.includes("nao tenho renda") ||
        clean.includes("nao ganho nada")
      ) {
        data.bpc_renda_familiar = false;
        data.bpc_quem_renda = 'nenhuma';
      } else if (/\\b(sim|recebo|recebe|recebem|receber|ganho|ganha|ganham|ganhar|trabalha|trabalham|trabalhar|bolsa|pensao|aposentadoria|aposentado|aposentada|pensionista|bpc|loas|ajuda|salario|renda|auxilio|bico|bicos)\\b/.test(clean)) {
        // Remove membros do grupo familiar que foram negados (ex: "filha nao", "marido nao trabalha")
        let cleanNormalized = clean
          .replace(/\\b(filha|filho|filhas|filhos|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\s+(nao|nunca|sem|desempregad[oa]s?|parou|parados?|trabalha\\s+nao)\\b/gi, '')
          .replace(/\\b(nao|nunca|sem|desempregad[oa]s?|parou|parados?)\\s+(trabalha\\s+)?(filha|filho|filhas|filhos|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/gi, '');

        const mentionsGenroNoraNeto = /\\b(genro|nora|neto|neta|netos|netas|tio|tia|tios|tias|primo|prima|primos|primas)\\b/i.test(cleanNormalized);
        const mentionsFamilyGroup = /\\b(eu|filho|filha|filhos|filhas|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/i.test(cleanNormalized);
        
        if (mentionsGenroNoraNeto && !mentionsFamilyGroup) {
          data.bpc_renda_familiar = false;
          data.bpc_quem_renda = 'nenhuma (apenas genro/nora/neto)';
        } else {
          data.bpc_renda_familiar = true;
        }
      }
    }`;

  if (content.includes(bpcIncomeTarget)) {
    content = content.replace(bpcIncomeTarget, bpcIncomeReplacement);
    console.log('✅ BPC income check updated globally with negation stripping.');
  } else {
    console.error('❌ bpcIncomeTarget not found in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with V3 Marcia improvements!');
}

applyMarciaFixesV3();
export {};

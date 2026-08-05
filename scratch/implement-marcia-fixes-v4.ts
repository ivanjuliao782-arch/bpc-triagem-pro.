import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyMarciaFixesV4() {
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

  // 1. Replace the BPC income block with the V4 version
  const bpcIncomeTarget = `    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME) - Extração Global com suporte a negação
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

  const bpcIncomeReplacement = `    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME) - Extração Global com suporte a negação e elipse
    const mentionsIncomeKeywords = /\\b(renda|recebo|recebe|salario|trabalha|trabalham|bico|bicos|aposentador|pensao|ganha|ganham|ajuda financeira)\\b/i.test(clean);
    const mentionsGenroOrFamily = /\\b(genro|nora|neto|neta|netos|netas|tio|tia|tios|tias|primo|prima|primos|primas|filha|filho|filhas|filhos|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/i.test(clean);

    if (currentState === 'BPC_AWAITING_HOUSEHOLD_INCOME' || mentionsIncomeKeywords || mentionsGenroOrFamily) {
      if (
        /\\b(nao|nada|nenhuma|nenhum|nunca|sem renda|quem me dera|nao recebo|recebo nao|infelizmente nao)\\b/.test(clean) ||
        clean.includes("quem me dera") ||
        clean.includes("nao tenho renda") ||
        clean.includes("nao ganho nada")
      ) {
        data.bpc_renda_familiar = false;
        data.bpc_quem_renda = 'nenhuma';
      } else {
        // Remove membros do grupo familiar que foram negados (ex: "filha nao", "marido nao trabalha")
        let cleanNormalized = clean
          .replace(/\\b(filha|filho|filhas|filhos|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\s+(nao|nunca|sem|desempregad[oa]s?|parou|parados?|trabalha\\s+nao)\\b/gi, '')
          .replace(/\\b(nao|nunca|sem|desempregad[oa]s?|parou|parados?)\\s+(trabalha\\s+)?(filha|filho|filhas|filhos|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/gi, '');

        const mentionsGenroNoraNeto = /\\b(genro|nora|neto|neta|netos|netas|tio|tia|tios|tias|primo|prima|primos|primas)\\b/i.test(cleanNormalized);
        const mentionsFamilyGroup = /\\b(eu|filho|filha|filhos|filhas|marido|esposo|esposa|mae|pai|irmao|irma|irmaos|irmas|companheiro|companheira|conjuge)\\b/i.test(cleanNormalized);
        
        if (mentionsGenroNoraNeto && !mentionsFamilyGroup) {
          data.bpc_renda_familiar = false;
          data.bpc_quem_renda = 'nenhuma (apenas genro/nora/neto)';
        } else if (mentionsFamilyGroup || /\\b(sim|recebo|recebe|recebem|receber|ganho|ganha|ganham|ganhar|trabalha|trabalham|trabalhar|bolsa|pensao|aposentadoria|aposentado|aposentada|pensionista|bpc|loas|ajuda|salario|renda|auxilio|bico|bicos)\\b/.test(clean)) {
          data.bpc_renda_familiar = true;
        }
      }
    }`;

  if (content.includes(bpcIncomeTarget)) {
    content = content.replace(bpcIncomeTarget, bpcIncomeReplacement);
    console.log('✅ BPC income check globally updated with negation and ellipsis support.');
  } else {
    console.error('❌ bpcIncomeTarget not found in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with V4 Marcia improvements!');
}

applyMarciaFixesV4();
export {};

import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyMarciaFixesV2() {
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

  // 1. Strip empathy in AWAITING_DISABILITY bypass block if already sent
  const bypassTarget = `      const reply = confirmPrefixToPrepend ? \`\${confirmPrefixToPrepend}\${selectedQuestion}\` : selectedQuestion;`;
  const bypassReplacement = `      let reply = confirmPrefixToPrepend ? \`\${confirmPrefixToPrepend}\${selectedQuestion}\` : selectedQuestion;
      if (jaEnviouEmpatia) {
        reply = reply.replace(/^(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade|que você esteja passando por essa dor)\\.?\\s*|Que situação difícil, sinto muito\\.?\\s*|Poxa, isso é muito pesado\\.?\\s*)+/gi, '');
      }`;

  if (content.includes(bypassTarget)) {
    content = content.replace(bypassTarget, bypassReplacement);
    console.log('✅ AWAITING_DISABILITY bypass empathy stripping added.');
  } else {
    console.error('❌ bypassTarget not found');
  }

  // 2. Strip empathy in handleStepWithAI if already sent
  const mainTarget = `    // Injeção de saudação calorosa ao transitar para a pergunta de advogado`;
  const mainReplacement = `    if (jaEnviouEmpatia) {
      finalReply = finalReply.replace(/^(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade|que você esteja passando por essa dor)\\.?\\s*|Que situação difícil, sinto muito\\.?\\s*|Poxa, isso é muito pesado\\.?\\s*)+/gi, '');
    }

    // Injeção de saudação calorosa ao transitar para a pergunta de advogado`;

  if (content.includes(mainTarget)) {
    content = content.replace(mainTarget, mainReplacement);
    console.log('✅ handleStepWithAI empathy stripping added.');
  } else {
    console.error('❌ mainTarget not found');
  }

  // 3. Prevent overwriting of beneficiario_terceiro and nome_usuario once established
  const sanitizeTarget = `    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME)`;
  const sanitizeReplacement = `    // Proteção de Sobrescrita: impede que menções no meio do fluxo alterem o beneficiário ou nome do lead
    if (currentState && currentState !== 'AWAITING_NAME' && currentState !== 'welcome') {
      if (userData.beneficiario_terceiro) {
        delete data.beneficiario_terceiro;
      }
      if (userData.nome_usuario) {
        delete data.nome_usuario;
      }
    }

    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME)`;

  if (content.includes(sanitizeTarget)) {
    content = content.replace(sanitizeTarget, sanitizeReplacement);
    console.log('✅ Overwrite protections for beneficiary and name added.');
  } else {
    console.error('❌ sanitizeTarget not found');
  }

  // 4. Update sanitizeExtractedData for BPC renda to handle genro/nora/neto more loosely (without needing "só")
  const sanitizeRendaTarget = `        if (mentionsGenroNoraNeto && !mentionsFamilyGroup && /\\b(so|apenas|somente|unico|unica)\\b/i.test(clean)) {
          data.bpc_renda_familiar = false;
          data.bpc_quem_renda = 'nenhuma (apenas genro/nora/neto)';
        } else {
          data.bpc_renda_familiar = true;
        }`;

  const sanitizeRendaReplacement = `        if (mentionsGenroNoraNeto && !mentionsFamilyGroup) {
          data.bpc_renda_familiar = false;
          data.bpc_quem_renda = 'nenhuma (apenas genro/nora/neto)';
        } else {
          data.bpc_renda_familiar = true;
        }`;

  if (content.includes(sanitizeRendaTarget)) {
    content = content.replace(sanitizeRendaTarget, sanitizeRendaReplacement);
    console.log('✅ sanitizeExtractedData updated to loosely ignore genro/nora/neto.');
  } else {
    console.error('❌ sanitizeRendaTarget not found');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with V2 Marcia protections!');
}

applyMarciaFixesV2();
export {};

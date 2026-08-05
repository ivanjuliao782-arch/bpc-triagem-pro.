import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyDisabilityEmpathy() {
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

  const targetBlock = `    if (stateFsm === 'AWAITING_DISABILITY') {
      const selectedQuestion = familiar 
        ? \`O seu \${familiar} tem alguma deficiência física, visual, auditiva ou motora?\`
        : "Você tem alguma deficiência física, visual, auditiva ou motora?";
      const reply = confirmPrefixToPrepend ? \`\${confirmPrefixToPrepend}\${selectedQuestion}\` : selectedQuestion;`;

  const newBlock = `    if (stateFsm === 'AWAITING_DISABILITY') {
      let selectedQuestion = familiar 
        ? \`O seu \${familiar} tem alguma deficiência física, visual, auditiva ou motora?\`
        : "Você tem alguma deficiência física, visual, auditiva ou motora?";
      
      // Injeção de empatia para o sub-fluxo de deficiência
      const textClean = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
      const temCorteOuProblema = textClean.includes("cort") || 
                                 textClean.includes("perde") || 
                                 textClean.includes("parou") || 
                                 textClean.includes("cance") || 
                                 textClean.includes("suspen") || 
                                 (user_data.doenca && user_data.doenca.toLowerCase() !== 'não') ||
                                 user_data.tem_deficiencia === true;

      const temDesesperoFinanceiro = textClean.includes("sobreviver") || 
                                    textClean.includes("desesper") || 
                                    textClean.includes("dificuldade") || 
                                    textClean.includes("passando fome") || 
                                    textClean.includes("necessidade") ||
                                    (user_data.sofrimento_relatado && user_data.sofrimento_relatado !== "");

      const sofrimentoAtualParaComparacao = user_data.sofrimento_relatado || user_data.doenca || '';
      const ultimoComEmpatia = user_data.ultimo_sofrimento_com_empatia === undefined ? undefined : (user_data.ultimo_sofrimento_com_empatia || "");

      if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || sofrimentoAtualParaComparacao !== ultimoComEmpatia)) {
        let empatia = "Sinto muito que esteja passando por isso.";
        if (temDesesperoFinanceiro) {
          empatia = "Sinto muito por toda essa dificuldade.";
        } else if (familiar) {
          empatia = \`Que situação difícil, sinto muito pelo seu \${familiar}.\`;
        }
        selectedQuestion = \`\${empatia} \${selectedQuestion}\`;
        user_data.ultimo_sofrimento_com_empatia = sofrimentoAtualParaComparacao;
      }

      const reply = confirmPrefixToPrepend ? \`\${confirmPrefixToPrepend}\${selectedQuestion}\` : selectedQuestion;`;

  if (content.includes(targetBlock)) {
    content = content.replace(targetBlock, newBlock);
    console.log('✅ Empathy logic injected in AWAITING_DISABILITY sub-flow.');
  } else {
    console.error('❌ Could not find targetBlock in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Disability empathy successfully applied!');
}

applyDisabilityEmpathy();

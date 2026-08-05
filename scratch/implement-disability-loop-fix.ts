import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyFixes() {
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

  // 1. Insert auto-inferences in resolveFSMState
  const autoInferenceTarget = `    // --- AUTO-INFERÊNCIAS ---
    let ageNum = this.parseNumber(userData.idade);`;

  const autoInferenceReplacement = `    // --- AUTO-INFERÊNCIAS ---
    // Plano de escape: auto-inferência se o campo booleano for nulo, mas houver descrição no campo de texto
    if (userData.tem_deficiencia === null || userData.tem_deficiencia === undefined) {
      if (userData.deficiencia) {
        const defClean = String(userData.deficiencia).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
        const ehNegacao = defClean === 'nao' || defClean === 'nenhuma' || defClean.includes('nao tenho') || defClean === 'gracas a deus nao';
        if (ehNegacao) {
          userData.tem_deficiencia = false;
        } else if (defClean !== '' && defClean !== 'null' && defClean !== 'undefined') {
          userData.tem_deficiencia = true;
        }
      }
    }

    if (userData.tem_doenca_ou_limitacao === null || userData.tem_doenca_ou_limitacao === undefined) {
      if (userData.doenca) {
        const doencaClean = String(userData.doenca).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
        const ehNegacao = doencaClean === 'nao' || doencaClean === 'nenhuma' || doencaClean.includes('nao tenho');
        if (ehNegacao) {
          userData.tem_doenca_ou_limitacao = false;
        } else if (doencaClean !== '' && doencaClean !== 'null' && doencaClean !== 'undefined') {
          userData.tem_doenca_ou_limitacao = true;
        }
      }
    }

    let ageNum = this.parseNumber(userData.idade);`;

  if (content.includes(autoInferenceTarget)) {
    content = content.replace(autoInferenceTarget, autoInferenceReplacement);
    console.log('✅ Auto-inferences logic successfully added to resolveFSMState.');
  } else {
    console.error('❌ autoInferenceTarget not found in sofia.ts');
  }

  // 2. Insert smart empathy check in AWAITING_DISABILITY bypass block
  const empathyBypassTarget = `      const sofrimentoAtualParaComparacao = user_data.sofrimento_relatado || user_data.doenca || '';
      const ultimoComEmpatia = user_data.ultimo_sofrimento_com_empatia === undefined ? undefined : (user_data.ultimo_sofrimento_com_empatia || "");

      if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || sofrimentoAtualParaComparacao !== ultimoComEmpatia)) {`;

  const empathyBypassReplacement = `      const sofrimentoAtualParaComparacao = user_data.sofrimento_relatado || user_data.doenca || '';
      const ultimoComEmpatia = user_data.ultimo_sofrimento_com_empatia === undefined ? undefined : (user_data.ultimo_sofrimento_com_empatia || "");

      const cleanSofrimento = sofrimentoAtualParaComparacao.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      const cleanUltimo = String(ultimoComEmpatia).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      const jaMostrouEmpatia = cleanUltimo !== "" && (cleanSofrimento.includes(cleanUltimo) || cleanUltimo.includes(cleanSofrimento));

      if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || !jaMostrouEmpatia)) {`;

  if (content.includes(empathyBypassTarget)) {
    content = content.replace(empathyBypassTarget, empathyBypassReplacement);
    console.log('✅ Smart empathy comparison added to AWAITING_DISABILITY bypass.');
  } else {
    console.error('❌ empathyBypassTarget not found in sofia.ts');
  }

  // 3. Insert smart empathy check in handleStepWithAI block
  const empathyMainTarget = `    const sofrimentoAtualParaComparacao = user_data.sofrimento_relatado || user_data.doenca || '';
    const ultimoComEmpatia = user_data.ultimo_sofrimento_com_empatia === undefined ? undefined : (user_data.ultimo_sofrimento_com_empatia || "");

    if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || sofrimentoAtualParaComparacao !== ultimoComEmpatia)) {`;

  const empathyMainReplacement = `    const sofrimentoAtualParaComparacao = user_data.sofrimento_relatado || user_data.doenca || '';
    const ultimoComEmpatia = user_data.ultimo_sofrimento_com_empatia === undefined ? undefined : (user_data.ultimo_sofrimento_com_empatia || "");

    const cleanSofrimento = sofrimentoAtualParaComparacao.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    const cleanUltimo = String(ultimoComEmpatia).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    const jaMostrouEmpatia = cleanUltimo !== "" && (cleanSofrimento.includes(cleanUltimo) || cleanUltimo.includes(cleanSofrimento));

    if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || !jaMostrouEmpatia)) {`;

  if (content.includes(empathyMainTarget)) {
    content = content.replace(empathyMainTarget, empathyMainReplacement);
    console.log('✅ Smart empathy comparison added to handleStepWithAI.');
  } else {
    console.error('❌ empathyMainTarget not found in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with FSM loop protections!');
}

applyFixes();

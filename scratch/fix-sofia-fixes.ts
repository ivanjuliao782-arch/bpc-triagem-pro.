import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyFixes() {
  if (!fs.existsSync(file)) {
    console.error('sofia.ts not found');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  // Normalize CRLF to LF for reliable replacements
  const isCRLF = content.includes('\r\n');
  if (isCRLF) {
    content = content.replace(/\r\n/g, '\n');
  }

  // --- 5. Adicionar trava de segurança no campo sofrimento_relatado para evitar overwrite por null ---
  const targetSofiaGuards = `        // Trava para evitar que beneficiario_terceiro já confirmado seja sobrescrito ou alterado, exceto se for uma auto-correção explícita
        if (session.user_data?.beneficiario_terceiro && extractedData.beneficiario_terceiro !== undefined && !this.detectarAutoBeneficiario(text)) {
          delete extractedData.beneficiario_terceiro;
        }`;

  const newSofiaGuards = `        // Trava para evitar que beneficiario_terceiro já confirmado seja sobrescrito ou alterado, exceto se for uma auto-correção explícita
        if (session.user_data?.beneficiario_terceiro && extractedData.beneficiario_terceiro !== undefined && !this.detectarAutoBeneficiario(text)) {
          delete extractedData.beneficiario_terceiro;
        }

        // Trava para evitar que sofrimento_relatado seja sobrescrito com null em turnos futuros
        const oldSofrimento = session.user_data?.sofrimento_relatado;
        if (oldSofrimento && oldSofrimento.trim() !== '' && (!extractedData.sofrimento_relatado || extractedData.sofrimento_relatado.trim() === '')) {
          delete extractedData.sofrimento_relatado;
        }`;

  if (content.includes(targetSofiaGuards)) {
    content = content.replace(targetSofiaGuards, newSofiaGuards);
    console.log('✅ sofrimento_relatado null-protection guard added successfully.');
  } else {
    console.error('❌ Could not find targetSofiaGuards in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Fixes successfully finalized in sofia.ts!');
}

applyFixes();

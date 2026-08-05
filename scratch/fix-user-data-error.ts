import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function fixUserDataError() {
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

  // 1. Remove the broken block from interpretador_codigo
  const brokenBlock = `    // Proteção de Sobrescrita: impede que menções no meio do fluxo alterem o beneficiário ou nome do lead
    if (currentState && currentState !== 'AWAITING_NAME' && currentState !== 'welcome') {
      if (userData.beneficiario_terceiro) {
        delete data.beneficiario_terceiro;
      }
      if (userData.nome_usuario) {
        delete data.nome_usuario;
      }
    }

    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME)`;

  const replacementBlock = `    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME)`;

  if (content.includes(brokenBlock)) {
    content = content.replace(brokenBlock, replacementBlock);
    console.log('✅ Broken block removed from interpretador_codigo.');
  } else {
    console.error('❌ brokenBlock not found in sofia.ts');
  }

  // 2. Add the proper block to processMessage
  const targetProcessMessage = `        // Trava para evitar que beneficiario_terceiro já confirmado seja sobrescrito ou alterado, exceto se for uma auto-correção explícita
        if (session.user_data?.beneficiario_terceiro && extractedData.beneficiario_terceiro !== undefined && !this.detectarAutoBeneficiario(text)) {
          delete extractedData.beneficiario_terceiro;
        }`;

  const replacementProcessMessage = `        // Trava para evitar que beneficiario_terceiro já confirmado seja sobrescrito ou alterado, exceto se for uma auto-correção explícita
        if (session.user_data?.beneficiario_terceiro && extractedData.beneficiario_terceiro !== undefined && !this.detectarAutoBeneficiario(text)) {
          delete extractedData.beneficiario_terceiro;
        }

        // Proteção contra sobrescrita ou criação tardia de beneficiário terceiro no meio do fluxo
        if (currentState && currentState !== 'AWAITING_NAME' && currentState !== 'welcome') {
          // Se já está estabelecido que é para o próprio cliente (beneficiario_terceiro está nulo no banco),
          // não deixa a IA inventar um parente baseando-se em menções de renda ou moradia.
          if (extractedData.beneficiario_terceiro !== undefined && !session.user_data?.beneficiario_terceiro) {
            delete extractedData.beneficiario_terceiro;
          }
          if (extractedData.nome_usuario !== undefined && session.user_data?.nome_usuario) {
            delete extractedData.nome_usuario;
          }
        }`;

  if (content.includes(targetProcessMessage)) {
    content = content.replace(targetProcessMessage, replacementProcessMessage);
    console.log('✅ Overwrite protection block properly added to processMessage.');
  } else {
    console.error('❌ targetProcessMessage not found in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully repaired!');
}

fixUserDataError();
export {};

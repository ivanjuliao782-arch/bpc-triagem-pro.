import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function fixExtraction() {
  if (!fs.existsSync(file)) {
    console.error('sofia.ts not found');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  const oldBlock = `    // 1. Extração prévia de campos do texto antes de qualquer coisa (bloco consolidado)
    let extractedData: any = {};
    if (session) {
      if (session.user_data?.followup_sent) {
        extractedData.followup_sent = false;
        extractedData.followup_sent_at = null;
      }

      if (this.detectarAutoBeneficiario(text)) {
        console.log(\`[EXTRAÇÃO] Correção para auto-beneficiário detectada no texto: "\${text}". Resetando beneficiario_terceiro.\`);
        extractedData.beneficiario_terceiro = null;
        extractedData.beneficiario_ja_confirmado = true; // Trava para sempre
      }

      // Detecta beneficiário terceiro em qualquer mensagem, antes de tudo (código puro)
      let beneficiarioTerceiro = session.user_data?.beneficiario_terceiro || null;
      if (extractedData.beneficiario_terceiro === null) {
        beneficiarioTerceiro = null;
      }

      if (!isGreeting) {
        const currentState = session.user_data?.state_fsm || undefined;

        console.log(\`[INSTRUMENTAÇÃO] [\${timestamp}] [Lead: \${phone}] 3. Conteúdo enviado ao extractor: "\${text}" (currentState: "\${currentState}")\`);
        if (isAudio) {
          console.log(\`[INSTRUMENTAÇÃO ÁUDIO] [\${timestamp}] [Lead: \${phone}] 4. Resultado enviado ao extractor: "\${text}"\`);
        }
        const rawExtracted = await this.runHybridExtraction(text, currentState);
        extractedData = {
          ...extractedData,
          ...rawExtracted
        };

        if (session.user_data?.beneficiario_terceiro && session.user_data?.idade !== undefined && session.user_data?.idade !== null) {
          delete extractedData.idade;
        }

        // Trava para evitar que beneficiario_terceiro já confirmado seja sobrescrito ou alterado, exceto se for uma auto-correção explícita
        if (session.user_data?.beneficiario_terceiro && extractedData.beneficiario_terceiro !== undefined && !this.detectarAutoBeneficiario(text)) {
          delete extractedData.beneficiario_terceiro;
        }

        // Trava para evitar que doenças já registradas sejam sobrescritas por negações em turnos posteriores
        const oldDoenca = session.user_data?.doenca;
        if (oldDoenca && oldDoenca.toLowerCase() !== 'não' && oldDoenca.toLowerCase() !== 'nao' && oldDoenca.trim() !== '') {
          delete extractedData.doenca;
          delete extractedData.tem_doenca_ou_limitacao;
        }

        const oldDeficiencia = session.user_data?.deficiencia;
        if (oldDeficiencia && oldDeficiencia.toLowerCase() !== 'não' && oldDeficiencia.toLowerCase() !== 'nao' && oldDeficiencia.trim() !== '') {
          delete extractedData.deficiencia;
          delete extractedData.tem_deficiencia;
        }
      }
    }`;

  const newBlock = `    // 1. Extração prévia de campos do texto antes de qualquer coisa (bloco consolidado)
    let extractedData: any = {};
    if (session && session.user_data?.followup_sent) {
      extractedData.followup_sent = false;
      extractedData.followup_sent_at = null;
    }

    if (this.detectarAutoBeneficiario(text)) {
      console.log(\`[EXTRAÇÃO] Correção para auto-beneficiário detectada no texto: "\${text}". Resetando beneficiario_terceiro.\`);
      extractedData.beneficiario_terceiro = null;
      extractedData.beneficiario_ja_confirmado = true; // Trava para sempre
    }

    // Detecta beneficiário terceiro em qualquer mensagem, antes de tudo (código puro)
    let beneficiarioTerceiro = session?.user_data?.beneficiario_terceiro || null;
    if (extractedData.beneficiario_terceiro === null) {
      beneficiarioTerceiro = null;
    }

    if (!isGreeting) {
      const currentState = session ? (session.user_data?.state_fsm || undefined) : 'AWAITING_NAME';

      console.log(\`[INSTRUMENTAÇÃO] [\${timestamp}] [Lead: \${phone}] 3. Conteúdo enviado ao extractor: "\${text}" (currentState: "\${currentState}")\`);
      if (isAudio) {
        console.log(\`[INSTRUMENTAÇÃO ÁUDIO] [\${timestamp}] [Lead: \${phone}] 4. Resultado enviado ao extractor: "\${text}"\`);
      }
      const rawExtracted = await this.runHybridExtraction(text, currentState);
      extractedData = {
        ...extractedData,
        ...rawExtracted
      };

      if (session) {
        if (session.user_data?.beneficiario_terceiro && session.user_data?.idade !== undefined && session.user_data?.idade !== null) {
          delete extractedData.idade;
        }

        // Trava para evitar que beneficiario_terceiro já confirmado seja sobrescrito ou alterado, exceto se for uma auto-correção explícita
        if (session.user_data?.beneficiario_terceiro && extractedData.beneficiario_terceiro !== undefined && !this.detectarAutoBeneficiario(text)) {
          delete extractedData.beneficiario_terceiro;
        }

        // Trava para evitar que doenças já registradas sejam sobrescritas por negações em turnos posteriores
        const oldDoenca = session.user_data?.doenca;
        if (oldDoenca && oldDoenca.toLowerCase() !== 'não' && oldDoenca.toLowerCase() !== 'nao' && oldDoenca.trim() !== '') {
          delete extractedData.doenca;
          delete extractedData.tem_doenca_ou_limitacao;
        }

        const oldDeficiencia = session.user_data?.deficiencia;
        if (oldDeficiencia && oldDeficiencia.toLowerCase() !== 'não' && oldDeficiencia.toLowerCase() !== 'nao' && oldDeficiencia.trim() !== '') {
          delete extractedData.deficiencia;
          delete extractedData.tem_deficiencia;
        }
      }
    }`;

  // Make normalization of line breaks in both strings to match cleanly
  const normalize = (str: string) => str.replace(/\r\n/g, '\n').trim();

  if (normalize(content).includes(normalize(oldBlock))) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ sofia.ts first message extraction successfully updated!');
  } else {
    // If it has slight formatting differences, do a regex-based or fallback replacement
    const pattern = /\/\/ 1\. Extração prévia de campos do texto[\s\S]*?delete extractedData\.tem_deficiencia;[\s\S]*?\}[\s\S]*?\}/;
    if (pattern.test(content)) {
      content = content.replace(pattern, newBlock);
      fs.writeFileSync(file, content, 'utf8');
      console.log('✅ sofia.ts first message extraction successfully updated via regex!');
    } else {
      console.error('❌ Could not match the extraction block in sofia.ts');
    }
  }
}

fixExtraction();

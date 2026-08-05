import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function applyThirdPartyFixes() {
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

  // 1. Add interceptAndApplyThirdPartyConfirm helper function in SofiaEngine class
  // Let's find processMessage function starting position so we can insert the helper right before/after it
  const helperTarget = `  async processMessage(phone: string, input: string | Buffer) {`;
  
  const helperCode = `  private async interceptAndApplyThirdPartyConfirm(reply: string, session: any, phone: string): Promise<string> {
    const user_data = session.user_data;
    if (user_data && user_data.beneficiario_terceiro && !user_data.confirmou_beneficiario_enviado) {
      const familiar = String(user_data.beneficiario_terceiro).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      
      const fem = ['filha', 'esposa', 'mae', 'neta', 'irma', 'avo', 'tia', 'sogra', 'sobrinha', 'nora', 'enteada', 'companheira'].includes(familiar);
      const prep = fem ? 'da' : 'do';
      const familiarArtigo = fem ? 'sua' : 'seu';
      
      const familiarCapitalized = user_data.beneficiario_terceiro.charAt(0).toUpperCase() + user_data.beneficiario_terceiro.slice(1);
      const prefixoConfirmacao = \`Entendi que se trata do benefício \${prep} \${familiarArtigo} \${familiarCapitalized}. \`;
      
      let newReply = reply;
      if (reply.includes("Pode me chamar de Lara.")) {
        newReply = reply.replace("Pode me chamar de Lara.", \`Pode me chamar de Lara. \${prefixoConfirmacao}\`);
      } else if (reply.includes("Dra. Mônica Lucioli. ")) {
        newReply = reply.replace("Dra. Mônica Lucioli. ", \`Dra. Mônica Lucioli. \${prefixoConfirmacao} \`);
      } else {
        newReply = \`\${prefixoConfirmacao}\${reply}\`;
      }

      user_data.confirmou_beneficiario_enviado = true;
      
      await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: null,
        p_user_data_updates: {
          confirmou_beneficiario_enviado: true,
          history: user_data.history ? user_data.history.map((h: any, idx: number) => {
            if (idx === user_data.history.length - 1 && h.role === 'assistant') {
              return { ...h, content: newReply };
            }
            return h;
          }) : []
        }
      });

      return newReply;
    }
    return reply;
  }

  async processMessage(phone: string, input: string | Buffer) {`;

  if (content.includes(helperTarget)) {
    content = content.replace(helperTarget, helperCode);
    console.log('✅ interceptAndApplyThirdPartyConfirm helper added.');
  } else {
    console.error('❌ helperTarget not found');
  }

  // 2. Wrap processMessage return calls to use interceptAndApplyThirdPartyConfirm
  const return1Target = `      return this.handleStepWithAI(newSessionData, text);
    } else {
      return this.handleStepWithAI(session, text);
    }`;

  const return1Replacement = `      const res = await this.handleStepWithAI(newSessionData, text);
      return this.interceptAndApplyThirdPartyConfirm(res, newSessionData, phone);
    } else {
      const res = await this.handleStepWithAI(session, text);
      return this.interceptAndApplyThirdPartyConfirm(res, session, phone);
    }`;

  if (content.includes(return1Target)) {
    content = content.replace(return1Target, return1Replacement);
    console.log('✅ processMessage returns wrapped with third-party confirm interceptor.');
  } else {
    console.error('❌ return1Target not found');
  }

  // 3. Add retirement questions to the familiar adaptation block
  const familiarQuestionsTarget = `        } else if (stateFsm === 'BPC_AWAITING_CADUNICO') {
          dryQuestion = \`\${art} \${familiar} possui CadÚnico atualizado?\`;
        }
      }`;

  const familiarQuestionsReplacement = `        } else if (stateFsm === 'BPC_AWAITING_CADUNICO') {
          dryQuestion = \`\${art} \${familiar} possui CadÚnico atualizado?\`;
        } else if (stateFsm === 'RETIREMENT_AWAITING_WORK_HISTORY') {
          dryQuestion = \`Qual o histórico de trabalho \${prep} \${artLC} \${familiar}?\`;
        } else if (stateFsm === 'RETIREMENT_AWAITING_SPECIAL_RURAL') {
          dryQuestion = \`\${art} \${familiar} trabalhou em lavoura, roça ou atividade rural?\`;
        } else if (stateFsm === 'RETIREMENT_AWAITING_OTHER_PERIODS') {
          dryQuestion = \`\${art} \${familiar} tem algum outro período de contribuição ou trabalho para somar?\`;
        }
      }`;

  if (content.includes(familiarQuestionsTarget)) {
    content = content.replace(familiarQuestionsTarget, familiarQuestionsReplacement);
    console.log('✅ Retirement questions added to familiar adaptation block.');
  } else {
    console.error('❌ familiarQuestionsTarget not found');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated with all third-party fixes!');
}

applyThirdPartyFixes();
export {};

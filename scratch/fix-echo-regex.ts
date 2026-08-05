import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function fixEchoRegex() {
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

  // Define the target block we want to replace
  const targetBlock = `  limparEcoPerguntas(text: string): string {
    let cleanText = text;
    // 1. Remove saudações personalizadas comuns da Lara com quebra de linha ou espaço
    cleanText = cleanText.replace(/Prazer,?\\s+[^!?\\n]+!?,?\\s*(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade)\\.?)?/gi, '');
    cleanText = cleanText.replace(/Me chamo Lara,?\\s+atendente do escritório da Dra\\.\\s+Mônica Lucioli\\./gi, '');
    cleanText = cleanText.replace(/Olá!?,?\\s*(?:seja bem-vindo\\(a\\)|Tudo bem\\?)?/gi, '');
    
    // Remove frases de empatia soltas que possam ter vazado
    cleanText = cleanText.replace(/Sinto muito por toda essa dificuldade\\./gi, '');
    cleanText = cleanText.replace(/Sinto muito que esteja passando por isso\\./gi, '');
    
    // 2. Remove frases exatas de perguntas cadastradas na FSM`;

  const newBlock = `  limparEcoPerguntas(text: string): string {
    let cleanText = text;
    // 1. Remove citações completas de mensagens da Lara que iniciam com saudações conhecidas até o "?"
    cleanText = cleanText.replace(/\\b(prazer,?\\s+[^!?\\n]+|me\\s+chamo\\s+lara|escritorio\\s+da\\s+dra|monica\\s+lucioli)\\b[^]*?\\?\\s*/gi, '');
    
    // 2. Remove saudações personalizadas comuns da Lara residuais
    cleanText = cleanText.replace(/Prazer,?\\s+[^!?\\n]+!?,?\\s*(?:Sinto muito (?:que esteja passando por isso|por toda essa dificuldade)\\.?)?/gi, '');
    cleanText = cleanText.replace(/Me chamo Lara,?\\s+atendente do escritório da Dra\\.\\s+Mônica Lucioli\\./gi, '');
    cleanText = cleanText.replace(/Olá!?,?\\s*(?:seja bem-vindo\\(a\\)|Tudo bem\\?)?/gi, '');
    
    // Remove frases de empatia soltas que possam ter vazado
    cleanText = cleanText.replace(/Sinto muito por toda essa dificuldade\\./gi, '');
    cleanText = cleanText.replace(/Sinto muito que esteja passando por isso\\./gi, '');
    
    // 3. Remove frases exatas de perguntas cadastradas na FSM`;

  if (content.includes(targetBlock)) {
    content = content.replace(targetBlock, newBlock);
    console.log('✅ limparEcoPerguntas updated with robust quote/reply regex.');
  } else {
    console.error('❌ Could not find targetBlock in sofia.ts');
  }

  // Restore line endings to CRLF if it was CRLF originally
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('🎉 Sofia.ts successfully updated!');
}

fixEchoRegex();

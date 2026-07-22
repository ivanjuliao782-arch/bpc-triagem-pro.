import * as mammoth from 'mammoth';
import * as fs from 'fs';

async function main() {
  try {
    const result = await mammoth.extractRawText({ path: 'ENTREVISTA_APOSENTADORIA.docx' });
    const text = result.value;
    fs.writeFileSync('ENTREVISTA_APOSENTADORIA.txt', text);
    console.log('✅ Texto extraído e gravado com sucesso em ENTREVISTA_APOSENTADORIA.txt!');
  } catch (err) {
    console.error('Erro ao extrair texto:', err);
  }
}

main();

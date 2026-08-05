import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\sofia.ts';

function implementExtraction() {
  if (!fs.existsSync(file)) {
    console.error('sofia.ts not found');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  // Insert the extraction call right after "if (!session) {"
  const target = 'if (!session) {';
  const insertion = '\n      // Executa a extração híbrida logo na primeira mensagem para capturar nome ou dados enviados de cara\n      extractedData = await this.runHybridExtraction(text, \'AWAITING_NAME\');\n';

  if (content.includes(target)) {
    content = content.replace(target, target + insertion);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ sofia.ts welcome message extraction successfully implemented!');
  } else {
    console.error('❌ Could not find "if (!session) {" in sofia.ts');
  }
}

implementExtraction();

import { SofiaEngine } from '../src/sofia';

const testStrings = [
  "você é de onde?",
  "onde vocês atendem?",
  "onde fica o seu escritório?",
  "vocês são de onde",
  "onde fica o escritório?",
  "onde fica ?",
  "você é de onde?",
  "onde voces ficam",
  "endereco",
  "onde e",
  "onde fica o consultorio"
];

const engine = new SofiaEngine();

console.log("=== TESTANDO NOVOS PADRÕES DE REGEX DE ENDEREÇO ===");
let passedCount = 0;

for (const text of testStrings) {
  const isMatch = engine.detectarPerguntaEndereco(text);
  if (isMatch) {
    console.log(`✅ MATCH: "${text}"`);
    passedCount++;
  } else {
    console.log(`❌ FALHA: "${text}"`);
  }
}

console.log(`\nResultado: ${passedCount}/${testStrings.length} detectados.`);
if (passedCount === testStrings.length) {
  console.log("🎉 Todos os padrões de endereço foram detectados perfeitamente!");
} else {
  console.log("⚠️ Alguns padrões falharam.");
  process.exit(1);
}

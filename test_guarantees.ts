function sanitizeReply(reply: string): string {
  if (!reply) return "";

  // 1. Remover Emojis usando regex amplo
  let clean = reply.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/g, '');

  // 2. Remover risadas como kkkk, rsrs, haha, kskk, etc. de forma case-insensitive e com qualquer quantidade de caracteres.
  clean = clean.replace(/\b(k+a*k*|k+s+k*|r+s+r*|h+a+h*)+[as]*\b/gi, '');
  
  // Expressões específicas de riso isoladas ou soltas
  clean = clean.replace(/\b(kkk+|rsrs+|haha+|hehe+)\b/gi, '');

  // 3. Remover a gíria "Eita" ou "Eita," ou "Eita!" ou "eita" no início ou solta.
  clean = clean.replace(/\bEita\b[!,.]*/gi, '');

  // 4. Substituições diretas de termos informais desaprovados
  clean = clean.replace(/nome real/gi, 'nome');
  clean = clean.replace(/nome de verdade/gi, 'nome');

  // 5. Limpar múltiplos espaços ou pontuações órfãs decorrentes da remoção
  clean = clean.replace(/\s*([.,;?!])\s*\1+/g, '$1'); 
  clean = clean.replace(/^\s*[.,;?!:\-\s]+/g, ''); 
  clean = clean.replace(/\s+/g, ' ').trim();

  // 6. Capitalizar a primeira letra
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean;
}

const testCases = [
  "Eita, kkkk. Mas me fala seu nome real pra eu te cadastrar e a gente ver o seu caso?",
  "Ah rsrsrs, que legal 😊! Me conta seu nome de verdade pra começarmos.",
  "Eita! Entendi. Hahaha, muito bom. Mas e sua idade?",
  "Meus sentimentos pela perda do seu marido. 😭 Me fala seu nome real.",
  "kkkkk sério? Eita!"
];

console.log("=== INICIANDO TESTES DE GARANTIA DO FILTRO PROGRAMÁTICO ===");
for (let i = 0; i < testCases.length; i++) {
  const original = testCases[i];
  const sanitized = sanitizeReply(original);
  console.log(`\nCenário ${i + 1}:`);
  console.log(`❌ Original:  "${original}"`);
  console.log(`✅ Filtrado:  "${sanitized}"`);
}
console.log("\n=== FIM DOS TESTES ===");

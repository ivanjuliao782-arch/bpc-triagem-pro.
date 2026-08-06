import { SofiaEngine } from '../../src/sofia';
import dotenv from 'dotenv';
dotenv.config();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Asserção falhou: ${message}`);
  }
}

async function runUnitTests() {
  console.log('=== RODANDO TESTES UNITÁRIOS DA SOFIA ===');

  const sofia = new SofiaEngine();

  // --- 1. TESTES DE HIGIENIZAÇÃO DE NOMES ---
  console.log('\n--- 1. Testes de Higienização de Nomes ---');
  const testNames = [
    { input: "Oii \n Bom dia", expected: null },
    { input: "Oiiii", expected: null },
    { input: "Bom diaaa", expected: null },
    { input: "oláá", expected: null },
    { input: "👍", expected: null },
    { input: "prazer joão", expected: "Joao" },
    { input: "PRAZER JOÃO", expected: "Joao" },
    { input: "muito prazer, sou a maria", expected: "Maria" },
    { input: "satisfação, carlos", expected: "Carlos" },
    { input: "eu sou o pedro", expected: "Pedro" },
    { input: "meu nome é ana", expected: "Ana" },
    { input: "me chamo roberto", expected: "Roberto" }
  ];

  for (const t of testNames) {
    const result = sofia.extrairNomePorCodigo(t.input);
    console.log(`Input: "${t.input.replace(/\n/g, ' ')}" -> Extraído: "${result}"`);
    assert(result === t.expected, `Esperado: "${t.expected}", Obtido: "${result}" para o input "${t.input}"`);
  }
  console.log('✅ Todos os testes de nomes passaram!');

  // --- 2. TESTES DE DETECÇÃO DE DEFICIÊNCIA ---
  console.log('\n--- 2. Testes de Classificação de Deficiência ---');
  const testDisabilities = [
    { input: "Motora", expectedDef: "motora", expectedTem: true },
    { input: "Física", expectedDef: "motora", expectedTem: true },
    { input: "Física motora", expectedDef: "motora", expectedTem: true },
    { input: "Visual", expectedDef: "visual", expectedTem: true },
    { input: "Monocular", expectedDef: "visual", expectedTem: true },
    { input: "Auditiva", expectedDef: "auditiva", expectedTem: true },
    { input: "Mental", expectedDef: "mental", expectedTem: true },
    { input: "sequela na córnea", expectedDef: "visual", expectedTem: true },
    { input: "não", expectedDef: "Não", expectedTem: false },
    { input: "não tenho nenhuma", expectedDef: "Não", expectedTem: false }
  ];

  for (const t of testDisabilities) {
    const result = sofia.interpretador_codigo(t.input, 'AWAITING_DISABILITY');
    console.log(`Input: "${t.input}" -> tem_deficiencia: ${result.tem_deficiencia}, deficiencia: "${result.deficiencia}"`);
    assert(result.tem_deficiencia === t.expectedTem, `Esperado tem_deficiencia: ${t.expectedTem}, Obtido: ${result.tem_deficiencia}`);
    if (t.expectedTem) {
      assert(result.deficiencia === t.expectedDef || result.deficiencia.toLowerCase().includes(t.expectedDef), `Esperado deficiencia conter: "${t.expectedDef}", Obtido: "${result.deficiencia}"`);
    } else {
      assert(result.deficiencia === t.expectedDef, `Esperado deficiencia: "${t.expectedDef}", Obtido: "${result.deficiencia}"`);
    }
  }
  console.log('✅ Todos os testes de deficiência passaram!');

  // --- 3. TESTES DE NOMES PROIBIDOS ---
  console.log('\n--- 3. Testes de Nomes Proibidos ---');
  const forbiddenInputs = [
    { input: { nome_usuario: "Lara" }, expectedProibido: true },
    { input: { nome_usuario: "Mônica" }, expectedProibido: true },
    { input: { nome_usuario: "Monica Lucioli" }, expectedProibido: true },
    { input: { nome_usuario: "Dra Mônica" }, expectedProibido: true },
    { input: { nome_usuario: "Maria" }, expectedProibido: false }
  ];

  for (const t of forbiddenInputs) {
    const payload = { ...t.input };
    const sanitized = sofia.sanitizeExtractedData(payload, payload.nome_usuario, 'AWAITING_NAME');
    console.log(`Nome: "${t.input.nome_usuario}" -> nome_usuario restou: "${sanitized.nome_usuario}", nome_proibido_rejeitado: ${sanitized.nome_proibido_rejeitado}`);
    if (t.expectedProibido) {
      assert(sanitized.nome_usuario === undefined, `Deveria ter deletado o nome_usuario`);
      assert(sanitized.nome_proibido_rejeitado === true, `Deveria ter setado nome_proibido_rejeitado como true`);
    } else {
      assert(sanitized.nome_usuario !== undefined, `Não deveria ter deletado o nome_usuario`);
      assert(sanitized.nome_proibido_rejeitado === undefined, `Não deveria ter setado nome_proibido_rejeitado`);
    }
  }
  console.log('✅ Todos os testes de nomes proibidos passaram!');
}

runUnitTests().catch(err => {
  console.error(err);
  process.exit(1);
});

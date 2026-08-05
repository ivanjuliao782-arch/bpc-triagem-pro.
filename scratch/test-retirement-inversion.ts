import { SofiaEngine } from '../src/sofia';

function testRetirementInversion() {
  console.log('🧪 Iniciando teste de inversão de lógica de retirement_other_periods...');
  const sofia = new SofiaEngine();

  const testCases = [
    { text: "Trabalhei como eletricista a vida toda", expected: "Não" },
    { text: "Sempre fui autônomo", expected: "Não" },
    { text: "Sou manicure", expected: "Não" },
    { text: "Sou funcionário público municipal", expected: undefined },
    { text: "Trabalhei como policial militar", expected: undefined },
    { text: "Fui professora concursada do estado", expected: undefined },
    { text: "Trabalhei no comércio em lojas", expected: "Não" }
  ];

  for (const tc of testCases) {
    const mergedData: any = {};
    const result = (sofia as any).sanitizeExtractedData(mergedData, tc.text, 'RETIREMENT_AWAITING_OTHER_PERIODS');
    console.log(`Texto: "${tc.text}"`);
    console.log(`-> retirement_other_periods: "${result.retirement_other_periods}" (Esperado: "${tc.expected}")`);
    
    const success = result.retirement_other_periods === tc.expected;
    console.log(success ? '✅ PASS' : '❌ FAIL');
  }
}

testRetirementInversion();

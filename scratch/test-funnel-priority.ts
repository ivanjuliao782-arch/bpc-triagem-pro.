import { SofiaEngine } from '../src/sofia';

function testFunnelPriority() {
  console.log('🧪 Iniciando teste de prioridade de funil (BPC_DEFICIENTE vs APOSENTADORIA)...');
  const sofia = new SofiaEngine();

  // Caso: idade = 63, tempo_carteira = 15 anos, deficiência = true, e todos os campos prévios preenchidos
  const userData1 = {
    nome_usuario: "Maria",
    has_lawyer: false,
    idade: 63,
    inss_tempo_carteira: "15 anos",
    esta_contribuindo_atualmente: false,
    tempo_parou_contribuir: "10 anos",
    tem_doenca_ou_limitacao: true,
    doenca: "paralisia",
    tem_deficiencia: true,
    deficiencia: "paralisia"
  };

  const resolved = sofia.resolveFSMState(userData1);
  console.log('Caso 1 (Feminino 63 anos + 15 anos contribuição + deficiência + campos completos):');
  console.log('-> Fluxo Ativo retornado:', resolved.fluxo_ativo);
  console.log('-> Próximo Estado:', resolved.state);

  // Caso: idade = 65, tempo_carteira = 17 anos, deficiência = true
  const userData2 = {
    nome_usuario: "João",
    has_lawyer: false,
    idade: 65,
    inss_tempo_carteira: "17 anos",
    tem_deficiencia: true,
    deficiencia: "paralisia"
  };

  const resolved2 = sofia.resolveFSMState(userData2);
  console.log('\nCaso 2 (Masculino 65 anos + 17 anos contribuição + deficiência):');
  console.log('-> Fluxo Ativo retornado:', resolved2.fluxo_ativo);
  console.log('-> Próximo Estado:', resolved2.state);
}

testFunnelPriority();

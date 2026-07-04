import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testMapping() {
  const { data, error } = await supabase.from('sofia_sessions').select('*');
  if (error) {
    console.error('Erro na query:', error);
    return;
  }

  console.log(`Buscado ${data.length} registros. Iniciando mapeamento...`);

  try {
    const formattedLeads = data.map((item: any) => {
      const userData = item.user_data || {};
      
      // Auxiliar de parsing de números
      const parseNumber = (val: any) => {
        if (!val) return 0;
        const num = parseInt(String(val).replace(/\D/g, ''), 10);
        return isNaN(num) ? 0 : num;
      };

      const age = parseNumber(userData.idade);
      const contributionYears = parseNumber(userData.tempo_contribuicao);
      const hasAccident = userData.acidente && userData.acidente.toLowerCase() !== 'não';
      const hasDisease = userData.doenca && userData.doenca.toLowerCase() !== 'não';

      let scoreValue = userData.score_total !== undefined ? userData.score_total : 0;
      let scoreClass: any = 'Frio';
      if (scoreValue >= 80) scoreClass = 'Prioridade Máxima';
      else if (scoreValue >= 60) scoreClass = 'Quente';
      else if (scoreValue >= 30) scoreClass = 'Morno';

      let status = userData.status || 'novo_lead';
      if (item.step === 'finished' && status === 'novo_lead') {
        status = 'novo_lead'; 
      }

      const timeString = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const timeline = [
        { time: timeString, text: 'Lead entrou via WhatsApp' },
        { time: new Date(item.last_interaction).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text: 'Lara finalizou triagem' }
      ];

      if (userData.status_final === 'Encaminhado') status = 'em_atendimento';
      if (userData.status_final === 'Reprovado') status = 'perdidos';

      return {
        id: item.id.toString(),
        phone: item.phone,
        nome: userData.nome_usuario || 'Lead em andamento',
        idade: age,
        tempo_contribuicao: userData.tempo_contribuicao || 'Não informado',
        doenca: userData.doenca || 'Não informado',
        acidente: userData.acidente || 'Não informado',
        horario_entrada: item.created_at,
        status: status,
        scoreValue: scoreValue,
        scoreClass: scoreClass,
        membros: userData.membros || 1,
        temBeneficio: userData.temBeneficio || false,
        temDocs: userData.temDocs || false,
        operador: userData.operador || undefined,
        lastInteraction: new Date(item.last_interaction).toLocaleString('pt-BR'),
        nextAction: userData.nextAction || undefined,
        timeline: timeline,
        historicoChat: userData.history || [],
        notes: userData.notes || [],
        valorContrato: userData.valorContrato || undefined,
        tipoBeneficio: userData.tipoBeneficio || undefined,
        motivoPerda: userData.motivoPerda || undefined,
        agendamento: userData.agendamento || undefined,
        fluxo_ativo: userData.fluxo_ativo || undefined,
        bpc_pessoas_casa: userData.bpc_pessoas_casa || undefined,
        bpc_parentesco: userData.bpc_parentesco || undefined,
        bpc_quem_renda: userData.bpc_quem_renda || undefined,
        bpc_casa_alugada_propria: userData.bpc_casa_alugada_propria || undefined,
        bpc_casa_equipada: userData.bpc_casa_equipada !== undefined ? userData.bpc_casa_equipada : undefined,
        bpc_cad_unico: userData.bpc_cad_unico !== undefined ? userData.bpc_cad_unico : undefined,
        inss_tempo_carteira: userData.inss_tempo_carteira || undefined,
        inss_foi_autonomo: userData.inss_foi_autonomo !== undefined ? userData.inss_foi_autonomo : undefined,
        inss_como_contribuiu: userData.inss_como_contribuiu || undefined,
        inss_laudos_medicos: userData.inss_laudos_medicos !== undefined ? userData.inss_laudos_medicos : undefined,
        inss_data_laudo: userData.inss_data_laudo || undefined,
        urgencia_detectada: userData.urgencia_detectada || undefined,
        acamado: userData.acamado !== undefined ? userData.acamado : undefined,
        sem_renda: userData.sem_renda !== undefined ? userData.sem_renda : undefined,
        tempo_resposta: userData.tempo_resposta !== undefined ? userData.tempo_resposta : undefined,
        raw_user_data: userData
      };
    });

    console.log('✅ MAPEAMENTO BEM-SUCEDIDO! Nenhum erro lançado.');
    console.log('Quantidade mapeada:', formattedLeads.length);
    console.log('Primeiro lead formatado:', JSON.stringify(formattedLeads[0], null, 2));
  } catch (err: any) {
    console.error('❌ ERRO CRÍTICO NO MAPEAMENTO:', err.message, err.stack);
  }
}

testMapping();

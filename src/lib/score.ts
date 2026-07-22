export interface ScoreUserData {
  idade?: number | string;
  tempo_contribuicao?: number | string;
  inss_tempo_carteira?: number | string;
  tem_doenca_ou_limitacao?: boolean;
  doenca?: string;
  acidente?: string;
  tem_deficiencia?: boolean;
  is_bedridden?: boolean;
  acamado?: boolean;
  ja_contribuiu?: boolean;
  tempo_parou_contribuir?: string;
  inss_ultima_contribuicao?: string;
  has_no_income?: boolean;
  sem_renda?: boolean;
  bpc_quem_renda?: string;
  bpc_pessoas_casa?: number | string;
  bpc_cad_unico?: boolean;
  has_cad_unico?: boolean;
  retirement_work_history?: string;
  inss_como_contribuiu?: string;
  retirement_special_rural?: string;
  tem_docs_em_maos?: boolean;
  has_lawyer?: boolean;
  is_recoverable?: boolean;
  fluxo_ativo?: string;
  history?: { role: string; content: string }[];
  inss_laudos_medicos?: boolean;
  esta_contribuindo_atualmente?: boolean;
  status_final?: string;
}

/**
 * Calcula a pontuação (score) previdenciária de forma centralizada e unificada.
 * Garante que as mesmas regras rodem idênticas no Robô (Backend) e no Dashboard (Frontend).
 */
export function calcularScorePrevidenciario(userData: ScoreUserData): number {
  if (!userData) return 0;

  // Se tem advogado e NÃO é recuperável: score é forçado a 0
  if (userData.has_lawyer === true && userData.is_recoverable !== true) {
    return 0;
  }

  // Auxiliares de parsing de números
  const parseAge = (v: any) => {
    if (!v) return 0;
    const match = String(v).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const parseContrib = (v: any) => {
    if (!v) return 0;
    const match = String(v).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const ageNum = parseAge(userData.idade);
  const contribYears = parseContrib(userData.tempo_contribuicao || userData.inss_tempo_carteira);

  // Detecção de incapacidade e limitações físicas
  const hasDisease = userData.tem_doenca_ou_limitacao === true || 
                     (userData.doenca && userData.doenca.toLowerCase() !== 'não' && userData.doenca.toLowerCase() !== 'nao');
  const hasAccident = userData.acidente && userData.acidente.toLowerCase() !== 'não' && userData.acidente.toLowerCase() !== 'nao';
  const hasDiseaseOrLimit = hasDisease || hasAccident || userData.tem_deficiencia === true || userData.acamado === true || userData.is_bedridden === true;

  // Detecção de fluxos
  const history = userData.history || [];
  const hasAposeText = history.some((h: any) => 
    String(h.content || "").toLowerCase().includes("aposentar") || 
    String(h.content || "").toLowerCase().includes("aposentadoria")
  );

  const isAposentadoria = 
    userData.fluxo_ativo === 'APOSENTADORIA' ||
    (
      userData.fluxo_ativo !== 'BPC_IDOSO' &&
      userData.fluxo_ativo !== 'BPC_DEFICIENTE' &&
      userData.ja_contribuiu !== false &&
      ((ageNum >= 55 || contribYears >= 15) || hasAposeText) &&
      !hasDiseaseOrLimit
    );

  let scoreValue = 0;

  if (isAposentadoria) {
    // === FUNIL 1: APOSENTADORIA / INSS REGULAR ===
    // 1. Contribuição
    if (contribYears >= 28) {
      scoreValue += 40;
    } else if (contribYears >= 15 && contribYears <= 27) {
      scoreValue += 25;
    }

    // 2. Idade
    if (ageNum >= 60) {
      scoreValue += 20;
    } else if (ageNum >= 55 && ageNum <= 59) {
      scoreValue += 15;
    }

    // 3. Sem advogado
    if (userData.has_lawyer !== true) {
      scoreValue += 15;
    }

    // 4. Carteira assinada
    const workHistory = String(
      userData.retirement_work_history ||
      userData.inss_como_contribuiu ||
      ""
    ).toLowerCase();
    if (workHistory.includes('carteira') || workHistory.includes('assinado') || workHistory.includes('registro')) {
      scoreValue += 10;
    }

    // 5. Trabalho especial ou rural
    const specialRural = String(userData.retirement_special_rural || "").toLowerCase();
    const hasSpecial = (
      specialRural.includes('especial') ||
      specialRural.includes('insalubre') ||
      specialRural.includes('perigo') ||
      specialRural.includes('ruido') ||
      specialRural.includes('quimico') ||
      specialRural.includes('calor') ||
      specialRural.includes('eletricidade')
    );
    const hasRural = (
      specialRural.includes('rural') ||
      specialRural.includes('roça') ||
      specialRural.includes('campo') ||
      specialRural.includes('lavoura') ||
      specialRural.includes('colono')
    );
    if (hasSpecial || hasRural) {
      scoreValue += 20;
    }

    // 6. Documentos em mãos
    if (userData.tem_docs_em_maos === true) {
      scoreValue += 10;
    }
  } else {
    // === FUNIL 2 E 3: BPC/LOAS OU INSS POR INCAPACIDADE (AUXÍLIO-DOENÇA) ===
    
    // Verificamos se é um caso de incapacidade (Funil 3)
    const isAuxilioDoenca = hasDiseaseOrLimit && (userData.esta_contribuindo_atualmente === true || userData.ja_contribuiu === true);

    if (isAuxilioDoenca) {
      // === FUNIL 3: INSS POR INCAPACIDADE / AUXÍLIO-DOENÇA ===
      // 1. Contribuição ativa ou qualidade de segurado (essencial para auxílio-doença)
      if (userData.esta_contribuindo_atualmente === true) {
        scoreValue += 30;
      } else if (userData.ja_contribuiu === true) {
        scoreValue += 15;
      }

      // 2. Doença ou limitação grave
      if (hasDisease) {
        scoreValue += 30; // Peso alto para diagnóstico/incapacidade relatada
      }

      // 3. Presença de laudos médicos
      if (userData.inss_laudos_medicos === true) {
        scoreValue += 20;
      }

      // 4. Sem advogado
      if (userData.has_lawyer !== true) {
        scoreValue += 20;
      }
    } else {
      // === FUNIL 2: BPC / LOAS (ASSISTENCIAL) ===
      // 1. Idade >= 65 anos
      if (ageNum >= 65) scoreValue += 40;

      // 2. Nunca contribuiu
      const neverContrib = userData.ja_contribuiu === false ||
                           String(userData.inss_tempo_carteira).toLowerCase() === 'nenhum' ||
                           String(userData.tempo_parou_contribuir).toLowerCase() === 'nunca' ||
                           String(userData.inss_ultima_contribuicao).toLowerCase().includes('não contribuiu');
      if (neverContrib) scoreValue += 20;

      // 3. Renda per capita baixa
      const rendaVal = String(userData.bpc_quem_renda || "").toLowerCase();
      const isLowIncome = userData.has_no_income === true || 
                          userData.sem_renda === true ||
                          rendaVal.includes("nenhum") || 
                          rendaVal.includes("ninguem") || 
                          rendaVal.includes("sem renda") || 
                          rendaVal.includes("não tem") || 
                          rendaVal.includes("não possui") || 
                          (rendaVal.match(/\d+/) && parseInt((rendaVal.match(/\d+/) || ["0"])[0]) <= 706);
      if (isLowIncome) scoreValue += 20;

      // 4. Mora sozinho/família baixa renda
      const moraSozinhoOuBaixaRenda = String(userData.bpc_pessoas_casa).toLowerCase().includes("sozinh") ||
                                      userData.bpc_pessoas_casa === 1 ||
                                      userData.bpc_pessoas_casa === '1' ||
                                      isLowIncome;
      if (moraSozinhoOuBaixaRenda) scoreValue += 10;

      // 5. CadÚnico ativo
      const cadUnicoAtivo = userData.bpc_cad_unico === true || userData.has_cad_unico === true;
      if (cadUnicoAtivo) scoreValue += 10;

      // 6. Doença ou limitação grave
      if (userData.tem_doenca_ou_limitacao === true || hasDisease) scoreValue += 15;

      // 7. Deficiência
      if (userData.tem_deficiencia === true) scoreValue += 20;

      // 8. Acamado ou dependente
      if (userData.is_bedridden === true || userData.acamado === true) scoreValue += 25;
    }
  }

  return Math.min(100, scoreValue);
}

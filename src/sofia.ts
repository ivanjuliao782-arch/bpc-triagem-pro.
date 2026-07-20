import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const STATE_QUESTIONS: Record<string, string[]> = {
  AWAITING_NAME: [
    "Me fale seu nome por favor"
  ],
  AWAITING_LAWYER: [
    "Você já tem advogado cuidando do seu caso?"
  ],
  AWAITING_AGE: [
    "Qual a sua idade?"
  ],
  AWAITING_TOTAL_CONTRIBUTION: [
    "Quanto tempo você já contribuiu com o INSS?"
  ],
  AWAITING_CURRENT_CONTRIBUTION: [
    "Você está trabalhando atualmente?"
  ],
  AWAITING_LAST_CONTRIBUTION_TIME: [
    "Há quanto tempo você parou de contribuir?"
  ],
  AWAITING_DISEASE: [
    "Você tem alguma doença atualmente?"
  ],
  AWAITING_DISABILITY: [
    "Você tem alguma deficiência?"
  ],
  BPC_AWAITING_HOUSEHOLD: [
    "Quem mora com você na sua casa hoje em dia?"
  ],
  BPC_AWAITING_HOUSEHOLD_INCOME: [
    "E das pessoas que moram com você, tem alguém que trabalha ou recebe algum dinheiro?"
  ],
  BPC_AWAITING_HOME_STATUS: [
    "A casa de vocês é própria, alugada ou cedida?"
  ],
  BPC_AWAITING_CADUNICO: [
    "Você tem Cadastro Único (CadÚnico)?"
  ],
  INSS_AWAITING_EMPLOYMENT_TYPE: [
    "Você trabalhava de carteira assinada ou por conta própria?"
  ],
  INSS_AWAITING_LAST_CONTRIBUTION: [
    "Tem quanto tempo que você se afastou? Foi em que ano?"
  ],
  INSS_AWAITING_REPORTS: [
    "Você possui exames, receitas ou laudos médicos recentes?"
  ],
  RETIREMENT_AWAITING_WORK_HISTORY: [
    "Seu histórico foi mais de carteira assinada ou autônomo?"
  ],
  RETIREMENT_AWAITING_SPECIAL_RURAL: [
    "Já trabalhou na roça ou exposto a barulho, calor forte ou produto químico?"
  ],
  RETIREMENT_AWAITING_OTHER_PERIODS: [
    "Já trabalhou em serviço público, exército ou escola técnica antes de 1998?"
  ],
  FINISHED: [
    "Com base no que você me contou nossa equipe vai analisar melhor o seu caso. Assim que possível entraremos em contato novamente"
  ]
};

const EXCECAO_QUESTIONS = [
  "Obrigado pelas respostas! Como você informou que não possui doença e não sofreu acidente, gostaria que me explicasse melhor sua situação. Qual é a sua dúvida ou em que podemos ajudá-lo? Enquanto isso, já siga nosso perfil no Instagram @monicalucioli",
  "Agradeço por responder! Como você me disse que não tem doenças ou sequelas de acidentes, como podemos te ajudar hoje? Me conta qual é a sua dúvida. Aproveite e nos siga no Instagram @monicalucioli",
  "Obrigado! Como na sua situação não há relato de doença ou acidente, me explica melhor o que você gostaria de ver com a gente e qual a sua dúvida. Enquanto aguarda, siga nosso perfil @monicalucioli no Instagram"
];

export class SofiaEngine {
  private supabase;
  private groq;
  private openai;

  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  // Novo: Método para transcrever áudio com fallback nativo no OpenAI Whisper caso a Groq esteja bloqueada
  async transcribeAudio(audioBuffer: Buffer) {
    // 1. Tenta transcrever com o Groq Whisper primeiro
    try {
      console.log("🎙️ Tentando transcrição via Groq...");
      const transcription = await this.groq.audio.transcriptions.create({
        file: await Groq.toFile(audioBuffer, 'audio.ogg'),
        model: 'whisper-large-v3',
        language: 'pt'
      });
      if (transcription && transcription.text) {
        console.log("✅ Transcrição via Groq efetuada com sucesso!");
        return transcription.text;
      }
    } catch (error: any) {
      console.warn("⚠️ Falha na transcrição da Groq (provável bloqueio de IP/Rede). Tentando OpenAI Whisper...", error.message);
    }

    // 2. Fallback para áudio nativo na OpenAI Whisper (sem necessidade de Groq!)
    try {
      console.log("🎙️ Iniciando transcrição nativa de áudio na OpenAI (Whisper)...");
      const transcription = await this.openai.audio.transcriptions.create({
        file: await OpenAI.toFile(audioBuffer, 'audio.ogg'),
        model: 'whisper-1',
        language: 'pt'
      });
      if (transcription && transcription.text) {
        console.log("✅ Transcrição via OpenAI Whisper efetuada com sucesso!");
        return transcription.text;
      }
    } catch (err: any) {
      console.error("❌ Falha crítica em todas as tentativas de transcrição de áudio (Groq e OpenAI):", err.message);
    }

    return null;
  }

  private isSimpleGreeting(text: string): boolean {
    const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cleanNoPunct = clean.replace(/[?!.,]/g, "").trim();
    
    const greetings = [
      'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'ola lara', 'oi lara', 
      'opa', 'tudo bem', 'tudo bom', 'fala', 'blz', 'fala blz', 'beleza', 
      'eae', 'eai', 'salve', 'opa lara'
    ];
    
    return cleanNoPunct.length <= 15 && greetings.includes(cleanNoPunct);
  }

  extrairNomePorCodigo(text: string): string | null {
    // 1. Normalize
    let clean = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[?!.,;:-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 2. Remove saudações conhecidas
    const saudacoes = [
      "bom dia", "boa tarde", "boa noite", 
      "tudo bem", "tudo bom", "tudo joia", "como vai",
      "ola", "oi", "blz", "beleza", "opa", "eae", "eai", "salve"
    ];
    for (const s of saudacoes) {
      clean = clean.replace(new RegExp(`\\b${s}\\b`, 'g'), "").trim();
    }

    // 3. Remove introduções de nome comuns
    const intros = [
      "meu nome e o", "meu nome e a", "meu nome e",
      "me chamo o", "me chamo a", "me chamo",
      "pode me chamar de", "pode chamar de",
      "aqui e o", "aqui e a", "aqui e",
      "sou o", "sou a", "sou",
      "fala com o", "fala com a", "fala com"
    ];
    for (const intro of intros) {
      clean = clean.replace(new RegExp(`\\b${intro}\\b`, 'g'), "").trim();
    }

    // 4. Remove outras stop words comuns
    const stopWords = ["por favor", "por gentileza", "doutora", "dra", "lara", "atendente", "assistente"];
    for (const sw of stopWords) {
      clean = clean.replace(new RegExp(`\\b${sw}\\b`, 'g'), "").trim();
    }

    // Limpa espaços extras
    clean = clean.replace(/\s+/g, " ").trim();

    // 5. Validação do nome restante
    if (clean.length === 0) return null;
    
    // Nomes não contêm números
    if (/\d/.test(clean)) return null;

    const words = clean.split(" ");
    
    // Deve ter entre 1 e 4 palavras
    if (words.length < 1 || words.length > 4) return null;

    // Lista de palavras proibidas (verbos de ação comuns ou termos de negação)
    const forbidden = ["nao", "sim", "advogado", "ajuda", "caso", "processo", "inss", "bpc", "loas", "aposentar", "aposentadoria"];
    for (const w of words) {
      if (forbidden.includes(w)) return null;
      if (w.length < 2 && w !== "e") return null; // Evita letras soltas
    }

    // Capitaliza cada palavra do nome
    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return capitalized;
  }

  private isValidName(text: string): boolean {
    return this.extrairNomePorCodigo(text) !== null;
  }

  sanitizeExtractedData(mergedData: any, text: string, currentState?: string): any {
    const lowerText = text.toLowerCase().trim();
    const cleanText = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .trim();

    // Se o texto indica dúvida/confusão sobre advogado, garante que has_lawyer NÃO seja extraído
    const isConfusion = /\b(como assim|nao entendi|nao compreendi|o que|como e|nao entedi|entendi nao|que isso)\b/i.test(cleanText) || 
                        (text.includes("?") && (cleanText.includes("como") || cleanText.includes("que") || cleanText.includes("assim")));
    if (isConfusion && currentState === 'AWAITING_LAWYER') {
      console.log(`[EXTRAÇÃO] Lead demonstrou dúvida/confusão em AWAITING_LAWYER. Removendo has_lawyer do payload.`);
      delete mergedData.has_lawyer;
    }

    // Auto-inferência de ja_contribuiu = false
    if (
      cleanText.includes("nunca contrib") ||
      cleanText.includes("nunca paguei") ||
      cleanText.includes("nunca tive carteira") ||
      cleanText.includes("nunca trabalhei com carteira") ||
      cleanText.includes("nao tenho carteira") ||
      cleanText.includes("nao contribuo") ||
      cleanText.includes("nunca recolhi")
    ) {
      mergedData.ja_contribuiu = false;
      mergedData.inss_tempo_carteira = 'nenhum';
    }

    // Auto-inferência de bpc_pessoas_casa = 'sozinha' se o lead diz que mora só
    if (
      cleanText.includes("moro sozinha") ||
      cleanText.includes("moro sozinho") ||
      cleanText.includes("moro so") ||
      cleanText.includes("apenas eu") ||
      cleanText.includes("somente eu") ||
      cleanText.includes("eu sozinha") ||
      cleanText.includes("eu sozinho")
    ) {
      mergedData.bpc_pessoas_casa = 'sozinha';
    }

    // 1. trabalha_atualmente: false auto-inference
    if (
      mergedData.has_no_income === true || 
      mergedData.is_bedridden === true ||
      cleanText.includes("nao tenho renda") ||
      cleanText.includes("sem renda") ||
      cleanText.includes("desempregado") ||
      cleanText.includes("desempregada") ||
      cleanText.includes("nao trabalho") ||
      cleanText.includes("sem trabalhar") ||
      cleanText.includes("nao tenho como trabalhar") ||
      cleanText.includes("nao consigo trabalhar") ||
      cleanText.includes("nao posso trabalhar")
    ) {
      mergedData.trabalha_atualmente = false;
    }

    // 2. Clear works/duration confusion in AWAITING_CONTRIBUTION / RETIREMENT_AWAITING_WORK_HISTORY
    if (currentState === 'AWAITING_CONTRIBUTION' || currentState === 'RETIREMENT_AWAITING_WORK_HISTORY') {
      const hasDurationWord = /(ano|anos|década|décadas|mês|meses)/i.test(text);
      if (hasDurationWord && !cleanText.includes("tenho") && !cleanText.includes("idade") && !cleanText.includes("nasci")) {
        mergedData.inss_tempo_carteira = text.trim();
        mergedData.ja_contribuiu = true;
        delete mergedData.idade;
      }
    }

    // 3. Yes/No mapping for FSM states
    const isNegative = cleanText === 'nao' || cleanText === 'n' || cleanText.startsWith('nao ') || cleanText.startsWith('n ') || cleanText.includes(' nao') || cleanText.includes('nao ') || cleanText.includes('tambem nao');
    const isPositive = cleanText === 'sim' || cleanText === 's' || cleanText.startsWith('sim ') || cleanText.startsWith('s ') || cleanText.includes(' sim') || cleanText.includes('sim ');

    if (isNegative) {
      if (currentState === 'AWAITING_LAWYER') mergedData.has_lawyer = false;
      if (currentState === 'AWAITING_WORK') mergedData.trabalha_atualmente = false;
      if (currentState === 'AWAITING_CURRENT_CONTRIBUTION') mergedData.esta_contribuindo_atualmente = false;
      if (currentState === 'AWAITING_DISEASE') {
        mergedData.tem_doenca_ou_limitacao = false;
        mergedData.doenca = 'Não';
      }
      if (currentState === 'AWAITING_DISABILITY') {
        mergedData.tem_deficiencia = false;
        mergedData.deficiencia = 'Não';
      }
      if (currentState === 'BPC_AWAITING_CADUNICO') mergedData.bpc_cad_unico = false;
      if (currentState === 'INSS_AWAITING_REPORTS') mergedData.inss_laudos_medicos = false;
      if (currentState === 'INSS_AWAITING_LAST_CONTRIBUTION') {
        mergedData.inss_ultima_contribuicao = 'Não contribuiu nos últimos 5 anos';
        mergedData.has_recent_contribution = false;
      }
      if (currentState === 'RETIREMENT_AWAITING_SPECIAL_RURAL') mergedData.retirement_special_rural = 'Não';
      if (currentState === 'RETIREMENT_AWAITING_OTHER_PERIODS') mergedData.retirement_other_periods = 'Não';
    } else if (isPositive) {
      if (currentState === 'AWAITING_LAWYER') mergedData.has_lawyer = true;
      if (currentState === 'AWAITING_WORK') mergedData.trabalha_atualmente = true;
      if (currentState === 'AWAITING_CURRENT_CONTRIBUTION') {
        mergedData.esta_contribuindo_atualmente = true;
        mergedData.ja_contribuiu = true;
      }
      if (currentState === 'AWAITING_DISEASE') {
        mergedData.tem_doenca_ou_limitacao = true;
      }
      if (currentState === 'AWAITING_DISABILITY') {
        mergedData.tem_deficiencia = true;
      }
      if (currentState === 'BPC_AWAITING_CADUNICO') mergedData.bpc_cad_unico = true;
      if (currentState === 'INSS_AWAITING_REPORTS') mergedData.inss_laudos_medicos = true;
      if (currentState === 'RETIREMENT_AWAITING_SPECIAL_RURAL') mergedData.retirement_special_rural = 'Sim';
      if (currentState === 'RETIREMENT_AWAITING_OTHER_PERIODS') mergedData.retirement_other_periods = 'Sim';
    }

    // Mapeamento extra de durabilidade para tempo de contribuição total
    if (currentState === 'AWAITING_TOTAL_CONTRIBUTION') {
      const hasDurationWord = /(ano|anos|década|décadas|mês|meses)/i.test(text);
      if (hasDurationWord && !cleanText.includes("tenho") && !cleanText.includes("idade") && !cleanText.includes("nasci")) {
        mergedData.inss_tempo_carteira = text.trim();
        mergedData.ja_contribuiu = true;
      }
    }

    // Correção para INSS_AWAITING_LAST_CONTRIBUTION: garante que tempo de parada não sobrescreva tempo de carteira
    if (currentState === 'INSS_AWAITING_LAST_CONTRIBUTION') {
      if (mergedData.inss_tempo_carteira && !mergedData.inss_ultima_contribuicao) {
        mergedData.inss_ultima_contribuicao = mergedData.inss_tempo_carteira;
        delete mergedData.inss_tempo_carteira;
      }
      const hasTimeIndicator = /(mês|meses|ano|anos|dia|dias|desde|faz|há|em)/i.test(text);
      if (hasTimeIndicator && !mergedData.inss_ultima_contribuicao) {
        mergedData.inss_ultima_contribuicao = text.trim();
      }
    }

    // Cross-mapping de tempo de parada de contribuição para evitar estados presos ou duplicidade de perguntas
    if (mergedData.tempo_parou_contribuir && !mergedData.inss_ultima_contribuicao) {
      mergedData.inss_ultima_contribuicao = mergedData.tempo_parou_contribuir;
    }
    if (mergedData.inss_ultima_contribuicao && !mergedData.tempo_parou_contribuir) {
      mergedData.tempo_parou_contribuir = mergedData.inss_ultima_contribuicao;
    }

    // Sanitização de tempo de contribuição para evitar duplicações de palavras na fala da IA
    if (mergedData.inss_tempo_carteira) {
      const cleanVal = String(mergedData.inss_tempo_carteira).toLowerCase();
      const matchNum = cleanVal.match(/\d+/);
      if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        if (cleanVal.includes("mes") || cleanVal.includes("mese")) {
          mergedData.inss_tempo_carteira = `${num} ${num === 1 ? 'mês' : 'meses'}`;
        } else {
          mergedData.inss_tempo_carteira = `${num} ${num === 1 ? 'ano' : 'anos'}`;
        }
      }
    }

    // 4. Name validation
    if (mergedData.nome_usuario && !this.isValidName(mergedData.nome_usuario)) {
      console.log(`⚠️ Nome pré-extraído/IA "${mergedData.nome_usuario}" rejeitado pelas regras de validação.`);
      delete mergedData.nome_usuario;
    }

    return mergedData;
  }

  detectarBeneficiarioTerceiro(text: string): string | null {
    const clean = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const relacoes = [
      { key: 'meu filho', label: 'filho' },
      { key: 'minha filha', label: 'filha' },
      { key: 'meu marido', label: 'marido' },
      { key: 'minha esposa', label: 'esposa' },
      { key: 'meu companheiro', label: 'companheiro' },
      { key: 'minha companheira', label: 'companheira' },
      { key: 'meu pai', label: 'pai' },
      { key: 'minha mae', label: 'mãe' },
      { key: 'meu neto', label: 'neto' },
      { key: 'minha neta', label: 'neta' },
      { key: 'meu irmao', label: 'irmão' },
      { key: 'minha irma', label: 'irmã' },
      { key: 'meu avo', label: 'avô' },
      { key: 'minha avo', label: 'avó' },
      { key: 'meu tio', label: 'tio' },
      { key: 'minha tia', label: 'tia' },
      { key: 'meu sogro', label: 'sogro' },
      { key: 'minha sogra', label: 'sogra' },
      { key: 'meu sobrinho', label: 'sobrinho' },
      { key: 'minha sobrinha', label: 'sobrinha' },
      { key: 'meu genro', label: 'genro' },
      { key: 'minha nora', label: 'nora' },
      { key: 'meu enteado', label: 'enteado' },
      { key: 'minha enteada', label: 'enteada' }
    ];

    for (const rel of relacoes) {
      const regex = new RegExp(`\\b${rel.key}\\b`, 'i');
      if (regex.test(clean)) {
        return rel.label;
      }
    }
    return null;
  }

  async runExtraction(text: string, currentState?: string): Promise<any> {
    const prompt = `Você é um extrator de dados de texto especializado em triagem previdenciária.
Sua única tarefa é analisar o texto enviado pelo cliente e extrair todas as informações preenchidas para os campos especificados abaixo.
Responda APENAS com um objeto JSON válido, sem markdown, sem explicações. Qualquer campo não presente ou não mencionado no texto deve ser retornado como null.

${currentState ? `CONTEXTO DA CONVERSA: O estado atual da triagem é "${currentState}". Se for "AWAITING_CONTRIBUTION" ou "RETIREMENT_AWAITING_WORK_HISTORY", as respostas curtas de tempo como "38 anos", "20 anos", "15 anos" referem-se ao tempo de contribuição ou tempo de carteira, e NÃO à idade do cliente.` : ''}

Campos a extrair:
- nome_usuario: (string ou null) O nome próprio do cliente (ex: João, Maria, José). ATENÇÃO: Nunca extraia saudações, gírias ou verbos de saudação como nome próprio (por exemplo, se o cliente enviar "Oi", "Olá", "Fala", "Blz", "Bom dia", "Quero", "Tenho", NUNCA extraia esses termos no campo nome_usuario; retorne null para esses casos).
- sofrimento_relatado: (string ou null) Se o cliente relatar sofrimento emocional, luto, desespero, perda recente, dor física, limitação ou incapacidade grave para o trabalho (ex: "estou sofrendo muito", "meu marido faleceu", "estou na cama com dor", "estou desesperado", "problema no joelho que não deixa trabalhar", "dor na coluna forte", "depressão grave"). Extraia a frase ou descrição curta do sofrimento/dor/perda/incapacidade/limitação relatado.
- has_lawyer: (boolean ou null) Se o cliente já possui um advogado para o seu caso (true se tiver, false se disser que não tem, ex: "não tenho", "não tenho advogado", "não", e null se não for mencionado).
- idade: (string/number ou null) A idade ou ano de nascimento se puder ser deduzida.
- trabalha_atualmente: (boolean ou null) Se o cliente trabalha hoje em dia. ATENÇÃO: Infira como false automaticamente se o cliente mencionar expressões que indicam diretamente que ele não trabalha ou não tem atividade remunerada (por exemplo: "não tenho renda", "estou desempregado(a)", "estou sem trabalhar", "não tenho como trabalhar", "sou de cama", "não trabalho").
- esta_contribuindo_atualmente: (boolean ou null) Se o cliente está fazendo contribuições/pagando o INSS atualmente.
- tempo_parou_contribuir: (string ou null) Tempo ou ano em que parou de contribuir, caso não contribua atualmente (ex: "parou há 2 anos", "última foi em 2020", "nunca contribuiu").
- tem_deficiencia: (boolean ou null) Se o cliente relatou ter alguma deficiência física, mental, sensorial ou intelectual.
- ja_contribuiu: (boolean ou string ou null) Se o cliente já pagou ou contribuiu para o INSS na vida. ATENÇÃO: Se o cliente disser que tempo de contribuição (ex: "15 anos de contribuição" ou "trabalhei de carteira assinada"), classifique ja_contribuiu como true ou a descrição correspondente.
- tem_doenca_ou_limitacao: (boolean ou null) Se o cliente relatar alguma doença, incapacidade, problema de saúde, sequela de acidente, deficiência ou limitação.
- doenca: (string ou null) O nome, descrição ou diagnóstico da doença, dor ou problema de saúde relatado pelo cliente (ex: "hérnia de disco", "cisto sinovial", "gota e reumatismo").
- acidente: (string ou null) O nome, descrição ou tipo de acidente sofrido pelo cliente caso relatado (ex: "acidente de moto", "acidente de trabalho").
- inss_tempo_carteira: (string ou null) Tempo trabalhado de carteira assinada ou tempo de contribuição mencionado (ex: "15 anos").
- bpc_pessoas_casa: (string ou null) Quantidade ou quem são as pessoas que moram com ele.
- bpc_parentesco: (string ou null) Grau de parentesco das pessoas que moram com ele.
- bpc_renda_familiar: (boolean ou null) Se o cliente ou alguém na casa dele possui renda, salário, pensão, benefício, aposentadoria ou faz bicos/trabalho informal (true se tiver alguma renda/receber dinheiro/fizer bicos/trabalho, false se disser que não recebe nada, não tem renda ou usar expressões como "quem me dera", e null se não for mencionado).
- bpc_quem_renda: (string ou null) Quem na casa tem renda e qual o valor.
- bpc_casa_alugada_propria: (string ou null) Se a casa é alugada, própria, cedida, etc.
- bpc_cad_unico: (boolean ou string ou null) Se tem Cadastro Único (CadÚnico).
- inss_foi_autonomo: (boolean ou null) Se trabalhou como autônomo.
- inss_como_contribuiu: (string ou null) Como contribuiu (carnê, carteira assinada, etc.).
- inss_ultima_contribuicao: (string ou null) Informação sobre se e quando contribuiu ou pagou carnê do INSS nos últimos 5 anos (ex: "paguei ano passado", "há 3 anos atrás", "não paguei nos últimos 5 anos").
- inss_laudos_medicos: (boolean ou null) Se possui exames ou laudos médicos.
- inss_data_laudo: (string ou null) Data do laudo médico.
- has_recent_report: (boolean ou null) Se o laudo médico é recente (últimos meses).
- has_cad_unico: (boolean ou null) Se tem CadÚnico ativo.
- has_recent_contribution: (boolean ou null) Se tem contribuição recente ao INSS.
- has_no_income: (boolean ou null) Se não possui nenhuma renda.
- is_bedridden: (boolean ou null) Se está acamado ou precisa de assistência permanente.
- cidade: (string ou null) Cidade e/ou estado onde o cliente mora, se mencionado (ex: "São Paulo/SP", "Fortaleza-CE", "interior de Minas").
- retirement_work_history: (string ou null) Histórico de registro ou trabalho do cliente (se trabalhou de carteira assinada, autônomo, sem registro, pagou carnê, etc.).
- retirement_special_rural: (string ou null) Experiência de trabalho na roça (meio rural) ou sob condições insalubres/perigosas (muito ruído, calor, químicos, eletricidade, perigo).
- retirement_other_periods: (string ou null) Menção a serviço público, militar, escola técnica anterior a 1998, ou menor aprendiz.
- tem_docs_em_maos: (boolean ou null) Se o cliente menciona possuir carteira de trabalho, CNIS, extratos, carnês ou qualquer documento físico/digital previdenciário em mãos (ex: "estou com a carteira aqui", "tenho os documentos em mãos", "tenho os papéis", "tenho os comprovantes").
- is_off_topic: (boolean ou null) true se a mensagem do cliente NÃO fornece nenhum dado útil para a triagem. Isso inclui: (1) assuntos completamente fora do contexto (receitas, futebol, piadas, política geral), E TAMBÉM (2) reclamações, desabafos ou críticas sobre o sistema INSS/BPC/governo/regras previdenciárias que não informam dados pessoais do cliente (ex: "o BPC não vale nada", "o INSS é uma roubada", "essas regras são injustas", "o governo não ajuda ninguém"). ATENÇÃO: se o cliente desabafa sobre dor, doença ou limitação pessoal, isso NÃO é off-topic — extraia os campos de saúde normalmente e deixe is_off_topic como null.

Texto a analisar:
"${text}"

JSON de retorno:`;

    try {
      console.log("🔍 Executando pre-extração de campos...");
      const responseText = await this.generateTextWithFallback(prompt);
      if (!responseText) return {};
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const extracted = JSON.parse(cleanJson);
      
      // Filtra chaves com valores válidos (não nulos, não indefinidos, não vazios)
      const mergedData: any = {};
      for (const key of Object.keys(extracted)) {
        if (extracted[key] !== null && extracted[key] !== undefined && extracted[key] !== "") {
          mergedData[key] = extracted[key];
        }
      }
      
      // Aplica regras de sanitização/invenções pós-extração
      return this.sanitizeExtractedData(mergedData, text, currentState);
    } catch (error) {
      console.error("⚠️ Falha na pre-extração de campos:", error);
      return {};
    }
  }

  interpretador_codigo(text: string, currentState?: string): any {
    const clean = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .trim();

    const data: any = {};

    // 1. Advogado (AWAITING_LAWYER)
    if (currentState === 'AWAITING_LAWYER') {
      if (/\b(nao|ainda nao|tenho nao|nao tenho|nenhum|nunca)\b/.test(clean)) {
        data.has_lawyer = false;
      } else if (/\b(sim|tenho|ja tenho|ja sim)\b/.test(clean)) {
        data.has_lawyer = true;
      }
    }

    // 2. Idade (AWAITING_AGE)
    if (currentState === 'AWAITING_AGE' || clean.includes("anos") || /\b\d{1,2}\b/.test(clean)) {
      const match = clean.match(/\b\d{1,2}\b/);
      if (match) {
        data.idade = parseInt(match[0], 10);
      } else {
        if (clean.includes("sessenta e cinco")) data.idade = 65;
        else if (clean.includes("sessenta e seis")) data.idade = 66;
        else if (clean.includes("sessenta e sete")) data.idade = 67;
        else if (clean.includes("sessenta e oito")) data.idade = 68;
        else if (clean.includes("sessenta e nove")) data.idade = 69;
        else if (clean.includes("setenta")) {
          if (clean.includes("dois")) data.idade = 72;
          else if (clean.includes("um")) data.idade = 71;
          else if (clean.includes("tres")) data.idade = 73;
          else if (clean.includes("quatro")) data.idade = 74;
          else if (clean.includes("cinco")) data.idade = 75;
          else data.idade = 70;
        }
      }
    }

    // 2.5 Moradia/Companhia (BPC_AWAITING_HOUSEHOLD)
    if (currentState === 'BPC_AWAITING_HOUSEHOLD') {
      if (clean && clean.length > 0) {
        data.bpc_pessoas_casa = text.trim();
      }
    }

    // 3. Renda (BPC_AWAITING_HOUSEHOLD_INCOME)
    if (currentState === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
      if (
        /\b(nao|nada|nenhuma|nenhum|nunca|sem renda|quem me dera|nao recebo|recebo nao|infelizmente nao)\b/.test(clean) ||
        clean.includes("quem me dera") ||
        clean.includes("nao tenho renda") ||
        clean.includes("nao ganho nada")
      ) {
        data.bpc_renda_familiar = false;
        data.bpc_quem_renda = 'nenhuma';
      } else if (/\b(sim|recebo|ganho|bolsa|pensao|aposentadoria|bpc|loas|ajuda|salario)\b/.test(clean)) {
        data.bpc_renda_familiar = true;
      }
    }

    if (currentState === 'BPC_AWAITING_HOME_STATUS') {
      const mentionsRua = /\b(moro|moramos|vivo|vivemos|somos)\b.{0,15}\b(na rua|nas ruas)\b|\brua\b.{0,15}\b(moro|moramos|mesmo)\b/i.test(clean) ||
                           /\b(debaixo da ponte|embaixo da ponte)\b/i.test(clean);
      const mentionsCedidaTerceiro = /\b(amigo|amiga|conhecido|conhecida|parente|vizinho|vizinha|cunhado|cunhada|sogro|sogra|avo|avó|tio|tia|irma|irmao)\b.{0,20}\b(emprest|cedeu|deu a casa|deixou ficar)/i.test(clean);

      if (mentionsRua) {
        data.bpc_casa_alugada_propria = 'situacao_de_rua';
      } else if (clean.includes("aluga") || clean.includes("alugu")) {
        data.bpc_casa_alugada_propria = 'alugada';
      } else if (clean.includes("propri") || clean.includes("minha")) {
        data.bpc_casa_alugada_propria = 'propria';
      } else if (clean.includes("cedid") || clean.includes("emprest") || clean.includes("de favor") || mentionsCedidaTerceiro) {
        data.bpc_casa_alugada_propria = 'cedida';
      }
    }

    // 5. CadÚnico (BPC_AWAITING_CADUNICO)
    if (currentState === 'BPC_AWAITING_CADUNICO') {
      if (/\b(nao|nao tenho|tenho nao|nunca fiz|sem cadastro)\b/.test(clean)) {
        data.bpc_cad_unico = false;
        data.bpc_cadunico = false;
      } else if (/\b(sim|tenho|ja fiz|cadastrada|cadastrado)\b/.test(clean)) {
        data.bpc_cad_unico = true;
        data.bpc_cadunico = true;
      }
    }

    // 5.5 Tempo de afastamento (AWAITING_LAST_CONTRIBUTION_TIME)
    if (currentState === 'AWAITING_LAST_CONTRIBUTION_TIME') {
      if (clean && clean.length > 0) {
        data.tempo_parou_contribuir = text.trim();
      }
    }

    // 6. Nome (AWAITING_NAME)
    if (currentState === 'AWAITING_NAME') {
      const nomeDetectado = this.extrairNomePorCodigo(text);
      if (nomeDetectado) {
        data.nome_usuario = nomeDetectado;
      }
    }

    return data;
  }

  async runHybridExtraction(text: string, currentState?: string): Promise<any> {
    const codeResult = this.interpretador_codigo(text, currentState);
    // Lista de estados que o interpretador_codigo já resolve com segurança sem precisar de IA
    const estadosResolvidosPorCodigo = ['AWAITING_NAME', 'AWAITING_LAWYER', 'AWAITING_AGE', 'BPC_AWAITING_HOUSEHOLD_INCOME', 'BPC_AWAITING_HOME_STATUS', 'BPC_AWAITING_CADUNICO', 'BPC_AWAITING_HOUSEHOLD'];
    let needsFallback = true; // Por padrão, SEMPRE usa IA como rede de segurança
    if (currentState === 'AWAITING_NAME' && !codeResult.nome_usuario) needsFallback = true;
    if (currentState === 'AWAITING_LAWYER' && codeResult.has_lawyer === undefined) needsFallback = true;
    if (currentState === 'AWAITING_AGE' && !codeResult.idade) needsFallback = true;
    if (currentState === 'BPC_AWAITING_HOUSEHOLD_INCOME' && codeResult.bpc_renda_familiar === undefined) needsFallback = true;
    if (currentState === 'BPC_AWAITING_HOME_STATUS' && !codeResult.bpc_casa_alugada_propria) needsFallback = true;
    if (currentState === 'BPC_AWAITING_CADUNICO' && codeResult.bpc_cad_unico === undefined) needsFallback = true;
    if (currentState === 'BPC_AWAITING_HOUSEHOLD' && !codeResult.bpc_pessoas_casa) needsFallback = true;
    // Só marca como resolvido por código (false) se o estado está na lista segura E o código de fato extraiu o dado
    if (estadosResolvidosPorCodigo.includes(currentState || '')) {
      if (currentState === 'AWAITING_NAME' && codeResult.nome_usuario) needsFallback = false;
      if (currentState === 'AWAITING_LAWYER' && codeResult.has_lawyer !== undefined) needsFallback = false;
      if (currentState === 'AWAITING_AGE' && codeResult.idade) needsFallback = false;
      if (currentState === 'BPC_AWAITING_HOUSEHOLD_INCOME' && codeResult.bpc_renda_familiar !== undefined) needsFallback = false;
      if (currentState === 'BPC_AWAITING_HOME_STATUS' && codeResult.bpc_casa_alugada_propria) needsFallback = false;
      if (currentState === 'BPC_AWAITING_CADUNICO' && codeResult.bpc_cad_unico !== undefined) needsFallback = false;
      if (currentState === 'BPC_AWAITING_HOUSEHOLD' && codeResult.bpc_pessoas_casa) needsFallback = false;
    }

    if (!needsFallback) {
      console.log("⚡ Extração por Código resolvida com sucesso (sem fallback de IA).");
      return this.sanitizeExtractedData(codeResult, text, currentState);
    }

    console.log("🤖 Extração por Código incompleta. Executando fallback silencioso de IA...");
    const iaResult = await this.runExtraction(text, currentState);

    const merged = { ...iaResult, ...codeResult };
    return this.sanitizeExtractedData(merged, text, currentState);
  }


  async processMessage(phone: string, input: string | Buffer) {
    const isAudio = typeof input !== 'string';
    let text: string | null = null;
    const timestampStart = new Date().toISOString();

    if (isAudio) {
      console.log(`[INSTRUMENTAÇÃO ÁUDIO] [${timestampStart}] [Lead: ${phone}] 1. Áudio recebido (Buffer size: ${(input as Buffer).length} bytes)`);
      console.log(`[INSTRUMENTAÇÃO ÁUDIO] [${timestampStart}] [Lead: ${phone}] 2. Transcrição iniciada`);
      try {
        text = await this.transcribeAudio(input as Buffer);
        if (text) {
          console.log(`[INSTRUMENTAÇÃO ÁUDIO] [${timestampStart}] [Lead: ${phone}] 3. Texto transcrito completo: "${text}"`);
        } else {
          console.log(`[INSTRUMENTAÇÃO ÁUDIO] [${timestampStart}] [Lead: ${phone}] 6. Motivo caso a transcrição falhe: Retornou texto vazio ou nulo de ambos Groq e Gemini`);
        }
      } catch (err: any) {
        console.error(`[INSTRUMENTAÇÃO ÁUDIO] [${timestampStart}] [Lead: ${phone}] 6. Motivo caso a transcrição falhe: Erro lançado no processo de transcrição: ${err.message}`);
      }
    } else {
      text = input as string;
    }

    if (!text) return "Desculpe, não consegui entender o seu áudio. Pode repetir ou digitar?";

    const timestamp = new Date().toISOString();
    console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 1. Mensagem recebida: "${text}"`);

    const isGreeting = this.isSimpleGreeting(text);
    let { data: session } = await this.supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
    console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 2. Estado atual carregado: FSM="${session?.user_data?.state_fsm || 'N/A'}", Step="${session?.step || 'N/A'}"`);

    // 0. GUARDA DE ATENDIMENTO HUMANO: Se o lead já foi assumido por operador humano, silencia o bot
    if (session && session.user_data?.status === 'em_atendimento') {
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 🔒 BOT MUTADO: Lead assumido por humano.`);
      return null;
    }

    // 1. Extração prévia de campos do texto antes de qualquer coisa (bloco consolidado)
    let extractedData: any = {};

    // Detecta beneficiário terceiro em qualquer mensagem, antes de tudo (código puro)
    let beneficiarioTerceiro = session?.user_data?.beneficiario_terceiro || null;
    if (!beneficiarioTerceiro) {
      const detectedFamiliar = this.detectarBeneficiarioTerceiro(text);
      if (detectedFamiliar) {
        beneficiarioTerceiro = detectedFamiliar;
        extractedData.beneficiario_terceiro = detectedFamiliar;
      }
    }

    if (!isGreeting) {
      const currentState = session?.user_data?.state_fsm || undefined;

      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 3. Conteúdo enviado ao extractor: "${text}" (currentState: "${currentState}")`);
      if (isAudio) {
        console.log(`[INSTRUMENTAÇÃO ÁUDIO] [${timestamp}] [Lead: ${phone}] 4. Resultado enviado ao extractor: "${text}"`);
      }
      const rawExtracted = await this.runHybridExtraction(text, currentState);
      extractedData = {
        ...extractedData,
        ...rawExtracted
      };

      if (session?.user_data?.beneficiario_terceiro && session?.user_data?.idade !== undefined && session?.user_data?.idade !== null) {
        delete extractedData.idade;
      }

      // Trava para evitar que doenças já registradas sejam sobrescritas por negações em turnos posteriores
      const oldDoenca = session?.user_data?.doenca;
      if (oldDoenca && oldDoenca.toLowerCase() !== 'não' && oldDoenca.toLowerCase() !== 'nao' && oldDoenca.trim() !== '') {
        delete extractedData.doenca;
        delete extractedData.tem_doenca_ou_limitacao;
      }

      const oldDeficiencia = session?.user_data?.deficiencia;
      if (oldDeficiencia && oldDeficiencia.toLowerCase() !== 'não' && oldDeficiencia.toLowerCase() !== 'nao' && oldDeficiencia.trim() !== '') {
        delete extractedData.deficiencia;
        delete extractedData.tem_deficiencia;
      }

      if (currentState === 'AWAITING_CURRENT_CONTRIBUTION' && session?.user_data?.reformulou_trabalho === true) {
        if (extractedData.esta_contribuindo_atualmente === undefined) {
          extractedData.esta_contribuindo_atualmente = false;
        }
      }
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 4. Dados extraídos (híbrido): ${JSON.stringify(extractedData)}`);
      if (isAudio) {
        console.log(`[INSTRUMENTAÇÃO ÁUDIO] [${timestamp}] [Lead: ${phone}] 5. Campos extraídos do áudio: ${JSON.stringify(extractedData)}`);
      }
      console.log("📝 Dados extraídos previamente:", JSON.stringify(extractedData));
    }

    const currentHasLawyer = session && (
      session.user_data?.has_lawyer === true ||
      session.user_data?.has_lawyer === 'true' ||
      extractedData.has_lawyer === true ||
      extractedData.has_lawyer === 'true'
    );

    if (currentHasLawyer) {
      // Se já possui advogado, encerra de forma educada e definitiva sem chamar a IA
      const nome = session.user_data?.nome_usuario || 'amigo(a)';
      // Garante que o status_final fique salvo como com_advogado e has_lawyer como true
      const updates = { has_lawyer: true, status_final: 'com_advogado', score_total: 0 };
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 6. Payload enviado ao Supabase: step="finished", updates=${JSON.stringify(updates)}`);

      const { data: newMergedData, error } = await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: 'finished',
        p_user_data_updates: updates
      });

      if (error) {
        console.error(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Falha na persistência: ${JSON.stringify(error)}`);
      } else {
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Confirmação de persistência bem-sucedida. Data retornado: ${JSON.stringify(newMergedData)}`);
      }

      const { data: reReadSession } = await this.supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 8. Estado relido após save: FSM="${reReadSession?.user_data?.state_fsm}", step="${reReadSession?.step}", user_data=${JSON.stringify(reReadSession?.user_data)}`);

      const finalReply = `Entendo, ${nome}. Por questões éticas, nosso escritório não interfere em processos que já estão sendo conduzidos por outro advogado. O ideal é continuar com ele. Inclusive, se o seu caso for favorável, ter dois advogados geraria dois honorários, o que não seria bom pra você.`;
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente: "${finalReply}"`);
      return finalReply;
    }

    // GUARDA GLOBAL: Se a sessão já está no estado FINISHED, não processa nada - retorna mensagem de encerramento
    if (session && session.user_data?.state_fsm === 'FINISHED' && session.user_data?.status_final !== 'com_advogado') {
      const cleanText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isThanks = /\b(obrigad|valeu|agradec|tks|thanks|obg)\b/i.test(cleanText);
      if (isThanks) {
        const respostaAgradecimento = "De nada, daqui alguns minutos um profissional entrará em contato com você.";
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] GUARDA GLOBAL FINISHED (AGRADECIMENTO): Retornando retribuição.`);
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente: "${respostaAgradecimento}"`);
        return respostaAgradecimento;
      }
      
      let respostaFinal = `Com base no que você me contou nossa equipe vai analisar melhor o seu caso. Assim que possível entraremos em contato novamente`;
      if (session.user_data?.triagem_encerrada_msg_enviada) {
        respostaFinal = "Essa parte específica só a nossa equipe consegue confirmar depois de analisar seu caso com calma — mas já registrei sua pergunta pra eles. Assim que tivermos uma resposta, entramos em contato.";
      } else {
        const updates = { triagem_encerrada_msg_enviada: true };
        await this.supabase.rpc('save_session_data', {
          p_phone: phone,
          p_step: 'finished',
          p_user_data_updates: updates
        });
      }

      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] GUARDA GLOBAL FINISHED: sessão já encerrada. Retornando mensagem de handoff.`);
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente: "${respostaFinal}"`);
      return respostaFinal;
    }

    if (!session) {
      const hour = parseInt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
      let saudacao = "Boa noite";
      if (hour >= 6 && hour < 12) saudacao = "Bom dia";
      else if (hour >= 12 && hour < 18) saudacao = "Boa tarde";

      const defaultGreeting = `${saudacao}! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?`;

      // 3. Se o lead vier direto com problema sem dar o nome:
      const leadSentProblemWithoutName = !extractedData.nome_usuario && (
        extractedData.idade || 
        extractedData.doenca || 
        extractedData.deficiencia || 
        extractedData.tempo_contribuicao || 
        extractedData.inss_tempo_carteira || 
        text.length > 30
      );

      if (leadSentProblemWithoutName) {
        let empatia = "Sinto muito que esteja passando por isso.";
        if (extractedData.beneficiario_terceiro) {
          empatia = `Que situação difícil, sinto muito pelo seu ${extractedData.beneficiario_terceiro}.`;
        } else if (extractedData.doenca) {
          empatia = `Sinto muito que esteja passando por essa dor.`;
        }
        const finalReply = `${saudacao}! Me chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. ${empatia} Me fala seu nome para eu registrar e te ajudar a entender o que pode ser feito.`;
        const initialUserData = {
          history: [
            { role: 'user', content: text },
            { role: 'assistant', content: finalReply }
          ],
          state_fsm: 'AWAITING_NAME',
          ...extractedData
        };
        await this.supabase.rpc('save_session_data', {
          p_phone: phone,
          p_step: 'welcome',
          p_user_data_updates: initialUserData
        });
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente (upfront problem without name): "${finalReply}"`);
        return finalReply;
      }

      // Se for apenas uma saudação simples e não informou nome
      if (!extractedData.nome_usuario) {
        const initialUserData = {
          history: [
            { role: 'user', content: text },
            { role: 'assistant', content: defaultGreeting }
          ],
          state_fsm: 'AWAITING_NAME',
          ...extractedData
        };
        await this.supabase.rpc('save_session_data', {
          p_phone: phone,
          p_step: 'welcome',
          p_user_data_updates: initialUserData
        });
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente (default greeting): "${defaultGreeting}"`);
        return defaultGreeting;
      }

      // Se o usuário informou o nome de primeira:
      const initialUserData: any = {
        history: [
          { role: 'assistant', content: defaultGreeting },
          { role: 'user', content: text }
        ],
        state_fsm: 'AWAITING_NAME',
        ...extractedData
      };

      const resolved = this.resolveFSMState(initialUserData);
      initialUserData.state_fsm = resolved.state;
      if (resolved.fluxo_ativo) {
        initialUserData.fluxo_ativo = resolved.fluxo_ativo;
      }
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 5. Estado calculado pela FSM: state="${resolved.state}", fluxo="${resolved.fluxo_ativo || 'N/A'}"`);

      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 6. Payload enviado ao Supabase: step="welcome", updates=${JSON.stringify(initialUserData)}`);
      const { data: createdUserData, error: initError } = await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: 'welcome',
        p_user_data_updates: initialUserData
      });

      if (initError) {
        console.error(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Falha na persistência: ${JSON.stringify(initError)}`);
      } else {
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Confirmação de persistência bem-sucedida. Data retornado: ${JSON.stringify(createdUserData)}`);
      }

      const { data: reReadSession } = await this.supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 8. Estado relido após save: FSM="${reReadSession?.user_data?.state_fsm}", step="${reReadSession?.step}", user_data=${JSON.stringify(reReadSession?.user_data)}`);

      const newSessionData: any = {
        phone,
        step: 'welcome',
        user_data: createdUserData || initialUserData
      };
      if (extractedData.sofrimento_relatado) {
        newSessionData.novo_sofrimento = extractedData.sofrimento_relatado;
      }

      console.log(`🧠 Iniciando primeira interação do usuário. Processando com IA para saudação e apresentação...`);
      return this.handleStepWithAI(newSessionData, text);
    } else {
      // Se a sessão já existe, verifica se houve mudança de nome do usuário para reiniciar a FSM se necessário
      const currentUserData = session.user_data || {};
      const oldNome = currentUserData.nome_usuario;
      const newNome = extractedData.nome_usuario;

      let updatedUserData = {
        ...currentUserData,
        ...extractedData
      };

      // Se um novo nome diferente for informado, resetamos o histórico e reiniciamos a FSM para o novo cliente
      if (newNome && oldNome && newNome.trim().toLowerCase() !== oldNome.trim().toLowerCase()) {
        console.log(`🔄 Novo nome detectado (${newNome} diferente de ${oldNome}). Reiniciando FSM da sessão...`);
        updatedUserData = {
          ...extractedData,
          history: [
            { role: 'assistant', content: `Olá! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?` },
            { role: 'user', content: text }
          ],
          state_fsm: 'AWAITING_NAME',
          nome_usuario: newNome
        };
      }

      // Resolve a FSM deterministicamente pós-extração
      const resolved = this.resolveFSMState(updatedUserData);
      updatedUserData.state_fsm = resolved.state;
      if (resolved.fluxo_ativo) {
        updatedUserData.fluxo_ativo = resolved.fluxo_ativo;
      }
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 5. Estado calculado pela FSM (pré-AI): state="${resolved.state}", fluxo="${resolved.fluxo_ativo || 'N/A'}"`);

      // Se houver novos dados extraídos ou o histórico foi reiniciado, salva no banco de dados imediatamente
      if (Object.keys(extractedData).length > 0 || (newNome && oldNome && newNome.trim().toLowerCase() !== oldNome.trim().toLowerCase())) {
        console.log("💾 Salvando dados extraídos previamente no banco de dados...");
        const updates = updatedUserData;
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 6. Payload enviado ao Supabase (pré-AI): step=null, updates=${JSON.stringify(updates)}`);

        const { data: newMergedData, error } = await this.supabase.rpc('save_session_data', {
          p_phone: phone,
          p_step: null,
          p_user_data_updates: updates
        });
        
        if (error) {
          console.error(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Falha na persistência (pré-AI): ${JSON.stringify(error)}`);
        } else {
          console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Confirmação de persistência bem-sucedida (pré-AI). Data retornado: ${JSON.stringify(newMergedData)}`);
          session.user_data = newMergedData || updatedUserData;
        }

        const { data: reReadSession } = await this.supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 8. Estado relido após save (pré-AI): FSM="${reReadSession?.user_data?.state_fsm}", step="${reReadSession?.step}", user_data=${JSON.stringify(reReadSession?.user_data)}`);
      }

      return this.handleStepWithAI(session, text);
    }
  }

  private async handleStepWithAI(session: any, text: string) {
    const { step, user_data, phone } = session;
    const history = user_data?.history || [];

    // Resolve a FSM determinística para garantir que estamos no estado correto
    const resolved = this.resolveFSMState(user_data);
    const stateFsm = resolved.state;
    if (resolved.fluxo_ativo) {
      user_data.fluxo_ativo = resolved.fluxo_ativo;
    }
    user_data.state_fsm = stateFsm;

    // INTERCEPT DE CONFUSÃO/DÚVIDA PARA PERGUNTA DE ADVOGADO (Garante tom simples e evita loops)
    const cleanText = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .trim();

    const isConfusion = /\b(como assim|nao entendi|nao compreendi|o que|como e|nao entedi|entendi nao|que isso)\b/i.test(cleanText) || 
                        (text.includes("?") && (cleanText.includes("como") || cleanText.includes("que") || cleanText.includes("assim")));

    // INTERCEPT DE CONFUSÃO/DÚVIDA PARA PERGUNTA DE CONTRIBUIÇÃO (AWAITING_CURRENT_CONTRIBUTION)
    const isContributionConfusion = (
      stateFsm === 'AWAITING_CURRENT_CONTRIBUTION' &&
      (
        isConfusion ||
        cleanText.includes("qual carteira") ||
        cleanText.includes("que carteira") ||
        cleanText.includes("nao entendi") ||
        cleanText.includes("nao compreendi") ||
        cleanText.includes("o que") ||
        cleanText.includes("como e") ||
        cleanText.includes("entendi nao")
      )
    );

    if (isContributionConfusion) {
      if (!user_data.reformulou_trabalho) {
        console.log(`[AWAITING_CURRENT_CONTRIBUTION] Interceptando dúvida/confusão. Reformulando com "Você ainda está trabalhando hoje em dia?".`);
        user_data.reformulou_trabalho = true;
        const reply = "Você ainda está trabalhando hoje em dia?";
        const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }];
        
        await this.supabase.rpc('save_session_data', {
          p_phone: phone,
          p_step: null,
          p_user_data_updates: {
            reformulou_trabalho: true,
            history: newHistory,
            state_fsm: 'AWAITING_CURRENT_CONTRIBUTION'
          }
        });
        return reply;
      }
    }

    if (stateFsm === 'AWAITING_LAWYER' && isConfusion) {
      console.log(`[AWAITING_LAWYER] Interceptando dúvida/confusão do lead: "${text}". Respondendo pergunta simplificada.`);
      user_data.has_lawyer = null;
      const reply = "Você já tem um advogado te ajudando?";
      const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }];
      
      await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: 'welcome',
        p_user_data_updates: { 
          has_lawyer: null,
          history: newHistory,
          state_fsm: 'AWAITING_LAWYER'
        }
      });
      return reply;
    }

    // GUARDA DETERMINÍSTICO: Pergunta embutida na resposta do cliente (ex: "porque?", "por que?", "pra que?")
    const hasEmbeddedQuestion = /\b(por\s*que|porque|pra\s*que|para\s*que|como\s*assim)\b.*\?|\?.*\b(por\s*que|porque|pra\s*que|como\s*assim)\b/i.test(text);

    if (hasEmbeddedQuestion && stateFsm !== 'AWAITING_LAWYER' && stateFsm !== 'AWAITING_CURRENT_CONTRIBUTION') {
      const esclarecimentosFixos: Record<string, string> = {
        'AWAITING_NAME': "É só pra eu poder te chamar certinho.",
        'AWAITING_AGE': "É pra gente confirmar se você já tem direito a certos processos.",
        'AWAITING_TOTAL_CONTRIBUTION': "É pra gente calcular certinho seu tempo de INSS.",
        'AWAITING_CURRENT_CONTRIBUTION': "É pra gente entender sua situação atual de trabalho.",
        'AWAITING_LAST_CONTRIBUTION_TIME': "É pra gente saber se ainda dá tempo de entrar com seu processo.",
        'AWAITING_DISEASE': "É pra gente ver se isso conta a seu favor no processo.",
        'AWAITING_DISABILITY': "É pra gente ver se isso conta a seu favor no processo.",
        'BPC_AWAITING_HOUSEHOLD': "É pra gente entender lares e famílias.",
        'BPC_AWAITING_HOUSEHOLD_INCOME': "É uma exigência pra esse tipo de processo.",
        'BPC_AWAITING_HOME_STATUS': "É pra gente completar seu cadastro certinho.",
        'BPC_AWAITING_CADUNICO': "É uma exigência pra esse tipo de processo.",
        'INSS_AWAITING_EMPLOYMENT_TYPE': "É pra gente entender seu histórico de trabalho.",
        'INSS_AWAITING_LAST_CONTRIBUTION': "É pra gente ver se ainda dá tempo de entrar com seu processo.",
        'INSS_AWAITING_REPORTS': "Isso ajuda muito a fortalecer seu processo.",
        'RETIREMENT_AWAITING_WORK_HISTORY': "É pra gente calcular certinho seu tempo de trabalho.",
        'RETIREMENT_AWAITING_SPECIAL_RURAL': "Isso pode aumentar seu tempo de contribuição.",
        'RETIREMENT_AWAITING_OTHER_PERIODS': "Isso pode contar a seu favor no cálculo."
      };
      const esclarecimento = esclarecimentosFixos[stateFsm] || "É só pra gente entender melhor seu caso.";
      user_data.esclarecimento_pendente = esclarecimento;
    }

    // GUARDA DETERMINÍSTICO 0: Se o estado calculado for FINISHED, encerra deterministamente sem chamar a IA
    if (stateFsm === 'FINISHED') {
      const finalReply = "Com base no que você me contou nossa equipe vai analisar melhor o seu caso. Assim que possível entraremos em contato novamente";
      const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: finalReply }];
      
      const updates = {
        history: newHistory,
        state_fsm: 'FINISHED',
        triagem_encerrada_msg_enviada: true
      };

      await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: 'finished',
        p_user_data_updates: updates
      });

      console.log(`[INSTRUMENTAÇÃO] [${new Date().toISOString()}] [Lead: ${phone}] 9. Resposta final enviada ao cliente (FSM FINISHED): "${finalReply}"`);
      return finalReply;
    }

    // GUARDA DETERMINÍSTICO 1: Força o Passo 2 sem chamar a IA apenas se o texto de fato se parecer com um nome próprio real
    const nomeDetectado = this.extrairNomePorCodigo(text);
    if (stateFsm === 'AWAITING_NAME' && nomeDetectado) {
        console.log(`🔒 SOFT-GUARD NOME: Nome próprio simples "${nomeDetectado}" detectado. Salvando e prosseguindo para IA.`);
        const nome = nomeDetectado;
        const newHistory = [...history, { role: 'user', content: text }];
        const updates = {
            history: newHistory,
            nome_usuario: nome,
            state_fsm: 'AWAITING_LAWYER'
        };
        
        await this.supabase.rpc('save_session_data', {
            p_phone: phone,
            p_step: null,
            p_user_data_updates: updates
        });
        
        // Atualiza variáveis locais para que a chamada da IA prossiga com os dados salvos
        user_data.history = newHistory;
        user_data.nome_usuario = nome;
        user_data.state_fsm = 'AWAITING_LAWYER';
    }

    // GUARDA DETERMINÍSTICO 4: OFF-TOPIC — resposta humana e calorosa sem chamar a IA
    const isOffTopic = user_data?.is_off_topic === true;
    const lastUserMsg = history.length > 0 ? history[history.length - 1] : null;
    const msgJaNoHistorico = lastUserMsg?.role === 'user' && lastUserMsg?.content === text;

    if (isOffTopic && !msgJaNoHistorico) {
      console.log(`🔒 SOFT-GUARD OFF-TOPIC: Detectada mensagem fora do assunto ou reclamação. Salvando histórico e acionando IA com flag de contexto.`);
      const newHistory = [...history, { role: 'user', content: text }];
      
      const updates = {
        history: newHistory,
        contexto_offtopic: true,
        is_off_topic: null
      };

      await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: null,
        p_user_data_updates: updates
      });

      // Atualiza variáveis locais para que a chamada do Gemini processe o histórico correto
      user_data.history = newHistory;
      user_data.contexto_offtopic = true;
      user_data.is_off_topic = null;
    }
    const knownData: string[] = [];
    const ignoreKeys = ['history', 'state_fsm', 'fluxo_ativo', 'score_total', 'status_final', 'db_created_at', 'db_updated_at', 'sofrimento_relatado', 'unconfirmed_fields'];
    for (const [key, val] of Object.entries(user_data || {})) {
      if (!ignoreKeys.includes(key) && val !== null && val !== undefined && val !== "") {
        knownData.push(`- ${key}: ${JSON.stringify(val)}`);
      }
    }

    const nonLaraNames = ["doutora", "dra", "senhora", "moça", "moca", "assistente", "atendente", "robô", "robo"];
    const calledWrongName = nonLaraNames.some(name => {
      if (name === 'dra') {
        return /\bdra\b/i.test(text.toLowerCase());
      }
      return text.toLowerCase().includes(name);
    });

    const alreadyCorrected = history.some((h: any) => h.role === 'assistant' && h.content.includes("Pode me chamar de Lara."));
    const ehPrimeiraMensagem = history.filter((h: any) => h.role === 'user').length <= 1;
    const clientCalledWrongName = calledWrongName && !alreadyCorrected && !ehPrimeiraMensagem;

    // Pega a pergunta crua correspondente ao estado atual
    let dryQuestion = "";
    if (resolved.fluxo_ativo === 'EXCECAO') {
      dryQuestion = EXCECAO_QUESTIONS[Math.floor(Math.random() * EXCECAO_QUESTIONS.length)];
    } else {
      let questionsList = STATE_QUESTIONS[stateFsm];
      if (stateFsm === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
        const moraSozinho = user_data.bpc_pessoas_casa && (
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('sozinh') ||
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro só') ||
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro so') ||
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('apenas eu') ||
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('somente eu') ||
          String(user_data.bpc_pessoas_casa).toLowerCase() === 'eu' ||
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('1 pessoa') ||
          String(user_data.bpc_pessoas_casa).toLowerCase().includes('uma pessoa')
        );
        if (moraSozinho) {
          questionsList = ["Você recebe algum dinheiro? Bolsa família, pensão, aposentadoria ou alguma outra renda?"];
        }
      }
      dryQuestion = questionsList ? questionsList[Math.floor(Math.random() * questionsList.length)] : "";
    }

    const familiar = user_data.beneficiario_terceiro;
    if (familiar) {
      const fem = ['filha', 'esposa', 'mãe', 'neta', 'irmã', 'avó', 'tia', 'sogra', 'sobrinha', 'nora', 'enteada', 'companheira'].includes(familiar.toLowerCase());
      const art = fem ? 'A sua' : 'O seu';
      const artLC = fem ? 'sua' : 'seu';
      const prep = fem ? 'da' : 'do';
      const pron = fem ? 'ela' : 'ele';
      const pronPoss = fem ? 'dela' : 'dele';

      if (stateFsm === 'AWAITING_LAWYER') {
        dryQuestion = `${art} ${familiar} já tem advogado cuidando do caso?`;
      } else if (stateFsm === 'AWAITING_AGE') {
        dryQuestion = `Qual a idade ${prep} ${artLC} ${familiar}?`;
      } else if (stateFsm === 'AWAITING_DISEASE') {
        dryQuestion = `${art} ${familiar} tem alguma doença atualmente?`;
      } else if (stateFsm === 'AWAITING_DISABILITY') {
        dryQuestion = `${art} ${familiar} tem alguma deficiência?`;
      } else if (stateFsm === 'AWAITING_TOTAL_CONTRIBUTION') {
        dryQuestion = `${art} ${familiar} já trabalhou de carteira assinada ou contribuiu para o INSS?`;
      } else if (stateFsm === 'AWAITING_CURRENT_CONTRIBUTION') {
        dryQuestion = `Como está a rotina de trabalho ${prep} ${artLC} ${familiar} hoje em dia? ${pron.toUpperCase()} está conseguindo trabalhar?`;
      } else if (stateFsm === 'AWAITING_LAST_CONTRIBUTION_TIME') {
        dryQuestion = `Tem quanto tempo que ${art.toLowerCase()} ${familiar} se afastou ou parou de trabalhar?`;
      } else if (stateFsm === 'INSS_AWAITING_EMPLOYMENT_TYPE') {
        dryQuestion = `Como ${art.toLowerCase()} ${familiar} contribuía para o INSS? Era por carteira assinada, carnê ou MEI?`;
      } else if (stateFsm === 'INSS_AWAITING_LAST_CONTRIBUTION') {
        dryQuestion = `Tem quanto tempo que ${art.toLowerCase()} ${familiar} se afastou? Foi em que ano?`;
      } else if (stateFsm === 'INSS_AWAITING_REPORTS') {
        dryQuestion = `${art} ${familiar} possui exames, receitas ou laudos médicos recentes?`;
      } else if (stateFsm === 'BPC_AWAITING_HOUSEHOLD') {
        dryQuestion = `Quem mora com ${art.toLowerCase()} ${familiar} na casa ${pronPoss} hoje?`;
      } else if (stateFsm === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
        dryQuestion = `Das pessoas que moram com ${art.toLowerCase()} ${familiar}, alguém trabalha ou recebe algum dinheiro?`;
      } else if (stateFsm === 'BPC_AWAITING_HOME_STATUS') {
        dryQuestion = `A casa ${prep} ${artLC} ${familiar} é própria, alugada ou cedida?`;
      } else if (stateFsm === 'BPC_AWAITING_CADUNICO') {
        dryQuestion = `${art} ${familiar} possui CadÚnico atualizado?`;
      }
    }

    let contextStr = "Tom seco, direto e curto nas etapas cadastrais, mas acolhedor no desabafo/luto.";
    if (stateFsm === 'AWAITING_NAME') {
      contextStr = "Contexto: Início de contato, pergunte o nome de forma simples.";
    } else if (stateFsm === 'AWAITING_LAWYER') {
      contextStr = "Contexto: Cliente com possível BPC ou benefício, investigando se já tem advogado, tom ético e direto.";
    } else if (stateFsm === 'AWAITING_AGE') {
      contextStr = "Contexto: Perguntando a idade de forma super direta.";
    } else if (stateFsm === 'BPC_AWAITING_HOUSEHOLD_INCOME') {
      contextStr = "Contexto: Cliente idoso ou deficiente de baixa renda, perguntando se recebe algum dinheiro (bolsa família, aposentadoria, pensão) de forma acolhedora, sem romantizar, sem enrolar.";
    } else if (stateFsm === 'BPC_AWAITING_HOME_STATUS') {
      contextStr = "Contexto: Perguntando a situação da moradia (casa própria, alugada ou cedida) de forma simples.";
    } else if (stateFsm === 'BPC_AWAITING_CADUNICO') {
      contextStr = "Contexto: Perguntando se tem Cadastro Único (CadÚnico).";
    }

    const confirmParts: string[] = [];
    let nameVal = user_data.nome_usuario || "";

    // Lógica profissional baseada em histórico de conversas:
    // Só confirmamos os dados se eles foram fornecidos espontaneamente (upfront) antes de a Lara perguntar por eles.
    const hasAskedAge = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('idade') || h.content.toLowerCase().includes('quantos anos')));
    const hasAskedContrib = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('contribuiu') || h.content.toLowerCase().includes('tempo de contribuição') || h.content.toLowerCase().includes('tempo você já contribuiu') || h.content.toLowerCase().includes('tempo de carteira')));
    const hasAskedHousehold = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('quem mora') || h.content.toLowerCase().includes('mora com você')));
    const hasAskedDisease = history.some((h: any) => h.role === 'assistant' && h.content.toLowerCase().includes('doença'));
    const hasAskedDisability = history.some((h: any) => h.role === 'assistant' && h.content.toLowerCase().includes('deficiência'));
    
    // Verificamos se já confirmamos esses dados anteriormente no histórico
    const hasConfirmedAge = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('entendido') || h.content.toLowerCase().includes('certo') || h.content.toLowerCase().includes('ok') || h.content.toLowerCase().includes('anotado')) && h.content.toLowerCase().includes('anos'));
    const hasConfirmedContrib = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('entendido') || h.content.toLowerCase().includes('certo') || h.content.toLowerCase().includes('ok') || h.content.toLowerCase().includes('anotado')) && (h.content.toLowerCase().includes('contribuição') || h.content.toLowerCase().includes('contribuiu')));
    const hasConfirmedHousehold = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('entendido') || h.content.toLowerCase().includes('certo') || h.content.toLowerCase().includes('ok') || h.content.toLowerCase().includes('anotado')) && (h.content.toLowerCase().includes('sozinha') || h.content.toLowerCase().includes('sozinho') || h.content.toLowerCase().includes('mora com') || h.content.toLowerCase().includes('morando só')));
    const hasConfirmedDisease = user_data.doenca && history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('entendido') || h.content.toLowerCase().includes('certo') || h.content.toLowerCase().includes('ok') || h.content.toLowerCase().includes('anotado')) && h.content.toLowerCase().includes(user_data.doenca.toLowerCase()));
    const hasConfirmedDisability = history.some((h: any) => h.role === 'assistant' && (h.content.toLowerCase().includes('entendido') || h.content.toLowerCase().includes('certo') || h.content.toLowerCase().includes('ok') || h.content.toLowerCase().includes('anotado')) && h.content.toLowerCase().includes('deficiência'));

    const shouldConfirmAge = user_data.idade && !hasAskedAge && !hasConfirmedAge;
    
    // Contribuição (Tempo de afastamento não exige confirmação)
    const rawContrib = user_data.inss_tempo_carteira || user_data.tempo_contribuicao;
    const shouldConfirmContrib = rawContrib && !hasAskedContrib && !hasConfirmedContrib;
    
    // Moradia/Household
    const shouldConfirmHousehold = false; // Desativado para avançar direto sem confirmação
    
    // Doença
    const shouldConfirmDisease = user_data.doenca && user_data.doenca.toLowerCase() !== 'não' && !hasAskedDisease && !hasConfirmedDisease;
    
    // Deficiência
    const shouldConfirmDisability = user_data.tem_deficiencia && !hasAskedDisability && !hasConfirmedDisability;

    if (shouldConfirmAge) {
      const idadeLimpa = String(user_data.idade).replace(/\s*anos?/i, "").trim();
      confirmParts.push(`tem ${idadeLimpa} anos`);
    }
    if (shouldConfirmContrib) {
      const contribLimpa = String(rawContrib).toLowerCase();
      if (contribLimpa.includes('nunca') || contribLimpa.includes('nenhum') || contribLimpa.includes('nao contribui')) {
        confirmParts.push("nunca contribuiu");
      } else {
        const anosLimpos = contribLimpa.replace(/\s*anos?/i, "").trim();
        confirmParts.push(`tem ${anosLimpos} de contribuição`);
      }
    }
    if (shouldConfirmHousehold) {
      const moraSozinho = String(user_data.bpc_pessoas_casa).toLowerCase().includes('sozinh') ||
                          String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro só') ||
                          String(user_data.bpc_pessoas_casa).toLowerCase().includes('moro so') ||
                          String(user_data.bpc_pessoas_casa).toLowerCase().includes('apenas eu') ||
                          String(user_data.bpc_pessoas_casa).toLowerCase().includes('somente eu') ||
                          String(user_data.bpc_pessoas_casa).toLowerCase() === 'eu';
      if (moraSozinho) {
        confirmParts.push("mora sozinha");
      } else {
        confirmParts.push(`mora com ${user_data.bpc_pessoas_casa}`);
      }
    }
    if (shouldConfirmDisease) {
      confirmParts.push(`tem ${user_data.doenca}`);
    }
    if (shouldConfirmDisability) {
      confirmParts.push("tem deficiência");
    }

    let confirmPrefixToPrepend = "";
    // LÓGICA DE CONFIRMAÇÃO DE DADOS UPFRONT DESATIVADA TOTALMENTE (evita comportamento de papagaio)
    /*
    if (confirmParts.length > 0) {
      const nameStr = nameVal ? `, ${nameVal},` : "";
      const variations = ['Certo', 'Ok', 'Anotado'];
      const prefixWord = variations[Math.floor(Math.random() * variations.length)];
      
      let confirmStr = "";
      if (confirmParts.length === 1) {
        confirmStr = confirmParts[0];
      } else if (confirmParts.length === 2) {
        confirmStr = confirmParts.join(" e ");
      } else {
        confirmStr = confirmParts.slice(0, -1).join(", ") + " e " + confirmParts[confirmParts.length - 1];
      }

      if (familiar) {
        confirmPrefixToPrepend = `${prefixWord}. Seu ${familiar} ${confirmStr}. `;
      } else {
        confirmPrefixToPrepend = `${prefixWord}. Você ${confirmStr}. `;
      }
    }
    */

    if (stateFsm === 'AWAITING_DISABILITY') {
      const selectedQuestion = familiar 
        ? `O seu ${familiar} tem alguma deficiência física, visual, auditiva ou motora?`
        : "Você tem alguma deficiência física, visual, auditiva ou motora?";
      if (confirmPrefixToPrepend) {
        return `${confirmPrefixToPrepend}${selectedQuestion}`;
      }
      return selectedQuestion;
    }

    const promptSofia = `Você é Lara, atendente humana do escritório de advocacia previdenciária da Dra. Mônica Lucioli.
Você realiza a triagem de clientes via WhatsApp. Seu tom de voz deve ser 100% IDÊNTICO ao estilo real do escritório: extremamente direto, seco, prático, objetivo e muito curto nas perguntas de cadastro, mas demonstrando sentimentos humanos reais e calorosos quando o cliente relata dor, doença grave ou luto (especialmente viúvas/viúvos).

DIRETRIZES DE COMUNICAÇÃO E REGRAS DE NEGÓCIO (OBRIGATÓRIO):
1. SEM EMOJIS: É terminantemente proibido usar emojis ou carinhas de texto (como 😊, 👍, 😭, etc.) nas suas respostas. Use apenas texto limpo.
2. MENSAGENS EXTREMAMENTE CURTAS: Escreva respostas muito curtas (máximo 1 ou 2 linhas). Vá direto à pergunta sem enrolação desnecessária.
3. PROIBIDO NOMES DE BENEFÍCIOS E APOSENTADORIA: Nunca diga siglas ou termos como BPC, LOAS, benefício de prestação continuada, aposentadoria por invalidez/idade/tempo, auxílio-doença, etc. Use termos totalmente genéricos como "seu caso", "sua situação", "seu processo" ou "podemos te ajudar por aqui".
4. PRIMEIRA INTERAÇÃO (ABERTURA): Se o histórico de mensagens estiver vazio (primeira mensagem do cliente), você deve dar as boas-vindas de forma humana, direta e profissional. Siga exatamente ou no mesmo estilo de (lembrando da regra de NÃO usar emojis): "Boa tarde! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. Com quem eu falo?" (ou adapte a saudação dependendo do horário do dia).
5. ACOLHIMENTO E EMPATIA REAL (CRÍTICO):
   Se o cliente relatar ou se você estiver confirmando que o cliente ou um familiar tem uma doença grave, deficiência, dor, ou teve um benefício cortado (seja na primeira mensagem ou no meio da triagem), você deve obrigatoriamente iniciar sua resposta com uma frase curta, direta e acolhedora de empatia humana real antes de avançar para a próxima pergunta.
   Exemplos de acolhimento real (não corporativo):
   - "Que situação difícil, sinto muito."
   - "Poxa, isso é muito pesado."
   - "Sinto muito que seu filho esteja passando por isso." (se for familiar)
   - "Sinto muito que você esteja passando por essa dor."
   ATENÇÃO: Nunca use jargões de robô como "compreendo sua situação", "entendo sua dor" ou frases corporativas complexas. Seja curto, direto e humano (máximo 1 frase de acolhimento).
6. RESPOSTA A RESPOSTAS INVÁLIDAS OU MENSAGENS INCOMUNS: Se o cliente enviar brincadeiras, zoeiras ou comentários incomuns (como sobre a voz do bot, assuntos paralelos ou política), ignore a brincadeira, não reaja com humor (proibido usar "kkkk", "rsrs" ou gírias como "Eita") e direcione o cliente de forma profissional para a triagem.
7. NUNCA REPETIR O NOME DO CLIENTE: Não repita o nome do cliente nas mensagens da triagem.
8. NÃO SEJA INSISTENTE COM O NOME: Se você já perguntou o nome do cliente e ele não informou na mensagem seguinte, NÃO repita a pergunta do nome. Avance para a triagem diretamente.
9. PROIBIDO CONTRA-POR TRABALHO E BENEFÍCIO: Nunca confronte o cliente sobre ele estar trabalhando vs recebendo benefício. Se precisar saber se trabalha atualmente, pergunte apenas: "Como está sua rotina de trabalho hoje em dia, você está conseguindo trabalhar?".
10. PROIBIDO AJUDA INFORMAL EXTERNA (AMIGOS/VIZINHOS/DOAÇÕES): É terminantemente proibido perguntar se o cliente recebe ajuda informal, doações, cesta básica ou auxílios informais de amigos, vizinhos ou parentes de fora. Essa pergunta NÃO faz parte do fluxo do BPC. ATENÇÃO: Esta proibição se refere apenas a auxílios informais externos. É OBRIGATÓRIO e legítimo perguntar sobre a renda formal ou trabalho dos moradores que residem na mesma casa (salário, aposentadoria, pensão, benefício) quando estiver no estado BPC_AWAITING_HOUSEHOLD_INCOME.
11. DESVIOS DE ASSUNTO E OFF-TOPIC: Caso o usuário mude de assunto, faça reclamações sobre o governo ou INSS, faça perguntas pessoais (como "qual seu nome?", "quem é você?") ou diga coisas fora da triagem, dê uma resposta extremamente curta de empatia ou esclarecimento (1 única frase curta, variando os termos para nunca parecer repetitiva, ex: "Entendo a sua preocupação", "Te compreendo", etc.) e em seguida retorne para a pergunta base abaixo.
12. SIMPLIFICAÇÃO DA PERGUNTA DE ADVOGADO: Se a pergunta base for sobre advogado, reescreva-a SEMPRE usando linguagem extremamente simples e acessível para idosos, como 'Você já tem advogado cuidando do seu caso?' ou 'Já tem advogado te ajudando?'. É TERMINANTEMENTE PROIBIDO usar termos complexos como 'representando você nesse processo' ou 'representação legal'.
13. RECONHECIMENTO CONTEXTUAL OBRIGATÓRIO (CRÍTICO): Antes de fazer a pergunta seguinte, você DEVE sempre demonstrar que entendeu e prestou atenção na última mensagem do cliente — mesmo que seja curta, uma dúvida, um comentário ou apenas uma resposta direta. É TERMINANTEMENTE PROIBIDO ignorar o que o cliente disse e simplesmente emendar a próxima pergunta de forma seca e desconectada, como se fosse um robô que não leu a mensagem anterior. Se a última mensagem do cliente contiver uma pergunta, dúvida ou comentário (de qualquer forma que seja escrito), responda em 1 frase curta e humana reconhecendo isso ANTES de fazer a próxima pergunta. Se for apenas uma resposta direta sem nada embutido, ainda assim é permitido reconhecer brevemente antes de seguir, mas sem se alongar.


DIRETRIZ CRÍTICA DE HUMANIZAÇÃO COM CONTEXTO:
Sua tarefa é reescrever a pergunta base indicada abaixo de forma humana, natural, acolhedora e direta, seguindo a diretriz de contexto.
Não invente informações que não estão na pergunta base.
Não mude o sentido da pergunta base.
Não faça nenhuma outra pergunta.
Máximo 2 frases.

Pergunta Base para reescrever:
"${dryQuestion}"

Diretriz de Contexto:
"${contextStr}"

Histórico da conversa:
${JSON.stringify(history.map((h: any) => ({ role: h.role, content: h.content })))}

Última mensagem do cliente:
"${text}"

Gere a resposta da Lara (retorne APENAS o texto reescrito da pergunta base, sem mais nada):`;

    console.log(`🧠 Chamando inteligência artificial (Lara Conversacional) para gerar resposta...`);
    let finalReply = await this.generateTextWithFallback(promptSofia);
    if (!finalReply || finalReply.trim() === '') {
      finalReply = dryQuestion;
    }
    finalReply = finalReply.trim();

    if (user_data.esclarecimento_pendente) {
      finalReply = `${user_data.esclarecimento_pendente} ${finalReply}`;
      delete user_data.esclarecimento_pendente;
    }

    if (confirmPrefixToPrepend && !finalReply.includes(confirmPrefixToPrepend.trim())) {
      finalReply = `${confirmPrefixToPrepend}${finalReply}`;
    }

    // Guard de Segurança Contra Interrogação Fiscal (Evitar bloqueios)
    const hasForbiddenFiscalInterrogation = (reply: string): boolean => {
      const clean = reply.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalized = clean.replace(/\s+/g, ' ');
      
      const forbiddenPatterns = [
        /depende.*beneficio/i,
        /trabalha.*depende/i,
        /trabalha.*beneficio/i,
        /depende.*so.*beneficio/i,
        /viver.*beneficio/i,
        /so.*depende/i,
        /so.*do.*beneficio/i,
        /trabalha.*ou.*so/i
      ];

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(normalized)) {
          return true;
        }
      }
      return false;
    };

    if (hasForbiddenFiscalInterrogation(finalReply)) {
      console.warn(`🚨 ALERTA DE SEGURANÇA: Resposta gerada contém interrogação fiscal proibida: "${finalReply}". Re-gerando...`);
      const promptSofiaCorrection = `${promptSofia}\n\n⚠️ AVISO DE CORREÇÃO IMPORTANTE: A resposta gerada anteriormente continha a frase proibida ou um tom de auditoria/fiscalização contrapondo trabalho e benefício (ex: 'depende do benefício'). Reescreva a mensagem AGORA com foco exclusivo em acolhimento e empatia, sem fazer menção alguma a depender de benefício. Se precisar perguntar se a pessoa trabalha atualmente, use a forma suave: "Como está sua rotina de trabalho hoje em dia?". Não use a palavra "depende" ou "benefício" na pergunta.`;
      try {
        const correctedReply = await this.generateTextWithFallback(promptSofiaCorrection);
        if (correctedReply && correctedReply.trim() !== '' && !hasForbiddenFiscalInterrogation(correctedReply)) {
          finalReply = correctedReply.trim();
          console.log(`✅ Resposta corrigida e aprovada: "${finalReply}"`);
        } else {
          console.warn(`⚠️ Correção falhou ou ainda continha termos proibidos. Aplicando fallback de segurança.`);
          if (stateFsm === 'AWAITING_CURRENT_CONTRIBUTION') {
            finalReply = "Fique tranquilo, o escritório está aqui para proteger seu direito. Pra eu entender melhor, você está trabalhando atualmente?";
          } else {
            finalReply = "Fique tranquilo, estamos aqui para te ajudar a ver tudo isso com calma. Você está trabalhando atualmente?";
          }
        }
      } catch (err) {
        console.error(`❌ Erro ao tentar re-gerar resposta. Usando fallback de segurança.`, err);
        finalReply = "Fique tranquilo, estamos aqui para te ajudar a ver tudo isso com calma. Como está sua rotina hoje em dia, você está conseguindo trabalhar?";
      }
    }

    // Guard de Segurança Contra Pedidos de Documentos (PROIBIÇÃO ABSOLUTA)
    const hasForbiddenDocumentRequest = (reply: string): boolean => {
      const clean = reply.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const forbiddenDocPatterns = [
        /me (envia|manda|envie|mande)/i,
        /pode (me )?(enviar|mandar|tirar|foto)/i,
        /tira (uma )?foto/i,
        /manda (a |uma )?foto/i,
        /envie (o |um |uma )?/i,
        /para (eu |a gente )?analis/i,
        /preciso ver/i,
        /quero ver/i,
        /pode enviar/i,
        /aqui pelo whatsapp/i,
        /pelo whatsapp mesmo/i,
        /mande (o |os |um |uma )?/i,
        /encaminhe/i,
        /documentos para/i,
        /receitas para/i,
        /laudos para/i,
      ];
      for (const pattern of forbiddenDocPatterns) {
        if (pattern.test(clean)) return true;
      }
      return false;
    };

    if (hasForbiddenDocumentRequest(finalReply)) {
      console.warn(`🚨 ALERTA: Resposta contém pedido de documento proibido: "${finalReply}". Substituindo por encerramento.`);
      finalReply = `Perfeito. Vou encaminhar suas informações para a equipe. Em breve entrarão em contato com você.`;
    }

    // Enforça a correção de nome determinística caso o cliente tenha chamado por outro nome
    if (clientCalledWrongName) {
      console.log(`🔒 ENFORCING DETERMINISTIC NAME CORRECTION: Prepended 'Pode me chamar de Lara. ' to reply.`);
      if (!finalReply.includes("Pode me chamar de Lara")) {
        finalReply = `Pode me chamar de Lara. ${finalReply}`;
      }
    }

    // Enforça a saudação de abertura caso o cliente tenha mandado o nome de primeira (upfront)
    const isUpfrontFirstReply = history.length === 2 && 
                                 history[0].role === 'assistant' && 
                                 history[0].content.includes("Com quem eu falo?") &&
                                 history[1].role === 'user';
    if (isUpfrontFirstReply) {
      const hour = parseInt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
      let saudacao = "Boa noite";
      if (hour >= 6 && hour < 12) saudacao = "Bom dia";
      else if (hour >= 12 && hour < 18) saudacao = "Boa tarde";
      
      const greetingPrefix = `${saudacao}! Tudo bem?\nMe chamo Lara, sou atendente do escritório da Dra. Mônica Lucioli. `;
      if (!finalReply.includes("Me chamo Lara")) {
        finalReply = `${greetingPrefix}${finalReply}`;
      }
    }

    // Interceptação determinística por código: Injeta empatia imediata se o cliente relatou sofrimento, corte de benefício ou doença
    const textClean = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const temCorteOuProblema = textClean.includes("cort") || 
                               textClean.includes("perde") || 
                               textClean.includes("parou") || 
                               textClean.includes("cance") || 
                               textClean.includes("suspen") || 
                               (user_data.doenca && user_data.doenca.toLowerCase() !== 'não') ||
                               user_data.tem_deficiencia === true;

    const temDesesperoFinanceiro = textClean.includes("sobreviver") || 
                                  textClean.includes("desesper") || 
                                  textClean.includes("dificuldade") || 
                                  textClean.includes("passando fome") || 
                                  textClean.includes("necessidade") ||
                                  (user_data.sofrimento_relatado && user_data.sofrimento_relatado !== "");

    const sofrimentoAtualParaComparacao = user_data.sofrimento_relatado || user_data.doenca || '';
    const ultimoComEmpatia = user_data.ultimo_sofrimento_com_empatia === undefined ? undefined : (user_data.ultimo_sofrimento_com_empatia || "");

    if ((temCorteOuProblema || temDesesperoFinanceiro) && (ultimoComEmpatia === undefined || sofrimentoAtualParaComparacao !== ultimoComEmpatia)) {
      const familiar = user_data.beneficiario_terceiro;
      let empatia = "Sinto muito que esteja passando por isso.";
      
      if (temDesesperoFinanceiro) {
        empatia = "Sinto muito por toda essa dificuldade.";
      } else if (familiar) {
        empatia = `Que situação difícil, sinto muito pelo seu ${familiar}.`;
      }

      const cleanReply = finalReply.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!cleanReply.includes("sinto muito") && !cleanReply.includes("situacao dificil") && !cleanReply.includes("pesado") && !cleanReply.includes("dificuldade")) {
        // Se a resposta contiver saudações ou "Pode me chamar de Lara.", insere após isso.
        if (finalReply.includes("Pode me chamar de Lara.")) {
          finalReply = finalReply.replace("Pode me chamar de Lara.", `Pode me chamar de Lara. ${empatia}`);
        } else if (finalReply.includes("Dra. Mônica Lucioli. ")) {
          finalReply = finalReply.replace("Dra. Mônica Lucioli. ", `Dra. Mônica Lucioli. ${empatia} `);
        } else {
          finalReply = `${empatia} ${finalReply}`;
        }
      }
      user_data.ultimo_sofrimento_com_empatia = sofrimentoAtualParaComparacao;
    }

    // Injeção de saudação calorosa ao transitar para a pergunta de advogado
    if (stateFsm === 'AWAITING_LAWYER') {
      const hasAskedLawyer = history.some((h: any) => h.role === 'assistant' && h.content.toLowerCase().includes('advogado'));
      if (!hasAskedLawyer && user_data.nome_usuario) {
        const hour = parseInt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
        let saudacao = "Boa noite";
        if (hour >= 6 && hour < 12) saudacao = "Bom dia";
        else if (hour >= 12 && hour < 18) saudacao = "Boa tarde";
        
        if (finalReply.includes("Me chamo Lara")) {
          // Se for a apresentação de boas-vindas, personaliza a saudação existente em vez de duplicar
          finalReply = finalReply.replace(`${saudacao}! Tudo bem?`, `${saudacao}, ${user_data.nome_usuario}! Tudo bem?`);
        } else {
          // Caso contrário, prepende o greeting normal
          // SE JÁ HOUVE INTERAÇÃO ANTERIOR (histórico longo), não repetimos o "Boa noite/Bom dia"
          const hasPreviousGreetings = history.length > 2;
          let greeting = "";
          if (hasPreviousGreetings) {
            greeting = `Prazer, ${user_data.nome_usuario}!`;
          } else {
            greeting = `Olá, ${user_data.nome_usuario}! ${saudacao}.`;
            const textCleanLower = text.toLowerCase();
            if (textCleanLower.includes("tudo bem") || textCleanLower.includes("tudo bom")) {
              greeting = `Tudo bem por aqui, ${user_data.nome_usuario}! ${saudacao}.`;
            }
          }
          if (!finalReply.includes(user_data.nome_usuario)) {
            finalReply = `${greeting} ${finalReply}`;
          }
        }
      }
    }


    // Limpar sofrimento_relatado e contexto_offtopic após usá-los uma vez (para não repetir nos próximos turnos!)

    if (user_data.sofrimento_relatado) {
      delete user_data.sofrimento_relatado;
    }
    if (user_data.contexto_offtopic) {
      delete user_data.contexto_offtopic;
    }

    // Calcular pontuação de lead baseada na fórmula unificada (escala 0-100)
    let scoreValue = 0;
    
    // Helper parsers for early detection
    const parseAgeLocal = (v: any) => {
      if (!v) return 0;
      const match = String(v).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    const parseContribLocal = (v: any) => {
      if (!v) return 0;
      const match = String(v).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const ageNumForDetect = parseAgeLocal(user_data?.idade);
    const contribYearsForDetect = parseContribLocal(
      user_data?.inss_tempo_carteira ||
      user_data?.tempo_contribuicao
    );
    const hasDiseaseForDetect = user_data?.tem_doenca_ou_limitacao === true;

    const hasAposeText = history.some((h: any) => 
      String(h.content || "").toLowerCase().includes("aposentar") || 
      String(h.content || "").toLowerCase().includes("aposentadoria")
    ) || text.toLowerCase().includes("aposentar") || text.toLowerCase().includes("aposentadoria");

    const isAposentadoria = (
      user_data?.fluxo_ativo === 'APOSENTADORIA' ||
      (
        user_data?.fluxo_ativo !== 'BPC_IDOSO' &&
        user_data?.fluxo_ativo !== 'BPC_DEFICIENTE' &&
        user_data?.ja_contribuiu !== false &&
        ((ageNumForDetect >= 55 || contribYearsForDetect >= 15) || hasAposeText) &&
        !hasDiseaseForDetect
      )
    );
    
    if (isAposentadoria) {
      // 1. Tempo de Contribuição relevante
      const parseContrib = (v: any) => {
        if (!v) return 0;
        const match = String(v).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      const contribYears = parseContrib(
        user_data?.inss_tempo_carteira ||
        user_data?.tempo_contribuicao
      );
      if (contribYears >= 28) {
        scoreValue += 40;
      } else if (contribYears >= 15 && contribYears <= 27) {
        scoreValue += 25;
      }

      // 2. Idade
      const parseAge = (v: any) => {
        if (!v) return 0;
        const match = String(v).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      const ageNum = parseAge(user_data?.idade);
      if (ageNum >= 60) {
        scoreValue += 20;
      } else if (ageNum >= 55 && ageNum <= 59) {
        scoreValue += 15;
      }

      // 3. Sem advogado
      const hasLawyer = user_data?.has_lawyer === true;
      if (!hasLawyer) {
        scoreValue += 15;
      }

      // 4. Carteira assinada
      const workHistory = String(
        user_data?.retirement_work_history ||
        user_data?.inss_como_contribuiu ||
        ""
      ).toLowerCase();
      if (workHistory.includes('carteira') || workHistory.includes('assinado') || workHistory.includes('registro')) {
        scoreValue += 10;
      }

      // 5. Trabalho especial ou rural
      const specialRural = String(
        user_data?.retirement_special_rural ||
        ""
      ).toLowerCase();
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
      const hasDocs = user_data?.tem_docs_em_maos === true;
      if (hasDocs) {
        scoreValue += 10;
      }
    } else {
      // 1. Idade >= 65 anos: +40 pts
      const parseAge = (v: any) => {
        if (!v) return 0;
        const match = String(v).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      const ageNum = parseAge(user_data?.idade);
      if (ageNum >= 65) scoreValue += 40;

      // 2. Nunca contribuiu: +20 pts
      const neverContrib = user_data?.ja_contribuiu === false ||
                           String(user_data?.inss_tempo_carteira).toLowerCase() === 'nenhum' ||
                           String(user_data?.tempo_parou_contribuir).toLowerCase() === 'nunca' ||
                           String(user_data?.inss_ultima_contribuicao).toLowerCase().includes('não contribuiu');
      if (neverContrib) scoreValue += 20;

      // 3. Renda per capita baixa: +20 pts
      const rendaVal = String(user_data?.bpc_quem_renda || "").toLowerCase();
      const isLowIncome = user_data?.has_no_income === true || 
                          user_data?.sem_renda === true ||
                          rendaVal.includes("nenhum") || 
                          rendaVal.includes("ninguem") || 
                          rendaVal.includes("sem renda") || 
                          rendaVal.includes("não tem") ||
                          rendaVal.includes("não possui") ||
                          (rendaVal.match(/\d+/) && parseInt((rendaVal.match(/\d+/) || ["0"])[0]) <= 706);
      if (isLowIncome) scoreValue += 20;

      // 4. Mora sozinho/família baixa renda: +10 pts
      const moraSozinhoOuBaixaRenda = String(user_data?.bpc_pessoas_casa).toLowerCase().includes("sozinh") ||
                                      user_data?.bpc_pessoas_casa === 1 ||
                                      user_data?.bpc_pessoas_casa === '1' ||
                                      isLowIncome;
      if (moraSozinhoOuBaixaRenda) scoreValue += 10;

      // 5. CadÚnico ativo: +10 pts
      const cadUnicoAtivo = user_data?.bpc_cad_unico === true || user_data?.has_cad_unico === true;
      if (cadUnicoAtivo) scoreValue += 10;

      // 6. Doença ou limitação grave: +15 pts
      if (user_data?.tem_doenca_ou_limitacao === true) scoreValue += 15;

      // 7. Deficiência: +20 pts
      if (user_data?.tem_deficiencia === true) scoreValue += 20;

      // 8. Acamado ou dependente: +25 pts
      if (user_data?.is_bedridden === true) scoreValue += 25;
    }

    let score_percent = Math.min(100, scoreValue);
    if (user_data?.has_lawyer === true) {
      score_percent = 0;
      user_data.status_final = 'com_advogado';
    }

    // Re-calcular FSM deterministicamente
    const nextStateResolved = this.resolveFSMState(user_data);
    let finalState = nextStateResolved.state;
    const finalFluxo = nextStateResolved.fluxo_ativo;

    const isClosingReply = /(entrar[aã]o?\s+em\s+contato|encaminhar\s+(suas\s+informações|seu\s+caso)|nossa\s+equipe\s+pode\s+te\s+ajudar)/i.test(finalReply);
    if (isClosingReply) {
      console.log(`[FSM FORCE FINISHED] Forçando estado FSM para FINISHED pois a resposta da IA é de encerramento.`);
      finalState = 'FINISHED';
    }

    const timestamp = new Date().toISOString();
    console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 5. Estado calculado pela FSM: state="${finalState}", fluxo="${finalFluxo || 'N/A'}"`);

    const newHistory = [
      ...history,
      { role: 'user', content: text },
      { role: 'assistant', content: finalReply }
    ];

    try {
      const updates: any = {
        history: newHistory,
        state_fsm: finalState,
        fluxo_ativo: finalFluxo,
        score_total: score_percent
      };

      if (user_data.sofrimento_relatado === undefined || user_data.sofrimento_relatado === null) {
        updates.sofrimento_relatado = null;
      }

      if (user_data.ultimo_sofrimento_com_empatia !== undefined) {
        updates.ultimo_sofrimento_com_empatia = user_data.ultimo_sofrimento_com_empatia;
      }

      if (finalState === 'FINISHED') {
        updates.triagem_encerrada_msg_enviada = true;
      }

      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 6. Payload enviado ao Supabase (fim-AI): step="${this.mapFsmToStep(finalState)}", updates=${JSON.stringify(updates)}`);

      const { data: newMergedData, error } = await this.supabase.rpc('save_session_data', {
        p_phone: phone,
        p_step: this.mapFsmToStep(finalState),
        p_user_data_updates: updates
      });

      if (error) {
        console.error(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Falha na persistência (fim-AI): ${JSON.stringify(error)}`);
        console.error('=== ERRO CRÍTICO NO BANCO ===');
        console.error(error);
      } else {
        console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 7. Confirmação de persistência bem-sucedida (fim-AI). Data retornado: ${JSON.stringify(newMergedData)}`);
        if (newMergedData) {
          session.user_data = newMergedData;
        }
      }

      const { data: reReadSession } = await this.supabase.from('sofia_sessions').select('*').eq('phone', phone).single();
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 8. Estado relido após save (fim-AI): FSM="${reReadSession?.user_data?.state_fsm}", step="${reReadSession?.step}", user_data=${JSON.stringify(reReadSession?.user_data)}`);

      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente: "${finalReply}"`);
      return finalReply;
    } catch (dbError: any) {
      console.error('❌ ERRO AO SALVAR DADOS NO BANCO:', dbError.message);
      console.log(`[INSTRUMENTAÇÃO] [${timestamp}] [Lead: ${phone}] 9. Resposta final enviada ao cliente (erro banco): "${finalReply}"`);
      return finalReply;
    }
  }

  private async generateTextWithFallback(prompt: string) {
    try {
      console.log(`🤖 Solicitando texto com o modelo gpt-4o-mini (OpenAI)...`);
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const text = completion.choices[0]?.message?.content;
      if (text) {
        console.log(`✅ Resposta gerada com sucesso pelo modelo gpt-4o-mini!`);
        return text;
      }
      throw new Error("Resposta vazia da OpenAI.");
    } catch (openaiErr: any) {
      console.error(`❌ Erro no OpenAI (gpt-4o-mini): ${openaiErr.message}`);
      throw openaiErr;
    }
  }

  private async updateInternalState(phone: string, currentStep: string, userInput: string, aiReply: string) {
    // Aqui implementamos a lógica de transição de passos baseada na conversa
    // Por simplicidade agora, apenas atualizamos a última interação
    await this.supabase.from('sofia_sessions').update({
      last_interaction: new Date().toISOString()
    }).eq('phone', phone);
  }

  private async startSession(phone: string) {
    const hour = parseInt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
    let saudacao = "Boa noite";
    if (hour >= 6 && hour < 12) saudacao = "Bom dia";
    else if (hour >= 12 && hour < 18) saudacao = "Boa tarde";
    
    const apresentacao = `${saudacao}! Tudo bem? Eu sou a Lara, do escritório da Dra. Mônica. Me fale seu nome por favor.`;
    
    await this.supabase.from('sofia_sessions').insert([{ 
        phone, 
        user_data: { history: [{ role: 'assistant', content: apresentacao }] }
    }]);
    
    return apresentacao;
  }

  /**
   * Calcula de forma 100% determinística o próximo estado da FSM
   * com base nas informações atualmente gravadas na memória da sessão.
   */
  resolveFSMState(userData: any): { state: string, fluxo_ativo?: string } {
    if (!userData) return { state: 'AWAITING_NAME' };

    // --- AUTO-INFERÊNCIAS ---
    let ageNum = this.parseNumber(userData.idade);

    // Auto-inferência para criança beneficiária (idade < 16)
    const isChildBeneficiary = userData.beneficiario_terceiro && ageNum > 0 && ageNum < 16;
    if (isChildBeneficiary) {
      userData.ja_contribuiu = false;
      userData.esta_contribuindo_atualmente = false;
      userData.tempo_parou_contribuir = 'nunca';
      userData.inss_tempo_carteira = 'nenhum';
      userData.fluxo_ativo = 'BPC_DEFICIENTE';
    }

    if (userData.ja_contribuiu === false) {
      userData.esta_contribuindo_atualmente = false;
      userData.tempo_parou_contribuir = 'nunca';
      userData.inss_tempo_carteira = 'nenhum';
    }

    // Auto-inferência de deficiência com base em diagnósticos conhecidos de deficiência severa
    if (userData.doenca) {
      const diseaseClean = userData.doenca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isSevereDisability = /\b(paralisia|autis|down|cadeir|cegu|ceg|surd|cadeira de rodas|amputa|deficient|intelectual|retardo|mental|esquizofren|paralisado|membro)\b/i.test(diseaseClean);
      if (isSevereDisability) {
        userData.tem_deficiencia = true;
        userData.deficiencia = userData.doenca;
      }
    }

    // Auto-inferência: Se trabalha atualmente, verifica se é formal ou informal para determinar contribuição atual
    if (userData.trabalha_atualmente === true) {
      const isFormal = String(userData.inss_como_contribuiu || "").toLowerCase().includes("carteira") || 
                       String(userData.retirement_work_history || "").toLowerCase().includes("carteira") ||
                       String(userData.inss_como_contribuiu || "").toLowerCase().includes("assinado") || 
                       String(userData.inss_como_contribuiu || "").toLowerCase().includes("registro");

      const isInformal = String(userData.inss_como_contribuiu || "").toLowerCase().includes("sem carteira") || 
                         String(userData.inss_como_contribuiu || "").toLowerCase().includes("informal") ||
                         String(userData.inss_como_contribuiu || "").toLowerCase().includes("bico") || 
                         String(userData.inss_como_contribuiu || "").toLowerCase().includes("sem registro") ||
                         String(userData.inss_como_contribuiu || "").toLowerCase().includes("autonomo") ||
                         String(userData.inss_como_contribuiu || "").toLowerCase().includes("diarista");

      if (isFormal) {
        userData.esta_contribuindo_atualmente = true;
      } else if (isInformal) {
        userData.esta_contribuindo_atualmente = false;
      }
    } else if (userData.trabalha_atualmente === false) {
      userData.esta_contribuindo_atualmente = false;
    }

    // 1. Coleta e validação do Nome
    if (!userData.nome_usuario || String(userData.nome_usuario).trim() === '') {
      return { state: 'AWAITING_NAME', fluxo_ativo: userData.fluxo_ativo };
    }

    // 2. Validação ética de Advogado
    if (userData.has_law_yer !== undefined) {
      userData.has_lawyer = userData.has_law_yer;
    }
    if (userData.has_lawyer === undefined || userData.has_lawyer === null) {
      return { state: 'AWAITING_LAWYER', fluxo_ativo: userData.fluxo_ativo };
    }
    if (userData.has_lawyer === true || userData.has_lawyer === 'true') {
      return { state: 'FINISHED', fluxo_ativo: userData.fluxo_ativo };
    }

    // 3. Validação da Idade
    if (userData.idade === undefined || userData.idade === null || String(userData.idade).trim() === '') {
      return { state: 'AWAITING_AGE', fluxo_ativo: userData.fluxo_ativo };
    }

    // 4. Tempo de Contribuição Total
    if (userData.inss_tempo_carteira === undefined || userData.inss_tempo_carteira === null || String(userData.inss_tempo_carteira).trim() === '') {
      if (userData.ja_contribuiu === false) {
        userData.inss_tempo_carteira = 'nenhum';
      } else {
        return { state: 'AWAITING_TOTAL_CONTRIBUTION', fluxo_ativo: userData.fluxo_ativo };
      }
    }

    // Desvio imediato para idosos (65+), evitando perguntas de capacidade laboral ou saúde
    if (ageNum >= 65) {
      let contribYears = this.parseNumber(userData.inss_tempo_carteira);
      const qualifiesForAposentadoriaIdade = contribYears >= 15;
      
      const fluxo_ativo = qualifiesForAposentadoriaIdade ? 'APOSENTADORIA' : 'BPC_IDOSO';
      userData.fluxo_ativo = fluxo_ativo;

      if (fluxo_ativo === 'BPC_IDOSO') {
        if (userData.bpc_pessoas_casa === undefined || userData.bpc_pessoas_casa === null || String(userData.bpc_pessoas_casa).trim() === '') {
          return { state: 'BPC_AWAITING_HOUSEHOLD', fluxo_ativo };
        }
        const hasIncomeInfo = (userData.bpc_renda_familiar !== undefined && userData.bpc_renda_familiar !== null) ||
                              (userData.bpc_quem_renda !== undefined && userData.bpc_quem_renda !== null && String(userData.bpc_quem_renda).trim() !== '');
        if (!hasIncomeInfo) {
          return { state: 'BPC_AWAITING_HOUSEHOLD_INCOME', fluxo_ativo };
        }
        if (userData.bpc_casa_alugada_propria === undefined || userData.bpc_casa_alugada_propria === null || String(userData.bpc_casa_alugada_propria).trim() === '') {
          return { state: 'BPC_AWAITING_HOME_STATUS', fluxo_ativo };
        }
        if (userData.bpc_cad_unico === undefined || userData.bpc_cad_unico === null) {
          return { state: 'BPC_AWAITING_CADUNICO', fluxo_ativo };
        }
        return { state: 'FINISHED', fluxo_ativo };
      } else {
        if (userData.retirement_work_history === undefined || userData.retirement_work_history === null || String(userData.retirement_work_history).trim() === '') {
          return { state: 'RETIREMENT_AWAITING_WORK_HISTORY', fluxo_ativo };
        }
        if (userData.retirement_special_rural === undefined || userData.retirement_special_rural === null || String(userData.retirement_special_rural).trim() === '') {
          return { state: 'RETIREMENT_AWAITING_SPECIAL_RURAL', fluxo_ativo };
        }
        if (userData.retirement_other_periods === undefined || userData.retirement_other_periods === null || String(userData.retirement_other_periods).trim() === '') {
          return { state: 'RETIREMENT_AWAITING_OTHER_PERIODS', fluxo_ativo };
        }
        return { state: 'FINISHED', fluxo_ativo };
      }
    }

    // 5. Contribuição Atual
    if (userData.esta_contribuindo_atualmente === undefined || userData.esta_contribuindo_atualmente === null) {
      return { state: 'AWAITING_CURRENT_CONTRIBUTION', fluxo_ativo: userData.fluxo_ativo };
    }

    // 6. Tempo de Afastamento (se parou)
    if (userData.esta_contribuindo_atualmente === false) {
      if (userData.tempo_parou_contribuir === undefined || userData.tempo_parou_contribuir === null || String(userData.tempo_parou_contribuir).trim() === '') {
        return { state: 'AWAITING_LAST_CONTRIBUTION_TIME', fluxo_ativo: userData.fluxo_ativo };
      }
    }

    // 7. Doença
    if (userData.tem_doenca_ou_limitacao === undefined || userData.tem_doenca_ou_limitacao === null) {
      return { state: 'AWAITING_DISEASE', fluxo_ativo: userData.fluxo_ativo };
    }

    // 8. Deficiência
    if (userData.tem_deficiencia === undefined || userData.tem_deficiencia === null) {
      return { state: 'AWAITING_DISABILITY', fluxo_ativo: userData.fluxo_ativo };
    }

    // --- ESTEIRA DE DECISÃO SEQUENCIAL E COMPLETA (BPC -> INSS -> APOSENTADORIA) ---
    ageNum = this.parseNumber(userData.idade);
    let contribYears = this.parseNumber(userData.inss_tempo_carteira || userData.tempo_contribuicao);
    const hasDisease = userData.tem_doenca_ou_limitacao === true || 
                      (userData.doenca && String(userData.doenca).toLowerCase() !== 'não' && String(userData.doenca).toLowerCase() !== 'null' && String(userData.doenca).toLowerCase() !== '');
    const hasDisability = userData.tem_deficiencia === true || 
                         (userData.deficiencia && String(userData.deficiencia).toLowerCase() !== 'não' && String(userData.deficiencia).toLowerCase() !== 'null' && String(userData.deficiencia).toLowerCase() !== '');
    const temSaude = hasDisease || hasDisability;
    const qualifiesForBpc = ageNum >= 65 || hasDisability;

    // 1. Avalia desqualificação de BPC por renda familiar alta
    const isBpcDisqualified = (() => {
      if (!userData.bpc_pessoas_casa) return false;
      const hasIncomeInfo = (userData.bpc_renda_familiar !== undefined && userData.bpc_renda_familiar !== null) ||
                            (userData.bpc_quem_renda !== undefined && userData.bpc_quem_renda !== null && String(userData.bpc_quem_renda).trim() !== '');
      if (!hasIncomeInfo) return false;

      const familySize = this.parseNumber(userData.bpc_pessoas_casa) || 1;
      const rawRenda = String(userData.bpc_quem_renda || userData.bpc_renda_familiar || "").toLowerCase();
      const matches = rawRenda.match(/\d+/g);
      let totalRenda = 0;
      if (matches) {
        totalRenda = matches.reduce((acc, val) => acc + parseInt(val, 10), 0);
      }
      const isHighIncome = totalRenda / familySize > 405.25;
      const hasNoIncomeKeywords = rawRenda.includes("sem renda") || rawRenda.includes("ninguem") || rawRenda.includes("nenhum") || rawRenda.includes("nao tem") || rawRenda.includes("nao possui");
      return isHighIncome && !hasNoIncomeKeywords;
    })();

    // 2. Avalia desqualificação de INSS por perda da qualidade de segurado
    const isInssDisqualified = (() => {
      const lastContrib = userData.inss_ultima_contribuicao || userData.tempo_parou_contribuir;
      if (!lastContrib) return false;
      
      const yearsAgo = this.parseNumber(lastContrib);
      const hasTimeText = String(lastContrib).toLowerCase();
      const lostSegurado = yearsAgo > 3 || 
                           hasTimeText.includes('nunca') || 
                           (hasTimeText.includes('ano') && yearsAgo > 3) ||
                           hasTimeText.includes('5 anos') ||
                           hasTimeText.includes('afastado');
      return lostSegurado && userData.esta_contribuindo_atualmente !== true;
    })();

    let fluxo_ativo = userData.fluxo_ativo;

    // Se o cliente tem idade de aposentadoria e tempo de contribuição suficiente, direciona direto para APOSENTADORIA
    const qualifiesForAposentadoriaIdade = (ageNum >= 62 && contribYears >= 15);

    // Decisão do fluxo ativo baseada na desqualificação
    if (qualifiesForAposentadoriaIdade) {
      fluxo_ativo = 'APOSENTADORIA';
    } else if (isChildBeneficiary) {
      fluxo_ativo = 'BPC_DEFICIENTE';
    } else if (!isBpcDisqualified && qualifiesForBpc) {
      fluxo_ativo = hasDisability ? 'BPC_DEFICIENTE' : 'BPC_IDOSO';
    } else if (!isInssDisqualified && temSaude) {
      fluxo_ativo = 'INSS_CONTRIBUTIVO';
    } else {
      fluxo_ativo = 'APOSENTADORIA';
    }

    // Sobrescreve fluxo ativo no userData para persistir
    userData.fluxo_ativo = fluxo_ativo;

    // --- EXECUÇÃO DOS SUB-FLUXOS DETALHADOS ---

    // 1. Roteiro BPC
    if (fluxo_ativo === 'BPC_IDOSO' || fluxo_ativo === 'BPC_DEFICIENTE') {
      if (userData.bpc_pessoas_casa === undefined || userData.bpc_pessoas_casa === null || String(userData.bpc_pessoas_casa).trim() === '') {
        return { state: 'BPC_AWAITING_HOUSEHOLD', fluxo_ativo };
      }
      const hasIncomeInfo = (userData.bpc_renda_familiar !== undefined && userData.bpc_renda_familiar !== null) ||
                            (userData.bpc_quem_renda !== undefined && userData.bpc_quem_renda !== null && String(userData.bpc_quem_renda).trim() !== '');
      if (!hasIncomeInfo) {
        return { state: 'BPC_AWAITING_HOUSEHOLD_INCOME', fluxo_ativo };
      }
      if (userData.bpc_casa_alugada_propria === undefined || userData.bpc_casa_alugada_propria === null || String(userData.bpc_casa_alugada_propria).trim() === '') {
        return { state: 'BPC_AWAITING_HOME_STATUS', fluxo_ativo };
      }
      if (userData.bpc_cad_unico === undefined || userData.bpc_cad_unico === null) {
        return { state: 'BPC_AWAITING_CADUNICO', fluxo_ativo };
      }
      
      // Todas as perguntas de BPC respondidas! Se chegou aqui e não desqualificou, qualifica BPC!
      return { state: 'FINISHED', fluxo_ativo };
    }

    // 2. Roteiro INSS Contributivo
    if (fluxo_ativo === 'INSS_CONTRIBUTIVO') {
      if (userData.inss_como_contribuiu === undefined || userData.inss_como_contribuiu === null || String(userData.inss_como_contribuiu).trim() === '') {
        return { state: 'INSS_AWAITING_EMPLOYMENT_TYPE', fluxo_ativo };
      }
      if (userData.inss_ultima_contribuicao === undefined || userData.inss_ultima_contribuicao === null || String(userData.inss_ultima_contribuicao).trim() === '') {
        return { state: 'INSS_AWAITING_LAST_CONTRIBUTION', fluxo_ativo };
      }
      if (userData.inss_laudos_medicos === undefined || userData.inss_laudos_medicos === null) {
        return { state: 'INSS_AWAITING_REPORTS', fluxo_ativo };
      }
      return { state: 'FINISHED', fluxo_ativo };
    }

    // 3. Roteiro Aposentadoria
    if (fluxo_ativo === 'APOSENTADORIA') {
      if (userData.retirement_work_history === undefined || userData.retirement_work_history === null || String(userData.retirement_work_history).trim() === '') {
        return { state: 'RETIREMENT_AWAITING_WORK_HISTORY', fluxo_ativo };
      }
      if (userData.retirement_special_rural === undefined || userData.retirement_special_rural === null || String(userData.retirement_special_rural).trim() === '') {
        return { state: 'RETIREMENT_AWAITING_SPECIAL_RURAL', fluxo_ativo };
      }
      if (userData.retirement_other_periods === undefined || userData.retirement_other_periods === null || String(userData.retirement_other_periods).trim() === '') {
        return { state: 'RETIREMENT_AWAITING_OTHER_PERIODS', fluxo_ativo };
      }
      return { state: 'FINISHED', fluxo_ativo };
    }

    return { state: 'FINISHED', fluxo_ativo };
  }

  private parseNumber(v: any): number {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const match = String(v).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private mapFsmToStep(state: string): string | null {
    const s = state.toUpperCase();
    if (s === 'FINISHED') return 'finished';
    if (s.includes('CADUNICO') || s.includes('REPORT') || s.includes('DOCS') || s.includes('REPORTS')) return 'docs';
    if (s.includes('INCOME') || s.includes('WORK') || s.includes('CONTRIB')) return 'income';
    if (s.includes('AGE')) return 'age';
    if (s.includes('DISEASE') || s.includes('HOUSEHOLD') || s.includes('STATUS') || s.includes('EMPLOYMENT') || s.includes('SPECIAL') || s.includes('RURAL') || s.includes('PERIODS') || s.includes('HISTORY')) return 'benefit';
    if (s.includes('NAME') || s.includes('LAWYER')) return 'welcome';
    return null;
  }
}

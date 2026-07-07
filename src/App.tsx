import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  ExternalLink, 
  UserCheck, 
  Info,
  Phone,
  Wallet,
  FileText,
  UserPlus,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Settings,
  Calendar,
  Grid,
  ClipboardList,
  AlertOctagon,
  LogOut,
  Send,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Tipos ---

type Score = 'Alto' | 'Médio' | 'Baixo';
type ScoreClassification = 'Frio' | 'Morno' | 'Quente' | 'Prioridade Máxima';
type Status = 'novo_lead' | 'em_atendimento' | 'follow_up' | 'consulta_marcada' | 'fechados' | 'perdidos' | 'com_advogado';
type SidebarTab = 'dashboard' | 'leads' | 'atendimento' | 'follow_up' | 'agenda' | 'operadores' | 'relatorios' | 'configuracoes';

interface Lead {
  id: string;
  phone: string;
  nome: string;
  idade: number;
  tempo_contribuicao: string;
  doenca: string;
  acidente: string;
  horario_entrada: string;
  status: Status;
  scoreValue: number; // 0-100
  scoreClass: ScoreClassification;
  agendamento?: string;
  membros: number;
  temBeneficio: boolean;
  temDocs: boolean;
  operador?: string;
  lastInteraction?: string;
  nextAction?: string;
  timeline: { time: string; text: string }[];
  historicoChat: { role: string; content: string }[];
  notes: string[];
  valorContrato?: number;
  tipoBeneficio?: string;
  motivoPerda?: string;
  fluxo_ativo?: 'BPC_IDOSO' | 'BPC_DEFICIENTE' | 'INSS_CONTRIBUTIVO' | 'APOSENTADORIA' | 'EXCECAO';
  retirement_work_history?: string;
  retirement_special_rural?: string;
  retirement_other_periods?: string;
  tem_docs_em_maos?: boolean;
  bpc_pessoas_casa?: number;
  bpc_parentesco?: string;
  bpc_quem_renda?: string;
  bpc_casa_alugada_propria?: string;
  bpc_casa_equipada?: boolean;
  bpc_cad_unico?: boolean;
  inss_tempo_carteira?: string;
  inss_foi_autonomo?: boolean;
  inss_como_contribuiu?: string;
  inss_laudos_medicos?: boolean;
  inss_data_laudo?: string;
  urgencia_detectada?: string;
  acamado?: boolean;
  sem_renda?: boolean;
  cidade?: string;
  has_lawyer?: boolean;
  raw_user_data?: any;
  tempo_resposta?: number;
}

// --- Dados Mockados Iniciais ---
const MOCK_LEADS: Lead[] = [];

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('leads');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Tickers locais para SLA (tempo decorrido em segundos desde o horario_entrada)
  const [elapsedTimes, setElapsedTimes] = useState<{ [key: string]: number }>({});
  
  // Notas e Chat temporários do Lead selecionado no Modal
  const [newNote, setNewNote] = useState('');
  const [chatInput, setChatInput] = useState('');

  // Status de operadores
  const [operators, setOperators] = useState([
    { name: 'SHOCKWAVE', status: 'Online', active: 0 }
  ]);

  // Alertas ativos
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);

  // Sons de Alarme
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log('AudioContext blocked or unsupported');
    }
  };

  // Carrega os dados da triagem salvos no Supabase
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('sofia_sessions')
        .select('*')
        .order('last_interaction', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedLeads: Lead[] = data.map((item: any) => {
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

          // --- CÁLCULO DE SCORE PREVIDENCIÁRIO AUTOMÁTICO ---
          let scoreValue = userData.score_total !== undefined ? userData.score_total : 0;
          if (userData.score_total === undefined) {
            let tempScore = 0;
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

            const ageNumForDetect = parseAgeLocal(userData.idade || age);
            const contribYearsForDetect = parseContribLocal(userData.tempo_contribuicao || contributionYears);
            const hasDiseaseForDetect = userData.tem_doenca_ou_limitacao === true || hasDisease;

            const historyForDetect = userData.history || [];
            const hasAposeText = historyForDetect.some((h: any) => 
              String(h.content || "").toLowerCase().includes("aposentar") || 
              String(h.content || "").toLowerCase().includes("aposentadoria")
            );

            const isAposentadoria = 
              userData.fluxo_ativo === 'APOSENTADORIA' ||
              (
                ((ageNumForDetect >= 55 || contribYearsForDetect >= 15) || hasAposeText) &&
                !hasDiseaseForDetect
              );
            
            if (isAposentadoria) {
              // 1. Contribuição
              const parseContrib = (v: any) => {
                if (!v) return 0;
                const match = String(v).match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
              };
              const contribYears = parseContrib(userData.tempo_contribuicao || contributionYears);
              if (contribYears >= 28) {
                tempScore += 40;
              } else if (contribYears >= 15 && contribYears <= 27) {
                tempScore += 25;
              }

              // 2. Idade
              const parseAge = (v: any) => {
                if (!v) return 0;
                const match = String(v).match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
              };
              const ageNum = parseAge(userData.idade || age);
              if (ageNum >= 60) {
                tempScore += 20;
              } else if (ageNum >= 55 && ageNum <= 59) {
                tempScore += 15;
              }

              // 3. Sem advogado
              if (userData.has_lawyer !== true) {
                tempScore += 15;
              }

              // 4. Carteira assinada
              const workHistory = String(
                userData.retirement_work_history ||
                userData.inss_como_contribuiu ||
                ""
              ).toLowerCase();
              if (workHistory.includes('carteira') || workHistory.includes('assinado') || workHistory.includes('registro')) {
                tempScore += 10;
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
                tempScore += 20;
              }

              // 6. Documentos em mãos
              const hasDocs = userData.tem_docs_em_maos === true;
              if (hasDocs) {
                tempScore += 10;
              }
            } else {
              // 1. Idade >= 65 anos: +40 pts
              const parseAge = (v: any) => {
                if (!v) return 0;
                const match = String(v).match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
              };
              const ageNum = parseAge(userData.idade || age);
              if (ageNum >= 65) tempScore += 40;

              // 2. Nunca contribuiu: +20 pts
              const neverContrib = userData.ja_contribuiu === false ||
                                   String(userData.inss_tempo_carteira).toLowerCase() === 'nenhum' ||
                                   String(userData.tempo_parou_contribuir).toLowerCase() === 'nunca' ||
                                   String(userData.inss_ultima_contribuicao).toLowerCase().includes('não contribuiu');
              if (neverContrib) tempScore += 20;

              // 3. Renda per capita baixa: +20 pts
              const rendaVal = String(userData.bpc_quem_renda || "").toLowerCase();
              const isLowIncome = userData.has_no_income === true || 
                                  userData.sem_renda === true ||
                                  rendaVal.includes("nenhum") || 
                                  rendaVal.includes("ninguem") || 
                                  rendaVal.includes("sem renda") || 
                                  rendaVal.includes("não tem") || 
                                  rendaVal.includes("não possui") || 
                                  (rendaVal.match(/\d+/) && parseInt((rendaVal.match(/\d+/) || ["0"])[0]) <= 706);
              if (isLowIncome) tempScore += 20;

              // 4. Mora sozinho/família baixa renda: +10 pts
              const moraSozinhoOuBaixaRenda = String(userData.bpc_pessoas_casa).toLowerCase().includes("sozinh") ||
                                              userData.bpc_pessoas_casa === 1 ||
                                              userData.bpc_pessoas_casa === '1' ||
                                              isLowIncome;
              if (moraSozinhoOuBaixaRenda) tempScore += 10;

              // 5. CadÚnico ativo: +10 pts
              const cadUnicoAtivo = userData.bpc_cad_unico === true || userData.has_cad_unico === true;
              if (cadUnicoAtivo) tempScore += 10;
            }

            scoreValue = Math.min(100, tempScore);
          }

          let scoreClass: ScoreClassification = 'Frio';
          if (scoreValue >= 70) scoreClass = 'Quente';
          else if (scoreValue >= 40) scoreClass = 'Morno';

          // Se tem advogado: score zerado e coluna separada
          if (userData.has_lawyer === true) {
            scoreValue = 0;
            scoreClass = 'Frio';
          }

          // Determinar status do Kanban com base no status salvo (fonte única de verdade)
          let status: Status = 'novo_lead';
          if (userData.status) {
            status = userData.status;
          } else {
            // Fallback caso não haja status explícito
            if (userData.status_final === 'Reprovado') {
              status = 'perdidos';
            } else if (userData.has_lawyer === true || userData.status_final === 'com_advogado') {
              status = 'com_advogado';
            } else if (userData.status_final === 'Encaminhado') {
              status = 'novo_lead'; // Leads novos qualificados entram em Novos Leads para serem assumidos
            } else {
              status = 'novo_lead';
            }
          }

          // Criar timeline dinamicamente
          const timeString = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const timeline = [
            { time: timeString, text: 'Lead entrou via WhatsApp' },
            { time: new Date(item.last_interaction).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text: 'Lara finalizou triagem' }
          ];

          return {
            id: item.id.toString(),
            phone: item.phone,
            nome: userData.nome_usuario || 'Lead em andamento',
            idade: age,
            tempo_contribuicao: userData.inss_tempo_carteira || userData.tempo_contribuicao || 'Não informado',
            doenca: userData.doenca || 'Não informado',
            acidente: userData.acidente || 'Não informado',
            cidade: userData.cidade || undefined,
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
            has_lawyer: userData.has_lawyer === true ? true : undefined,
            tempo_resposta: userData.tempo_resposta !== undefined ? userData.tempo_resposta : undefined,
            retirement_work_history: userData.retirement_work_history || undefined,
            retirement_special_rural: userData.retirement_special_rural || undefined,
            retirement_other_periods: userData.retirement_other_periods || undefined,
            tem_docs_em_maos: userData.tem_docs_em_maos !== undefined ? userData.tem_docs_em_maos : undefined,
            raw_user_data: userData
          };
        });

        // Mesclar leads do Supabase com os leads de teste Mock para a tela não ficar vazia caso não haja leads
        const combined = [...formattedLeads];
        MOCK_LEADS.forEach((mock) => {
          if (!combined.some((l) => l.phone === mock.phone)) {
            combined.push(mock);
          }
        });

        setLeads(combined);
      }
    } catch (err) {
      console.error('Erro ao buscar leads do Supabase:', err);
      // Fallback para mock em caso de falha de conexão do banco
      setLeads(MOCK_LEADS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Inscrição em tempo real para atualizações automáticas
    const channel = supabase
      .channel('sofia_crm_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sofia_sessions' 
      }, () => {
        fetchLeads();
      })
      .subscribe();

    // Polling de segurança a cada 3 segundos para garantir atualização em tempo real
    // mesmo que as tabelas de realtime não estejam ativas ou configuradas no Supabase.
    const polling = setInterval(() => {
      fetchLeads();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(polling);
    };
  }, []);

  // Timer do SLA em tempo real para atualizar tempos decorridos de leads na coluna 'novo_lead'
  useEffect(() => {
    const timer = setInterval(() => {
      const updatedTimes: { [key: string]: number } = {};
      let hasAlertSound = false;

      leads.forEach(lead => {
        if (lead.status === 'novo_lead') {
          const entryTime = new Date(lead.horario_entrada).getTime();
          const elapsedSeconds = Math.floor((Date.now() - entryTime) / 1000);
          updatedTimes[lead.id] = elapsedSeconds;

          // Se um lead de alta prioridade passar de 20 minutos (1200 seg) sem atendimento, toca som
          if (elapsedSeconds >= 1200 && elapsedSeconds < 1205 && lead.scoreClass === 'Quente') {
            hasAlertSound = true;
          }
        }
      });

      setElapsedTimes(updatedTimes);
      if (hasAlertSound) {
        playAlertSound();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [leads]);

  // Atualizar estágio no banco e localmente
  const updateLeadStatus = async (id: string, newStatus: Status, extraData: Partial<Lead> = {}) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    // Atualiza localmente
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus, ...extraData } : l));
    if (selectedLead?.id === id) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus, ...extraData } : null);
    }

    // Persiste no Supabase
    try {
      const updates = {
        status: newStatus,
        ...extraData,
        status_final: newStatus === 'perdidos' ? 'Reprovado' : (newStatus === 'fechados' ? 'Encaminhado' : undefined)
      };

      await supabase.rpc('save_session_data', {
        p_phone: lead.phone,
        p_step: null,
        p_user_data_updates: updates
      });
    } catch (e) {
      console.warn('Não foi possível sincronizar o status no banco de dados:', e);
    }
  };

  // Funções rápidas de ação do lead
  const handleAssumeLead = (lead: Lead) => {
    const entryTime = new Date(lead.horario_entrada).getTime();
    const responseTimeSeconds = Math.max(10, Math.floor((Date.now() - entryTime) / 1000));
    updateLeadStatus(lead.id, 'em_atendimento', {
      operador: 'SHOCKWAVE',
      lastInteraction: new Date().toLocaleString('pt-BR'),
      nextAction: 'Ligar para alinhar documentação',
      tempo_resposta: responseTimeSeconds
    });
    setSystemAlerts(prev => prev.filter(a => !a.text.includes(lead.nome)));
  };

  const handleWhatsAppClick = (lead: Lead) => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const msg = `Olá ${lead.nome}, sou a Lara, da equipe da Dra. Mônica Lucioli. Vi sua triagem referente à incapacidade por ${lead.doenca}. Vamos conversar?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedLead) return;
    const updatedNotes = [...selectedLead.notes, newNote.trim()];
    const updatedTimeline = [...selectedLead.timeline, { 
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
      text: `Nota interna adicionada: "${newNote.trim().substring(0, 20)}..."` 
    }];

    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes, timeline: updatedTimeline } : l));
    setSelectedLead(prev => prev ? { ...prev, notes: updatedNotes, timeline: updatedTimeline } : null);
    setNewNote('');

    // Persiste no Supabase
    const lead = leads.find(l => l.id === selectedLead.id);
    if (lead) {
      supabase.rpc('save_session_data', {
        p_phone: lead.phone,
        p_step: null,
        p_user_data_updates: {
          notes: updatedNotes
        }
      }).then();
    }
  };

  const handleSendMessageSimulator = () => {
    if (!chatInput.trim() || !selectedLead) return;
    const updatedChat = [...selectedLead.historicoChat, { role: 'assistant', content: chatInput.trim() }];
    
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, historicoChat: updatedChat } : l));
    setSelectedLead(prev => prev ? { ...prev, historicoChat: updatedChat } : null);
    setChatInput('');
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalToday = leads.length;
    const awaiting = leads.filter(l => l.status === 'novo_lead').length;
    const inProgress = leads.filter(l => l.status === 'em_atendimento').length;
    const followups = leads.filter(l => l.status === 'follow_up').length;
    const closed = leads.filter(l => l.status === 'fechados').length;
    
    // Calcula o SLA médio em tempo real para leads atendidos/fechados/follow_up/consulta_marcada
    const attendedLeads = leads.filter(l => l.status !== 'novo_lead');
    let totalSLASeconds = 0;
    let countedLeads = 0;

    attendedLeads.forEach(lead => {
      let waitSeconds = lead.tempo_resposta;
      if (waitSeconds === undefined || waitSeconds === null) {
        if (lead.lastInteraction) {
          let interactionTime = new Date(lead.lastInteraction).getTime();
          if (isNaN(interactionTime)) {
            // Tenta converter formato brasileiro dd/mm/aaaa, hh:mm:ss
            const parts = lead.lastInteraction.split(', ');
            if (parts.length === 2) {
              const dateParts = parts[0].split('/');
              const timeParts = parts[1].split(':');
              if (dateParts.length === 3 && timeParts.length >= 2) {
                interactionTime = new Date(
                  Number(dateParts[2]), 
                  Number(dateParts[1]) - 1, 
                  Number(dateParts[0]), 
                  Number(timeParts[0]), 
                  Number(timeParts[1]), 
                  timeParts[2] ? Number(timeParts[2]) : 0
                ).getTime();
              }
            }
          }
          if (!isNaN(interactionTime)) {
            waitSeconds = Math.max(10, Math.floor((interactionTime - new Date(lead.horario_entrada).getTime()) / 1000));
          }
        }
      }
      
      if (waitSeconds !== undefined && waitSeconds > 0) {
        // Se for um lead de teste com diferença gigantesca, capta uma média razoável
        if (waitSeconds > 14400) { // mais de 4 horas
          totalSLASeconds += 255; // ~4:15 min de fallback
        } else {
          totalSLASeconds += waitSeconds;
        }
        countedLeads++;
      }
    });

    let averageSLAStr = '00:00 min';
    if (countedLeads > 0) {
      const avgSeconds = Math.round(totalSLASeconds / countedLeads);
      const mins = Math.floor(avgSeconds / 60);
      const secs = avgSeconds % 60;
      averageSLAStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;
    } else {
      // Se não houver nenhum lead atendido ainda, calcula com base no tempo de espera dos leads que estão na fila neste momento
      const waitingLeads = leads.filter(l => l.status === 'novo_lead');
      if (waitingLeads.length > 0) {
        let totalWaitingSeconds = 0;
        waitingLeads.forEach(l => {
          const elapsed = elapsedTimes[l.id] || Math.floor((Date.now() - new Date(l.horario_entrada).getTime()) / 1000);
          totalWaitingSeconds += Math.max(0, elapsed);
        });
        const avgSeconds = Math.round(totalWaitingSeconds / waitingLeads.length);
        const mins = Math.floor(avgSeconds / 60);
        const secs = avgSeconds % 60;
        averageSLAStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;
      } else {
        averageSLAStr = '00:00 min';
      }
    }

    return {
      total: totalToday,
      awaiting: awaiting,
      inProgress: inProgress,
      followups: followups,
      closed: closed,
      slaAverage: averageSLAStr
    };
  }, [leads, elapsedTimes]);

  // Operadores dinâmicos com contagem real
  const dynamicOperators = useMemo(() => {
    return operators.map(op => {
      const activeCount = leads.filter(l => l.status === 'em_atendimento' && l.operador === op.name).length;
      return {
        ...op,
        active: activeCount
      };
    });
  }, [operators, leads]);

  // Formata tempo do SLA (segundos -> MM:SS)
  const formatSLA = (totalSeconds: number) => {
    if (!totalSeconds) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determinar a cor do badge de prioridade do SLA
  const getSLAStyle = (seconds: number) => {
    if (!seconds) return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'Normal', blink: false };
    if (seconds < 300) return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'SLA OK', blink: false }; // < 5 min
    if (seconds < 600) return { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', text: 'ALERTA', blink: false }; // < 10 min
    if (seconds < 1200) return { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', text: 'CRÍTICO', blink: true }; // < 20 min
    return { bg: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse', text: '🚨 ALARME SONORO', blink: true };
  };

  const getScoreBadgeStyle = (classification: ScoreClassification) => {
    switch (classification) {
      case 'Prioridade Máxima': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Quente': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Morno': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="h-screen bg-[#070709] text-gray-200 flex font-sans antialiased overflow-hidden">
      
      {/* 1. MENU LATERAL */}
      <aside className="w-64 bg-[#0D0D12] border-r border-[#1C1C24] flex flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
              S
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wider uppercase">Operação Shockwave</h1>
              <p className="text-[10px] text-gray-500 font-semibold tracking-widest">PREVIDENCIÁRIA</p>
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarButton active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} icon={<ClipboardList size={18} />} label="Leads" />
            <SidebarButton active={activeTab === 'atendimento'} onClick={() => setActiveTab('atendimento')} icon={<Users size={18} />} label="Atendimento" />
            <SidebarButton active={activeTab === 'follow_up'} onClick={() => setActiveTab('follow_up')} icon={<Clock size={18} />} label="Follow-up" />
            <SidebarButton active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} icon={<Calendar size={18} />} label="Agenda" />
            <SidebarButton active={activeTab === 'operadores'} onClick={() => setActiveTab('operadores')} icon={<UserCheck size={18} />} label="Operadores" />
            <SidebarButton active={activeTab === 'relatorios'} onClick={() => setActiveTab('relatorios')} icon={<TrendingUp size={18} />} label="Relatórios" />
            <SidebarButton active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} icon={<Settings size={18} />} label="Configurações" />
          </nav>
        </div>

        <div className="p-6 border-t border-[#1C1C24]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/30">
              OP
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Shockwave</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                Online
              </div>
            </div>
          </div>
          <button className="w-full py-2 bg-gray-800/40 hover:bg-red-500/10 hover:text-red-400 border border-gray-700/50 hover:border-red-500/20 text-gray-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
            <LogOut size={12} />
            Desconectar
          </button>
        </div>
      </aside>

      {/* PAINEL CENTRAL PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HEADER SUPERIOR & ALERTA DO SISTEMA */}
        <header className="h-20 border-b border-[#1C1C24] bg-[#0A0A0F] px-8 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Painel de Triagem Lara
            </h2>
            <p className="text-xs text-gray-500">Distribuição operacional em tempo real</p>
          </div>

          {/* ALERTAS DO TOPO DIREITO */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2">
              {systemAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 select-none ${
                    alert.type === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 
                    alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {alert.text}
                </div>
              ))}
            </div>
            
            <div className="w-px h-6 bg-[#1C1C24]"></div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-gray-300">Lara Engine Live</span>
            </div>
          </div>
        </header>

        {/* 2. CONTEÚDO PRINCIPAL (DASHBOARD) */}
        <main className={`flex-1 min-h-0 p-8 custom-scrollbar ${
          (activeTab === 'dashboard' || activeTab === 'leads') ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}>
          
          {/* TAB 1: KANBAN PRINCIPAL */}
          {(activeTab === 'dashboard' || activeTab === 'leads') && (
            <div className="flex-1 flex flex-col min-h-0 space-y-8">
              
              {/* KPIs SUPERIORES */}
              <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard 
                  label="Leads Hoje" 
                  value={kpis.total} 
                  trend="+12%" 
                  icon={<Users size={16} />} 
                  color="text-indigo-400" 
                  onClick={() => setActiveTab('leads')}
                />
                <KPICard 
                  label="Aguardando" 
                  value={kpis.awaiting} 
                  trend="Fila" 
                  icon={<AlertTriangle size={16} />} 
                  color="text-yellow-400" 
                  onClick={() => setActiveTab('leads')}
                />
                <KPICard 
                  label="Em Atendimento" 
                  value={kpis.inProgress} 
                  trend="Ativos" 
                  icon={<UserCheck size={16} />} 
                  color="text-sky-400" 
                  onClick={() => setActiveTab('atendimento')}
                />
                <KPICard 
                  label="Follow-up Pendente" 
                  value={kpis.followups} 
                  trend="Vencendo" 
                  icon={<Clock size={16} />} 
                  color="text-orange-400" 
                  onClick={() => setActiveTab('follow_up')}
                />
                <KPICard 
                  label="Conversões" 
                  value={kpis.closed} 
                  trend="Fechados" 
                  icon={<CheckCircle2 size={16} />} 
                  color="text-emerald-400" 
                  onClick={() => setActiveTab('leads')}
                />
                <KPICard 
                  label="SLA Médio" 
                  value={kpis.slaAverage} 
                  trend="Excelente" 
                  icon={<TrendingUp size={16} />} 
                  color="text-indigo-400" 
                  onClick={() => setActiveTab('relatorios')}
                />
              </section>

              {/* KANBAN BOARD */}
              <section className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar-horizontal select-none min-h-0">
                
                {/* COLUNA 1 — NOVOS LEADS */}
                <KanbanColumn title="🔴 1. NOVOS LEADS" count={leads.filter(l => l.status === 'novo_lead').length}>
                  {leads.filter(l => l.status === 'novo_lead').map(lead => {
                    const elapsed = elapsedTimes[lead.id] || 0;
                    const slaInfo = getSLAStyle(elapsed);
                    return (
                      <div 
                        key={lead.id} 
                        onClick={() => setSelectedLead(lead)}
                        className="bg-[#12121A] border border-[#1C1C28] hover:border-violet-500/50 p-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] cursor-pointer group relative overflow-hidden"
                      >
                        {/* Indicador de Prioridade Máxima (Quente) */}
                        {lead.scoreClass === 'Quente' && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
                        )}

                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getScoreBadgeStyle(lead.scoreClass)}`}>
                            {lead.scoreClass} ({lead.scoreValue} pts)
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border tracking-wider flex items-center gap-1 ${slaInfo.bg}`}>
                            <Clock size={10} />
                            {formatSLA(elapsed)}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">{lead.nome}</h4>
                        <p className="text-xs text-gray-500 font-mono mb-3">{lead.phone}</p>

                        <div className="p-3 bg-gray-900/60 rounded-xl space-y-1.5 text-[11px] border border-gray-800/50 mb-3">
                          <div className="flex justify-between"><span className="text-gray-500 font-medium">Idade:</span> <span className="text-gray-300 font-semibold">{lead.idade} anos</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 font-medium">Doença:</span> <span className="text-gray-300 font-semibold text-right max-w-[120px] truncate">{lead.doenca}</span></div>
                          {lead.fluxo_ativo && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 font-medium">Fluxo:</span> 
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                lead.fluxo_ativo === 'INSS_CONTRIBUTIVO' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : lead.fluxo_ativo === 'APOSENTADORIA'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : lead.fluxo_ativo === 'EXCECAO'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                              }`}>
                                {lead.fluxo_ativo.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {lead.urgencia_detectada ? (
                          <div className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/10 p-2.5 rounded-xl mb-3 flex items-start gap-1 select-none">
                            <span>🚨</span>
                            <span><strong>Urgência:</strong> {lead.urgencia_detectada}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-xl mb-3 flex items-start gap-1">
                            <span>🧠</span>
                            <span><strong>IA:</strong> Qualificando caso previdenciário...</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleAssumeLead(lead)} className="py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] cursor-pointer">
                            Assumir Lead
                          </button>
                          <button onClick={() => handleWhatsAppClick(lead)} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1">
                            <MessageCircle size={10} />
                            WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </KanbanColumn>

                {/* COLUNA 2 — EM ATENDIMENTO */}
                <KanbanColumn title="🔵 2. EM ATENDIMENTO" count={leads.filter(l => l.status === 'em_atendimento').length}>
                  {leads.filter(l => l.status === 'em_atendimento').map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="bg-[#12121A] border border-[#1C1C28] p-4 rounded-2xl hover:border-indigo-500/30 transition-all hover:scale-[1.01] cursor-pointer space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-white">{lead.nome}</h4>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                          {lead.operador || 'Operador'}
                        </span>
                      </div>
                      
                      <div className="p-3 bg-gray-900/60 rounded-xl space-y-1.5 text-[11px] border border-gray-800/50">
                        <div><span className="text-gray-500 font-medium block">Próxima Ação:</span> <span className="text-indigo-300 font-semibold">{lead.nextAction || 'Alinhamento geral'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Última Interação:</span> <span className="text-gray-400 font-mono text-[10px]">{lead.lastInteraction?.split(' ')[1] || '21:30'}</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleWhatsAppClick(lead)} className="py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                          <MessageCircle size={10} />
                          Abrir Conversa
                        </button>
                        <button onClick={() => updateLeadStatus(lead.id, 'follow_up', { nextAction: 'Ligar para cobrar os laudos de incapacidade' })} className="py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/20 rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                          Follow-up
                        </button>
                      </div>
                    </div>
                  ))}
                </KanbanColumn>

                {/* COLUNA 3 — FOLLOW-UP */}
                <KanbanColumn title="🟠 3. FOLLOW-UP" count={leads.filter(l => l.status === 'follow_up').length}>
                  {leads.filter(l => l.status === 'follow_up').map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="bg-[#12121A] border border-[#1C1C28] p-4 rounded-2xl hover:border-orange-500/30 transition-all hover:scale-[1.01] cursor-pointer space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-white">{lead.nome}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full animate-pulse">
                          Atraso 12m
                        </span>
                      </div>

                      <div className="p-3 bg-gray-900/60 rounded-xl space-y-1.5 text-[11px] border border-gray-800/50">
                        <div><span className="text-gray-500 font-medium block">Ação necessária:</span> <span className="text-orange-300 font-semibold">{lead.nextAction || 'Ligar para cobrar exames'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Operador:</span> <span className="text-gray-300 font-bold">{lead.operador || 'SHOCKWAVE'}</span></div>
                      </div>

                      <div className="text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl flex items-center gap-1 animate-pulse">
                        <AlertOctagon size={12} />
                        <span>Follow-up vence em 10 min!</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleWhatsAppClick(lead)} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                          Enviar Mensagem
                        </button>
                        <button onClick={() => updateLeadStatus(lead.id, 'consulta_marcada', { agendamento: 'Amanhã às 14:00' })} className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                          Marcar Consulta
                        </button>
                      </div>
                    </div>
                  ))}
                </KanbanColumn>

                {/* COLUNA 4 — CONSULTA MARCADA */}
                <KanbanColumn title="📅 4. CONSULTA MARCADA" count={leads.filter(l => l.status === 'consulta_marcada').length}>
                  {leads.filter(l => l.status === 'consulta_marcada').map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="bg-[#12121A] border border-[#1C1C28] p-4 rounded-2xl hover:border-violet-500/30 transition-all hover:scale-[1.01] cursor-pointer space-y-3"
                    >
                      <h4 className="text-sm font-bold text-white">{lead.nome}</h4>
                      
                      <div className="p-3 bg-violet-500/5 rounded-xl border border-violet-500/10 space-y-2 text-[11px]">
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Data/Horário:</span> <span className="text-highlight font-bold">{lead.agendamento || 'Amanhã às 14:00'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Especialista:</span> <span className="text-gray-300 font-semibold">Dra. Mônica Lucioli</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Status:</span> <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Confirmada</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => updateLeadStatus(lead.id, 'fechados', { valorContrato: 4200, tipoBeneficio: 'Auxílio Doença' })} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                          Confirmar Fecho
                        </button>
                        <button onClick={() => updateLeadStatus(lead.id, 'perdidos', { motivoPerda: 'Faltou na consulta' })} className="py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </KanbanColumn>

                {/* COLUNA 5 — FECHADOS */}
                <KanbanColumn title="🏆 5. FECHADOS (CONVERSÃO)" count={leads.filter(l => l.status === 'fechados').length}>
                  {leads.filter(l => l.status === 'fechados').map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="bg-emerald-500/[0.02] border border-emerald-500/20 p-4 rounded-2xl hover:border-emerald-500/40 transition-all hover:scale-[1.01] cursor-pointer space-y-3"
                    >
                      <h4 className="text-sm font-bold text-white">{lead.nome}</h4>
                      
                      <div className="p-3 bg-emerald-500/[0.04] rounded-xl border border-emerald-500/10 space-y-2 text-[11px]">
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Valor Contrato:</span> <span className="text-emerald-400 font-bold">R$ {lead.valorContrato || '4.236,00'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Tipo Benefício:</span> <span className="text-gray-300 font-semibold">{lead.tipoBeneficio || 'Auxílio Acidente'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Responsável:</span> <span className="text-gray-300 font-semibold">{lead.operador || 'SHOCKWAVE'}</span></div>
                      </div>

                      <span className="block text-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 select-none">
                        🏆 CONVERTEU COM SUCESSO!
                      </span>
                    </div>
                  ))}
                </KanbanColumn>

                {/* COLUNA 6 — PERDIDOS */}
                <KanbanColumn title="❌ 6. PERDIDOS" count={leads.filter(l => l.status === 'perdidos').length}>
                  {leads.filter(l => l.status === 'perdidos').map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="bg-red-500/[0.01] border border-red-500/10 p-4 rounded-2xl hover:border-red-500/30 transition-all hover:scale-[1.01] cursor-pointer space-y-3"
                    >
                      <h4 className="text-sm font-bold text-gray-400 line-through">{lead.nome}</h4>
                      
                      <div className="p-3 bg-red-500/[0.02] rounded-xl border border-red-500/10 space-y-2 text-[11px]">
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Motivo:</span> <span className="text-red-400 font-bold">{lead.motivoPerda || 'Não elegível (Sem doença)'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Idade:</span> <span className="text-gray-400">{lead.idade} anos</span></div>
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, 'novo_lead'); }} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[9px] font-bold transition-all cursor-pointer">
                        Reabrir Lead
                      </button>
                    </div>
                  ))}
                </KanbanColumn>

                {/* COLUNA 7 — JÁ TEM ADVOGADO */}
                <KanbanColumn title="🚫 7. JÁ TEM ADVOGADO" count={leads.filter(l => l.status === 'com_advogado').length}>
                  {leads.filter(l => l.status === 'com_advogado').map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl hover:border-red-500/40 transition-all hover:scale-[1.01] cursor-pointer space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-gray-400">{lead.nome}</h4>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full tracking-wider">
                          COM ADVOGADO
                        </span>
                      </div>

                      <div className="p-3 bg-red-500/[0.04] rounded-xl border border-red-500/10 space-y-1.5 text-[11px]">
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Telefone:</span> <span className="text-gray-400 font-mono text-[10px]">{lead.phone}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 font-medium">Triado em:</span> <span className="text-gray-400">{lead.lastInteraction?.split(' ')[1] || '--'}</span></div>
                      </div>

                      <span className="block text-center text-[10px] font-bold text-red-400/70 uppercase tracking-widest py-1 bg-red-500/5 rounded-lg border border-red-500/10 select-none">
                        🚫 Não requer atendimento
                      </span>
                    </div>
                  ))}
                </KanbanColumn>

              </section>
            </div>
          )}

          {/* TAB 2: PAINEL DE OPERADORES */}
          {activeTab === 'operadores' && (
            <div className="space-y-6">
              <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Controle de Operadores Ativos</h3>
                
                <div className="overflow-hidden border border-gray-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1A1A24] text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Operador</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Leads Ativos</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50 text-sm">
                      {dynamicOperators.map((op, i) => (
                        <tr key={i} className="hover:bg-gray-800/20">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs border border-indigo-500/20">
                              {op.name.charAt(0)}
                            </div>
                            {op.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${op.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${op.status === 'Online' ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`}></span>
                              {op.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-300">{op.active} leads</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setOperators(prev => prev.map(o => o.name === op.name ? { ...o, status: o.status === 'Online' ? 'Offline' : 'Online' } : o));
                              }}
                              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-gray-700/50"
                            >
                              Alternar Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RELATÓRIOS (SVG CHARTS) */}
          {activeTab === 'relatorios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* FUNIL DE CONVERSÃO */}
              <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Funil de Conversão</h3>
                  <p className="text-xs text-gray-500">Taxa de conversão por estágio do CRM em tempo real</p>
                </div>
                
                {(() => {
                  const totalCount = leads.length;
                  const assumidosCount = leads.filter(l => l.status !== 'novo_lead').length;
                  const followUpCount = leads.filter(l => l.status === 'follow_up').length;
                  const consultaCount = leads.filter(l => l.status === 'consulta_marcada').length;
                  const fechadosCount = leads.filter(l => l.status === 'fechados').length;

                  const assumidosPercent = totalCount > 0 ? Math.round((assumidosCount / totalCount) * 100) : 0;
                  const followUpPercent = totalCount > 0 ? Math.round((followUpCount / totalCount) * 100) : 0;
                  const consultaPercent = totalCount > 0 ? Math.round((consultaCount / totalCount) * 100) : 0;
                  const fechadosPercent = totalCount > 0 ? Math.round((fechadosCount / totalCount) * 100) : 0;

                  return (
                    <div className="space-y-4">
                      <FunnelBar label="Entrada (Triagem)" value="100%" count={totalCount} percent={100} color="from-violet-500 to-indigo-500" />
                      <FunnelBar label="Assumidos" value={`${assumidosPercent}%`} count={assumidosCount} percent={assumidosPercent} color="from-sky-500 to-blue-500" />
                      <FunnelBar label="Follow-up" value={`${followUpPercent}%`} count={followUpCount} percent={followUpPercent} color="from-orange-500 to-yellow-500" />
                      <FunnelBar label="Consulta" value={`${consultaPercent}%`} count={consultaCount} percent={consultaPercent} color="from-violet-600 to-fuchsia-500" />
                      <FunnelBar label="Convertidos" value={`${fechadosPercent}%`} count={fechadosCount} percent={fechadosPercent} color="from-emerald-500 to-teal-500" />
                    </div>
                  );
                })()}
              </div>

              {/* CONVERSÃO POR OPERADOR */}
              <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Conversão por Operador</h3>
                  <p className="text-xs text-gray-500">Leads fechados (convertidos) em tempo real</p>
                </div>

                <div className="flex items-end justify-around h-48 pt-4">
                  {(() => {
                    const opsConversions = operators.map(op => {
                      const count = leads.filter(l => l.status === 'fechados' && l.operador === op.name).length;
                      return { name: op.name, count };
                    });
                    const maxVal = Math.max(...opsConversions.map(o => o.count), 1);
                    return opsConversions.map((c, i) => {
                      const heightPx = Math.max(16, (c.count / maxVal) * 128);
                      return (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <div className="text-xs font-bold text-white">{c.count} Fechados</div>
                          <div 
                            className={`w-16 bg-gradient-to-t ${i === 0 ? 'from-violet-600 to-indigo-600' : 'from-sky-600 to-blue-600'} rounded-t-xl shadow-lg transition-all duration-500`}
                            style={{ height: `${heightPx}px` }}
                          ></div>
                          <div className="text-xs font-semibold text-gray-400">{c.name}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ATENDIMENTO FOCADO (CHAT & CALL CENTER) */}
          {activeTab === 'atendimento' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-240px)]">
              {/* Lista de Leads Ativos (1/3) */}
              <div className="bg-[#0D0D12] border border-[#1C1C24] rounded-2xl p-6 flex flex-col h-full overflow-hidden">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Fila de Atendimento</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {leads.filter(l => l.status === 'novo_lead' || l.status === 'em_atendimento').map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedLead?.id === lead.id 
                        ? 'bg-[#181824] border-violet-500/40 text-white shadow-lg' 
                        : 'bg-[#12121A] border-[#1C1C28] hover:border-gray-800 text-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs">{lead.nome}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          lead.status === 'novo_lead' 
                          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {lead.status === 'novo_lead' ? '🤖 Lara' : '👤 Humano'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mb-2">{lead.phone}</p>
                      <div className="text-[10px] bg-indigo-500/5 text-indigo-400 px-2 py-1 rounded border border-indigo-500/10 truncate">
                        🩺 Doença: {lead.doenca}
                      </div>
                    </div>
                  ))}
                  {leads.filter(l => l.status === 'novo_lead' || l.status === 'em_atendimento').length === 0 && (
                    <p className="text-xs text-gray-600 italic text-center py-8">Nenhum lead ativo no momento.</p>
                  )}
                </div>
              </div>

              {/* Chat do WhatsApp Integrado (2/3) */}
              <div className="lg:col-span-2 bg-[#0D0D12] border border-[#1C1C24] rounded-2xl p-6 flex flex-col h-full overflow-hidden justify-between">
                {selectedLead && (selectedLead.status === 'novo_lead' || selectedLead.status === 'em_atendimento') ? (
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-900 mb-4 select-none">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-bold text-sm">
                          {selectedLead.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{selectedLead.nome}</h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              selectedLead.status === 'novo_lead' 
                              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {selectedLead.status === 'novo_lead' ? '🤖 Lara Ativa' : `👤 Humano (${selectedLead.operador || 'SHOCKWAVE'})`}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500">{selectedLead.phone}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedLead.status === 'novo_lead' && (
                          <button 
                            onClick={() => handleAssumeLead(selectedLead)}
                            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Assumir Lead
                          </button>
                        )}
                        <button 
                          onClick={() => handleWhatsAppClick(selectedLead)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <MessageCircle size={14} /> WhatsApp Web
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-950/80 border border-gray-900 rounded-2xl p-4 space-y-4 custom-scrollbar flex flex-col mb-4">
                      {selectedLead.historicoChat.map((chat, idx) => {
                        const isLara = chat.role === 'assistant';
                        return (
                          <div 
                            key={idx} 
                            className={`flex flex-col max-w-[80%] ${isLara ? 'self-start' : 'self-end'}`}
                          >
                            <div className={`p-3 rounded-2xl text-xs ${
                              isLara 
                              ? 'bg-[#181824] text-gray-200 rounded-tl-none border border-gray-800/50' 
                              : 'bg-emerald-600 text-white rounded-tr-none'
                            }`}>
                              {chat.content}
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono mt-1 px-1">
                              {isLara ? 'Lara 🤖' : 'Cliente 👤'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Escrever resposta simulada da Lara..." 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessageSimulator()}
                        className="flex-1 bg-[#12121A] border border-gray-800 rounded-xl px-3 py-2 text-xs focus:border-violet-500/50 outline-none text-white"
                      />
                      <button 
                        onClick={handleSendMessageSimulator}
                        className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl cursor-pointer flex items-center justify-center"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <MessageCircle size={48} className="text-gray-700 mb-3" />
                    <h4 className="text-sm font-bold text-gray-400">Canal de Atendimento Ativo</h4>
                    <p className="text-xs text-gray-600 max-w-[320px] mt-1">Selecione um contato na lista à esquerda para abrir a transcrição completa do chat.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: GESTÃO DE RETORNOS (FOLLOW-UP) */}
          {activeTab === 'follow_up' && (
            <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Fila de Retornos Comerciais (Follow-up)</h3>
                <p className="text-xs text-gray-500">Contatos agendados para retorno pela equipe de conversão</p>
              </div>

              <div className="space-y-4">
                {leads.filter(l => l.status === 'follow_up').map(lead => (
                  <div key={lead.id} className="p-4 bg-[#12121A] border border-[#1C1C28] rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-800 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{lead.nome}</span>
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] rounded-full font-bold">Retorno Vencendo</span>
                      </div>
                      <p className="text-xs text-indigo-300 font-semibold mb-1">Ação requerida: {lead.nextAction || 'Cobrar laudos'}</p>
                      <p className="text-[10px] text-gray-500">Responsável: {lead.operador || 'SHOCKWAVE'} • Telefone: {lead.phone}</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleWhatsAppClick(lead)}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Chamar no WhatsApp
                      </button>
                      <button 
                        onClick={() => updateLeadStatus(lead.id, 'consulta_marcada', { agendamento: 'Hoje às 16:30' })}
                        className="flex-1 md:flex-none px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Marcar Consulta
                      </button>
                    </div>
                  </div>
                ))}
                {leads.filter(l => l.status === 'follow_up').length === 0 && (
                  <div className="py-12 text-center text-gray-600 italic text-xs">
                    Nenhum retorno de follow-up pendente para hoje. Parabéns!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: AGENDA DE CONSULTAS */}
          {activeTab === 'agenda' && (
            <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Agenda de Consultas e Confirmações</h3>
                <p className="text-xs text-gray-500">Consultas marcadas com a Dra. Mônica Lucioli</p>
              </div>

              <div className="space-y-4">
                {leads.filter(l => l.status === 'consulta_marcada').map(lead => (
                  <div key={lead.id} className="p-4 bg-violet-500/[0.02] border border-violet-500/10 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-violet-500/20 transition-all">
                    <div>
                      <div className="text-xs text-highlight font-bold flex items-center gap-1 mb-1">
                        <Calendar size={14} />
                        <span>Agendado para: {lead.agendamento || 'Hoje às 15:00'}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white mb-1">{lead.nome}</h4>
                      <p className="text-[10px] text-gray-500 font-mono">Telefone: {lead.phone} • Especialista: Dra. Mônica Lucioli</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => updateLeadStatus(lead.id, 'fechados', { valorContrato: 4200, tipoBeneficio: 'Aposentadoria Invalidez' })}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Confirmar Fechamento
                      </button>
                      <button 
                        onClick={() => updateLeadStatus(lead.id, 'perdidos', { motivoPerda: 'Faltou na consulta' })}
                        className="flex-1 md:flex-none px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar Consulta
                      </button>
                    </div>
                  </div>
                ))}
                {leads.filter(l => l.status === 'consulta_marcada').length === 0 && (
                  <div className="py-12 text-center text-gray-600 italic text-xs">
                    Nenhuma consulta agendada na lista.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: CONFIGURAÇÕES */}
          {activeTab === 'configuracoes' && (
            <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-8">
              <div>
                <h3 className="text-lg font-bold text-white">Configurações do Robô Lara & CRM</h3>
                <p className="text-xs text-gray-500">Ajuste de parâmetros de triagem e inteligência operacional</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Parâmetros do Agente */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Identidade do Agente</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Nome do Robô no WhatsApp</label>
                      <input 
                        type="text" 
                        value="Lara" 
                        disabled
                        className="w-full bg-[#12121A] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-400 cursor-not-allowed outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">SLA Limite Crítico (Minutos)</label>
                      <input 
                        type="number" 
                        defaultValue={20} 
                        className="w-full bg-[#12121A] border border-gray-800 rounded-xl px-3 py-2.5 text-xs focus:border-violet-500/30 outline-none text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Score Configs */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Pesos do Score Previdenciário</h4>
                  
                  <div className="p-4 bg-gray-900/40 border border-gray-800/50 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between"><span>28+ anos de contribuição:</span> <span className="text-indigo-400 font-bold">+30 pontos</span></div>
                    <div className="flex justify-between"><span>Doença declarada:</span> <span className="text-indigo-400 font-bold">+25 pontos</span></div>
                    <div className="flex justify-between"><span>Acidente recente:</span> <span className="text-indigo-400 font-bold">+20 pontos</span></div>
                    <div className="flex justify-between"><span>Idade 50+:</span> <span className="text-indigo-400 font-bold">+15 pontos</span></div>
                    <div className="flex justify-between"><span>Resposta imediata:</span> <span className="text-indigo-400 font-bold">+10 pontos</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 3. PÁGINA INTERNA DO LEAD (GAVETA / DRAWER LATERAL) */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
            
            {/* Overlay de fechar */}
            <div className="absolute inset-0" onClick={() => setSelectedLead(null)}></div>

            <motion.div 
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#0A0A0F] w-full max-w-4xl h-full border-l border-[#1C1C24] flex flex-col justify-between shadow-2xl relative z-10"
            >
              
              {/* HEADER DO DRAWER */}
              <div className="p-6 border-b border-[#1C1C24] bg-[#0E0E14] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-600/10 rounded-2xl flex items-center justify-center text-highlight border border-violet-500/20">
                    <Users size={24} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedLead.nome}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{selectedLead.phone}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${getScoreBadgeStyle(selectedLead.scoreClass)}`}>
                        {selectedLead.scoreClass}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                >
                  Fechar (×)
                </button>
              </div>

              {/* CORPO DO DRAWER (DUAS COLUNAS) */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
                
                {/* COLUNA ESQUERDA (DADOS, TIMELINE, NOTAS) */}
                <div className="space-y-8">
                  
                  {/* ALERTA DE URGÊNCIA */}
                  {selectedLead.urgencia_detectada && (
                    <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-start gap-3 select-none">
                      <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">⚠️ Urgência Detectada</h4>
                        <p className="text-xs text-red-200 mt-1 font-semibold">{selectedLead.urgencia_detectada}</p>
                      </div>
                    </div>
                  )}

                  {/* DADOS PRINCIPAIS */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Triagem Universal</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <DetailBlock label="Idade" value={`${selectedLead.idade} anos`} />
                      <DetailBlock label="Contribuição INSS" value={selectedLead.tempo_contribuicao} />
                      <DetailBlock label="Histórico Acidente" value={selectedLead.acidente} />
                      <DetailBlock label="Doença / Lesão" value={selectedLead.doenca} />
                      {selectedLead.inss_laudos_medicos !== undefined && (
                        <DetailBlock
                          label="Laudo Médico"
                          value={selectedLead.inss_laudos_medicos
                            ? `Sim${selectedLead.inss_data_laudo ? ` — ${selectedLead.inss_data_laudo}` : ''}`
                            : 'Não possui'}
                        />
                      )}
                      {selectedLead.cidade && (
                        <DetailBlock label="Cidade / Estado" value={selectedLead.cidade} />
                      )}
                    </div>
                  </div>

                  {/* FLUXO ESPECÍFICO BPC/LOAS */}
                  {(selectedLead.fluxo_ativo === 'BPC_IDOSO' || selectedLead.fluxo_ativo === 'BPC_DEFICIENTE') && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                        Qualificação BPC/LOAS ({selectedLead.fluxo_ativo === 'BPC_IDOSO' ? 'Idoso' : 'Deficiente'})
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailBlock label="Moradores na Casa" value={selectedLead.bpc_pessoas_casa ? `${selectedLead.bpc_pessoas_casa} pessoa(s)` : 'Não informado'} />
                        <DetailBlock label="Parentesco" value={selectedLead.bpc_parentesco || 'Não informado'} />
                        <DetailBlock label="Quem tem renda" value={selectedLead.bpc_quem_renda || 'Não informado'} />
                        <DetailBlock label="Situação Imóvel" value={selectedLead.bpc_casa_alugada_propria || 'Não informado'} />
                        <DetailBlock label="Casa Equipada?" value={selectedLead.bpc_casa_equipada !== undefined ? (selectedLead.bpc_casa_equipada ? 'Sim' : 'Não') : 'Não informado'} />
                        <DetailBlock label="CadÚnico?" value={selectedLead.bpc_cad_unico !== undefined ? (selectedLead.bpc_cad_unico ? 'Sim' : 'Não') : 'Não informado'} />
                      </div>
                    </div>
                  )}

                  {/* FLUXO ESPECÍFICO INSS CONTRIBUTIVO */}
                  {selectedLead.fluxo_ativo === 'INSS_CONTRIBUTIVO' && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                        Qualificação INSS Contributivo
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailBlock label="Tempo de Carteira" value={selectedLead.inss_tempo_carteira || 'Não informado'} />
                        <DetailBlock label="Foi Autônomo?" value={selectedLead.inss_foi_autonomo !== undefined ? (selectedLead.inss_foi_autonomo ? 'Sim' : 'Não') : 'Não informado'} />
                        <DetailBlock label="Como Contribuiu?" value={selectedLead.inss_como_contribuiu || 'Não informado'} />
                        <DetailBlock label="Tem Laudos Médicos?" value={selectedLead.inss_laudos_medicos !== undefined ? (selectedLead.inss_laudos_medicos ? 'Sim' : 'Não') : 'Não informado'} />
                        <DetailBlock label="Data do Laudo" value={selectedLead.inss_data_laudo || 'Não informado'} />
                      </div>
                    </div>
                  )}

                  {/* FLUXO ESPECÍFICO APOSENTADORIA */}
                  {selectedLead.fluxo_ativo === 'APOSENTADORIA' && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                        Qualificação de Aposentadoria
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailBlock label="Tempo de INSS/Carteira" value={selectedLead.inss_tempo_carteira || 'Não informado'} />
                        <DetailBlock label="Histórico de Trabalho" value={selectedLead.retirement_work_history || 'Não informado'} />
                        <DetailBlock label="Trabalho Especial/Roça" value={selectedLead.retirement_special_rural || 'Não informado'} />
                        <DetailBlock label="Outros Períodos" value={selectedLead.retirement_other_periods || 'Não informado'} />
                        <DetailBlock label="Documentos em mãos?" value={selectedLead.tem_docs_em_maos !== undefined ? (selectedLead.tem_docs_em_maos ? 'Sim' : 'Não') : 'Não informado'} />
                      </div>
                    </div>
                  )}

                  {/* TIMELINE DO LEAD */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Timeline do Lead</h3>
                    
                    <div className="relative border-l border-gray-800 ml-3 pl-6 space-y-4">
                      {selectedLead.timeline.map((event, idx) => (
                        <div key={idx} className="relative group">
                          {/* Bolinha indicativa */}
                          <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-[#0A0A0F] group-hover:bg-violet-400 transition-all"></span>
                          <div className="text-[10px] text-gray-500 font-mono font-bold">{event.time}</div>
                          <div className="text-xs font-semibold text-gray-300 mt-0.5">{event.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NOTAS INTERNAS */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notas do Operador</h3>
                    
                    <div className="space-y-3">
                      {selectedLead.notes.map((note, idx) => (
                        <div key={idx} className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/50 text-xs text-gray-300">
                          {note}
                        </div>
                      ))}
                      {selectedLead.notes.length === 0 && (
                        <p className="text-xs text-gray-500 italic">Nenhuma observação interna adicionada ainda.</p>
                      )}

                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Adicionar nota interna..." 
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          className="flex-1 bg-[#12121A] border border-gray-800 rounded-xl px-3 py-2 text-xs focus:border-violet-500/50 outline-none text-white"
                        />
                        <button 
                          onClick={handleAddNote}
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* COLUNA DIREITA (SIMULADOR DE WHATSAPP REAL) */}
                <div className="border-l border-[#1C1C24] pl-0 lg:pl-8 flex flex-col h-[500px] lg:h-full justify-between">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-900">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico Completo (Lara)</h3>
                  </div>

                  {/* CHAT CONTAINER */}
                  <div className="flex-1 overflow-y-auto bg-gray-950/80 border border-gray-900 rounded-2xl p-4 space-y-4 custom-scrollbar flex flex-col">
                    {selectedLead.historicoChat.map((chat, idx) => {
                      const isLara = chat.role === 'assistant';
                      return (
                        <div 
                          key={idx} 
                          className={`flex flex-col max-w-[80%] ${isLara ? 'self-start' : 'self-end'}`}
                        >
                          <div className={`p-3 rounded-2xl text-xs ${
                            isLara 
                            ? 'bg-[#181824] text-gray-200 rounded-tl-none border border-gray-800/50' 
                            : 'bg-emerald-600 text-white rounded-tr-none'
                          }`}>
                            {chat.content}
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono mt-1 px-1">
                            {isLara ? 'Lara 🤖' : 'Cliente 👤'}
                          </span>
                        </div>
                      );
                    })}

                    {selectedLead.historicoChat.length === 0 && (
                      <p className="text-xs text-gray-600 text-center my-auto italic">Conversa indisponível no momento.</p>
                    )}
                  </div>

                  {/* CONTROLES DO SIMULADOR DE CHAT */}
                  <div className="flex gap-2 mt-4">
                    <input 
                      type="text" 
                      placeholder="Responder simulando a Lara..." 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessageSimulator()}
                      className="flex-1 bg-[#12121A] border border-gray-800 rounded-xl px-3 py-2 text-xs focus:border-violet-500/50 outline-none text-white"
                    />
                    <button 
                      onClick={handleSendMessageSimulator}
                      className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl cursor-pointer flex items-center justify-center"
                    >
                      <Send size={14} />
                    </button>
                  </div>

                </div>

              </div>

              {/* RODA PÉ RÁPIDO DO DRAWER (AÇÕES OPERACIONAIS) */}
              <div className="p-6 border-t border-[#1C1C24] bg-[#0E0E14] flex flex-wrap gap-3 justify-between items-center">
                
                {/* Mover Lead */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avançar Estágio:</span>
                  <select 
                    value={selectedLead.status} 
                    onChange={e => updateLeadStatus(selectedLead.id, e.target.value as Status)}
                    className="bg-[#12121A] border border-gray-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-violet-500/30 text-white"
                  >
                    <option value="novo_lead">Novos Leads</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="consulta_marcada">Consulta Marcada</option>
                    <option value="fechados">Fechado (Converteu)</option>
                    <option value="perdidos">Perdido (Reprovado)</option>
                    <option value="com_advogado">Já tem Advogado</option>
                  </select>
                </div>

                {/* Ações Rápidas */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAssumeLead(selectedLead)}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Assumir Lead
                  </button>
                  <button 
                    onClick={() => handleWhatsAppClick(selectedLead)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                  <button 
                    onClick={() => updateLeadStatus(selectedLead.id, 'perdidos', { motivoPerda: 'Sem interesse no momento' })}
                    className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reprovar Lead
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// --- Componentes Auxiliares do Painel ---

function SidebarButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        active 
        ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-400 border-l-4 border-violet-500 bg-[#161622]/40 shadow-sm' 
        : 'text-gray-400 hover:bg-gray-800/30 hover:text-white border-l-4 border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function KPICard({ label, value, trend, icon, color, onClick }: { label: string; value: number | string; trend: string; icon: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[#0D0D12] border border-[#1C1C24] p-5 rounded-2xl flex items-center justify-between shadow-xl transition-all select-none ${
        onClick 
          ? 'cursor-pointer hover:scale-[1.02] hover:border-violet-500/40 hover:bg-white/[0.02] active:scale-95 active:bg-white/[0.04]' 
          : 'hover:scale-[1.02] hover:border-gray-800'
      }`}
    >
      <div className="space-y-2">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">{label}</span>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold border border-emerald-500/10 inline-block select-none">{trend}</span>
      </div>
      <div className={`w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center border border-gray-800 ${color}`}>
        {icon}
      </div>
    </div>
  );
}

function KanbanColumn({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="w-80 shrink-0 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center mb-4 px-2 select-none">
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">{title}</h3>
        <span className="w-5 h-5 bg-[#12121A] text-gray-400 flex items-center justify-center text-[10px] font-bold rounded-lg border border-gray-800">{count}</span>
      </div>
      <div className="flex-1 bg-[#0A0A0F]/60 border border-[#1C1C24] rounded-2xl p-3 overflow-y-auto space-y-4 custom-scrollbar select-none">
        {children}
        {count === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-600 text-xs italic">
            Nenhum lead nesta coluna.
          </div>
        )}
      </div>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-900/40 border border-gray-800/50 rounded-xl space-y-1">
      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function FunnelBar({ label, value, count, percent, color }: { label: string; value: string; count: number; percent: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold text-gray-400 select-none">
        <span>{label} ({count} leads)</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="w-full bg-gray-900 h-6 rounded-lg overflow-hidden border border-gray-800">
        <div 
          style={{ width: `${percent}%` }}
          className={`h-full bg-gradient-to-r transition-all duration-1000 flex items-center px-3 text-[10px] font-bold text-black select-none ${color}`}
        >
          {percent >= 15 && `${percent}%`}
        </div>
      </div>
    </div>
  );
}

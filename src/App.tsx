/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Tipos ---

type Score = 'Alto' | 'Médio' | 'Baixo';
type Status = 'Aguardando' | 'Encaminhado' | 'Reprovado' | 'Em Triagem';

interface Lead {
  id: string;
  nome: string;
  idade: number;
  telefone: string;
  renda: number;
  membros: number;
  temBeneficio: boolean;
  temDocs: boolean;
  score: Score;
  status: Status;
  dataCriacao: string;
}

// --- Dados Mockados ---

const INITIAL_LEADS: Lead[] = [
  {
    id: '1',
    nome: 'Maria dos Santos',
    idade: 67,
    telefone: '(11) 98765-4321',
    renda: 450,
    membros: 1,
    temBeneficio: false,
    temDocs: true,
    score: 'Alto',
    status: 'Aguardando',
    dataCriacao: '2024-05-08 14:30'
  },
  {
    id: '2',
    nome: 'João Oliveira',
    idade: 65,
    telefone: '(21) 97777-8888',
    renda: 300,
    membros: 2,
    temBeneficio: false,
    temDocs: true,
    score: 'Alto',
    status: 'Aguardando',
    dataCriacao: '2024-05-08 15:10'
  },
  {
    id: '3',
    nome: 'Antonia Ferreira',
    idade: 66,
    telefone: '(31) 96666-5555',
    renda: 600,
    membros: 2,
    temBeneficio: false,
    temDocs: false,
    score: 'Médio',
    status: 'Aguardando',
    dataCriacao: '2024-05-08 16:20'
  },
  {
    id: '4',
    nome: 'Raimundo Nonato',
    idade: 68,
    telefone: '(85) 95555-4444',
    renda: 550,
    membros: 3,
    temBeneficio: false,
    temDocs: true,
    score: 'Médio',
    status: 'Aguardando',
    dataCriacao: '2024-05-08 17:05'
  },
  {
    id: '5',
    nome: 'José Silva',
    idade: 65,
    telefone: '(11) 94444-3333',
    renda: 1412,
    membros: 1,
    temBeneficio: false,
    temDocs: true,
    score: 'Baixo',
    status: 'Reprovado',
    dataCriacao: '2024-05-08 10:20'
  },
  {
    id: '6',
    nome: 'Francisca Pereira',
    idade: 70,
    telefone: '(41) 93333-2222',
    renda: 400,
    membros: 2,
    temBeneficio: false,
    temDocs: false,
    score: 'Alto',
    status: 'Em Triagem',
    dataCriacao: '2024-05-08 18:45'
  }
];

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
    
    // Inscrição em tempo real para atualizações automáticas
    const channel = supabase
      .channel('sofia_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sofia_sessions' 
      }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('sofia_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const formattedLeads: Lead[] = data.map((item: any) => {
        const userData = item.user_data || {};
        
        // Extração de números de strings (ex: "68 anos" -> 68)
        const parseNumber = (val: any) => {
          if (!val) return 0;
          const num = parseInt(String(val).replace(/\D/g, ''), 10);
          return isNaN(num) ? 0 : num;
        };

        const age = parseNumber(userData.idade_tempo);
        const income = parseNumber(userData.renda);
        const hasBenefit = userData.temBeneficio || false;

        // --- SCORE BPC REAL ---
        let score: Score = 'Baixo';
        if (age >= 65 && income <= 353 && !hasBenefit) score = 'Alto';
        else if (age >= 65 || (income <= 500 && !hasBenefit)) score = 'Médio';

        let currentStatus: Status = item.step === 'finished' ? 'Aguardando' : 'Em Triagem';
        if (userData.status_final) currentStatus = userData.status_final;

        return {
          id: item.id.toString(),
          nome: userData.nome_usuario || 'Lead em andamento',
          idade: age,
          telefone: item.phone,
          renda: income,
          membros: userData.membros || 1,
          temBeneficio: hasBenefit,
          temDocs: userData.temDocs || false,
          score: score,
          status: currentStatus,
          dataCriacao: new Date(item.created_at).toLocaleString('pt-BR'),
          raw_user_data: userData // Armazenar para updates
        };
      });
      setLeads(formattedLeads);
    }
    setLoading(false);
  }

  const handleAction = async (id: string, newStatus: Status) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    const { error } = await supabase
      .from('sofia_sessions')
      .update({ 
        user_data: { 
          ...(lead as any).raw_user_data,
          status_final: newStatus 
        } 
      })
      .eq('id', id);

    if (!error) {
      fetchLeads();
      if (selectedLead?.id === id) setSelectedLead(null);
    }
  };

  // --- Estatísticas ---
  const stats = useMemo(() => {
    return {
      total: leads.length,
      aprovados: leads.filter(l => l.status === 'Encaminhado').length,
      reprovados: leads.filter(l => l.status === 'Reprovado').length,
      emTriagem: leads.filter(l => l.status === 'Em Triagem' || (l.status === 'Aguardando' && l.score !== 'Baixo')).length
    };
  }, [leads]);

  const exportCSV = () => {
    const headers = ['Nome', 'Idade', 'Telefone', 'Renda', 'Score', 'Status'];
    const rows = leads.map(l => [l.nome, l.idade, l.telefone, l.renda, l.score, l.status]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'leads_bpc_triagem.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-highlight flex items-center gap-2">
            <span className="w-8 h-8 bg-highlight rounded-lg flex items-center justify-center text-black">
              <UserCheck size={20} />
            </span>
            BPC Triagem
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestão de leads pré-qualificados pelo agente</p>
        </div>

        <div className="grid grid-cols-2 md:flex items-center gap-4 w-full md:w-auto">
          <StatCard label="Total Leads" value={stats.total} icon={<Users size={16} />} color="text-blue-400" />
          <StatCard label="Encaminhados" value={stats.aprovados} icon={<CheckCircle2 size={16} />} color="text-highlight" />
          <StatCard label="Reprovados" value={stats.reprovados} icon={<XCircle size={16} />} color="text-red-400" />
          <StatCard label="Em Triagem" value={stats.emTriagem} icon={<Clock size={16} />} color="text-yellow-400" />
          
          <button 
            onClick={exportCSV}
            className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 transition-colors rounded-xl text-sm font-medium border border-gray-700"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </header>

      {/* TABLE SECTION */}
      <main className="flex-1 bg-[#121216] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-gray-800 bg-[#1A1A1E]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Idade</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Renda p/c</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Membros</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Já tem?</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Docs?</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">{lead.nome}</td>
                  <td className="px-6 py-4 text-gray-300">{lead.idade} anos</td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">{lead.telefone}</td>
                  <td className="px-6 py-4 text-center text-gray-300">R$ {lead.renda}</td>
                  <td className="px-6 py-4 text-center text-gray-300">{lead.membros}</td>
                  <td className="px-6 py-4 text-center">
                    <BooleanBadge value={lead.temBeneficio} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <BooleanBadge value={lead.temDocs} />
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedLead(lead)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                        title="Ver detalhes"
                      >
                        <Info size={18} />
                      </button>
                      {lead.status !== 'Encaminhado' && lead.status !== 'Reprovado' && lead.status !== 'Em Triagem' && (
                        <button 
                        onClick={() => handleAction(lead.id, 'Encaminhado')}
                          className="p-2 text-highlight hover:bg-highlight/10 rounded-lg transition-all"
                          title="Encaminhar"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-6 text-center text-gray-500 text-xs flex justify-between items-center">
        <span>© 2024 BPC Triagem Dashboard • Sistema de Operação Analítica</span>
        <span className="flex items-center gap-1">Status do servidor: <span className="w-2 h-2 rounded-full bg-highlight animate-pulse"></span> Online</span>
      </footer>

      {/* MODAL DETALHES */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1A1A1E] w-full max-w-2xl rounded-3xl border border-gray-800 overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-highlight">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedLead.nome}</h2>
                    <p className="text-gray-400 text-xs">ID do Lead: {selectedLead.id} • Criado em {selectedLead.dataCriacao}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Informações do Lead</h3>
                  
                  <div className="space-y-4">
                    <InfoRow icon={<Phone size={14} />} label="WhatsApp" value={selectedLead.telefone} />
                    <InfoRow icon={<Users size={14} />} label="Idade" value={`${selectedLead.idade} anos`} />
                    <InfoRow icon={<Wallet size={14} />} label="Renda per capita" value={`R$ ${selectedLead.renda}`} />
                    <InfoRow icon={<Users size={14} />} label="Grupo Familiar" value={`${selectedLead.membros} pessoas`} />
                    <InfoRow icon={<CheckCircle2 size={14} />} label="Possui Benefício?" value={selectedLead.temBeneficio ? "Sim" : "Não"} />
                    <InfoRow icon={<FileText size={14} />} label="Documentação" value={selectedLead.temDocs ? "Completa" : "Pendente"} />
                  </div>

                  <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-medium text-gray-400">Score de Qualificação</span>
                       <ScoreBadge score={selectedLead.score} />
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          selectedLead.score === 'Alto' ? 'w-[90%] bg-highlight' : 
                          selectedLead.score === 'Médio' ? 'w-[55%] bg-yellow-400' : 'w-[25%] bg-red-400'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Checklist de Triagem</h3>
                  
                  <div className="space-y-3">
                    <CheckItem label="Critério de Idade (65+)" checked={selectedLead.idade >= 65} />
                    <CheckItem label="Limite de Renda (1/4 Salário)" checked={selectedLead.renda <= 1412 / 4} />
                    <CheckItem label="Não possui outro benefício" checked={!selectedLead.temBeneficio} />
                    <CheckItem label="Dados de contato validados" checked={true} />
                    <CheckItem label="Interesse confirmado via WPP" checked={true} />
                    <CheckItem label="Documentação mínima (RG/CPF)" checked={selectedLead.temDocs} />
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      disabled={selectedLead.status === 'Encaminhado'}
                      onClick={() => handleAction(selectedLead.id, 'Encaminhado')}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                        selectedLead.status === 'Encaminhado' 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                        : 'bg-highlight text-black hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <UserPlus size={18} />
                      {selectedLead.status === 'Encaminhado' ? 'Já Encaminhado' : 'Encaminhar para Especialista'}
                    </button>
                    
                    <button 
                      disabled={selectedLead.status === 'Reprovado'}
                      onClick={() => handleAction(selectedLead.id, 'Reprovado')}
                      className={`w-full py-4 rounded-2xl font-bold border flex items-center justify-center gap-2 transition-all ${
                         selectedLead.status === 'Reprovado'
                         ? 'border-gray-800 bg-gray-900/50 text-gray-600'
                         : 'border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <XCircle size={18} />
                      Reprovar Lead
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Componentes Auxiliares ---

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-[#121216] border border-gray-800 p-4 rounded-xl flex items-center gap-3 shadow-lg min-w-[120px]">
      <div className={`w-10 h-10 rounded-lg bg-gray-800/80 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: Score }) {
  const styles = {
    Alto: 'bg-highlight/10 text-highlight border-highlight/30',
    Médio: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
    Baixo: 'bg-red-400/10 text-red-400 border-red-400/30'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider ${styles[score]}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles = {
    Aguardando: 'bg-blue-400/10 text-blue-400',
    Encaminhado: 'bg-highlight/20 text-highlight border border-highlight/40',
    Reprovado: 'bg-red-400/10 text-red-400',
    'Em Triagem': 'bg-gray-700 text-gray-400'
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${value ? 'bg-highlight' : 'bg-red-500 opacity-40'}`}></span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-300 transition-colors">
        <span className="p-1 bg-gray-800 rounded">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-200">{value}</div>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string, checked: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-gray-800/50 transition-colors hover:border-gray-700">
      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${checked ? 'bg-highlight' : 'bg-gray-800 border border-gray-700'}`}>
        {checked && <CheckCircle2 size={14} className="text-black" />}
      </div>
      <span className={`text-sm ${checked ? 'text-gray-200' : 'text-gray-500 line-through decoration-gray-700'}`}>{label}</span>
    </div>
  );
}

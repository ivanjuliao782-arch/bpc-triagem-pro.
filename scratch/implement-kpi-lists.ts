import fs from 'fs';
import path from 'path';

const appPath = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\App.tsx';

function runReplacement() {
  if (!fs.existsSync(appPath)) {
    console.error('App.tsx not found');
    return;
  }

  let content = fs.readFileSync(appPath, 'utf8');

  // 1. Update SidebarTab type
  content = content.replace(
    `type SidebarTab = 'dashboard' | 'leads' | 'atendimento' | 'follow_up' | 'agenda' | 'operadores' | 'relatorios' | 'configuracoes';`,
    `type SidebarTab = 'dashboard' | 'leads' | 'atendimento' | 'follow_up' | 'agenda' | 'operadores' | 'relatorios' | 'configuracoes' | 'conversoes' | 'leads_hoje';`
  );

  // 2. Add state variable inside export default function App()
  const appStart = `export default function App() {`;
  if (content.includes(appStart) && !content.includes('atendimentoFilter')) {
    content = content.replace(
      appStart,
      `export default function App() {\n  const [atendimentoFilter, setAtendimentoFilter] = useState<'todos' | 'novo_lead' | 'em_atendimento'>('todos');`
    );
  }

  // 3. Update onClick handlers for KPI Cards
  // Leads Hoje
  content = content.replace(
    /<KPICard\s+label="Leads Hoje"[\s\S]*?onClick=\{\(\) => setActiveTab\('leads_hoje'\)\}/,
    `<KPICard \n                  label="Leads Hoje" \n                  value={kpis.total} \n                  trend="+12%" \n                  icon={<Users size={16} />} \n                  color="text-indigo-400" \n                  onClick={() => setActiveTab('leads_hoje')}`
  );
  // Just in case it's still 'leads'
  content = content.replace(
    /<KPICard\s+label="Leads Hoje"[\s\S]*?onClick=\{\(\) => setActiveTab\('leads'\)\}/,
    `<KPICard \n                  label="Leads Hoje" \n                  value={kpis.total} \n                  trend="+12%" \n                  icon={<Users size={16} />} \n                  color="text-indigo-400" \n                  onClick={() => setActiveTab('leads_hoje')}`
  );

  // Aguardando
  content = content.replace(
    /<KPICard\s+label="Aguardando"[\s\S]*?onClick=\{\(\) => setActiveTab\('atendimento'\)\}/,
    `<KPICard \n                  label="Aguardando" \n                  value={kpis.awaiting} \n                  trend="Fila" \n                  icon={<AlertTriangle size={16} />} \n                  color="text-yellow-400" \n                  onClick={() => { setActiveTab('atendimento'); setAtendimentoFilter('novo_lead'); }}`
  );

  // Em Atendimento
  content = content.replace(
    /<KPICard\s+label="Em Atendimento"[\s\S]*?onClick=\{\(\) => setActiveTab\('atendimento'\)\}/,
    `<KPICard \n                  label="Em Atendimento" \n                  value={kpis.inProgress} \n                  trend="Ativos" \n                  icon={<UserCheck size={16} />} \n                  color="text-sky-400" \n                  onClick={() => { setActiveTab('atendimento'); setAtendimentoFilter('em_atendimento'); }}`
  );

  // Conversões
  content = content.replace(
    /label="Conversões"[\s\S]*?onClick=\{\(\) => setActiveTab\('relatorios'\)\}/,
    `label="Conversões"\n                  value={kpis.closed}\n                  trend="Fechados"\n                  icon={<CheckCircle2 size={16} />}\n                  color="text-emerald-400"\n                  onClick={() => setActiveTab('conversoes')}`
  );

  // 4. Update the atendimento tab filter bar and map loop
  const listTitleTarget = `<h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Fila de Atendimento</h3>`;
  const listTitleReplacement = `<h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Fila de Atendimento</h3>\n                <div className="flex gap-1.5 mb-4 select-none">\n                  <button \n                    onClick={() => setAtendimentoFilter('todos')} \n                    className={\`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer \${atendimentoFilter === 'todos' ? 'bg-violet-600 text-white border border-violet-500' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-300'}\`}\n                  >\n                    Todos\n                  </button>\n                  <button \n                    onClick={() => setAtendimentoFilter('novo_lead')} \n                    className={\`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer \${atendimentoFilter === 'novo_lead' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-300'}\`}\n                  >\n                    🤖 Fila (Aguardando)\n                  </button>\n                  <button \n                    onClick={() => setAtendimentoFilter('em_atendimento')} \n                    className={\`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer \${atendimentoFilter === 'em_atendimento' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-300'}\`}\n                  >\n                    👤 Ativos\n                  </button>\n                </div>`;

  if (content.includes(listTitleTarget)) {
    content = content.replace(listTitleTarget, listTitleReplacement);
  }

  // Update map filters in atendimento
  content = content.replace(
    `{leads.filter(l => l.status === 'novo_lead' || l.status === 'em_atendimento').map(lead => (`,
    `{leads.filter(l => {
                      if (atendimentoFilter === 'novo_lead') return l.status === 'novo_lead';
                      if (atendimentoFilter === 'em_atendimento') return l.status === 'em_atendimento';
                      return l.status === 'novo_lead' || l.status === 'em_atendimento';
                    }).map(lead => (`
  );

  content = content.replace(
    `{leads.filter(l => l.status === 'novo_lead' || l.status === 'em_atendimento').length === 0 && (`,
    `{leads.filter(l => {
                    if (atendimentoFilter === 'novo_lead') return l.status === 'novo_lead';
                    if (atendimentoFilter === 'em_atendimento') return l.status === 'em_atendimento';
                    return l.status === 'novo_lead' || l.status === 'em_atendimento';
                  }).length === 0 && (`
  );

  // 5. Add conversoes and leads_hoje tabs before the last main tag closing
  const mainClosingTarget = `</main>`;
  const newTabsCode = `
          {/* TAB 8: CONVERSÕES (FECHADOS) */}
          {activeTab === 'conversoes' && (
            <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">🏆</span> Leads Convertidos com Sucesso
                </h3>
                <p className="text-xs text-gray-500">Histórico de contratos fechados e encaminhados pela equipe</p>
              </div>

              <div className="space-y-4">
                {leads.filter(l => l.status === 'fechados').map(lead => (
                  <div key={lead.id} className="p-4 bg-[#12121A] border border-[#1C1C28] rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-800 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{lead.nome}</span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-bold">Convertido</span>
                      </div>
                      <p className="text-xs text-indigo-300 font-semibold mb-1">Benefício: {lead.tempo_contribuicao} • Valor: R$ {lead.valorContrato || '4.200,00'}</p>
                      <p className="text-[10px] text-gray-500">Responsável: {lead.operador || 'Sem operador'} • Telefone: {lead.phone}</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleWhatsAppClick(lead)}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Falar no WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
                {leads.filter(l => l.status === 'fechados').length === 0 && (
                  <div className="py-12 text-center text-gray-600 italic text-xs">
                    Nenhum lead convertido até o momento.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: LEADS HOJE */}
          {activeTab === 'leads_hoje' && (
            <div className="bg-[#0D0D12] border border-[#1C1C24] p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">📅</span> Leads Recebidos Hoje
                </h3>
                <p className="text-xs text-gray-500">Todos os contatos que iniciaram a triagem nas últimas 24 horas</p>
              </div>

              <div className="space-y-4">
                {leads.filter(l => {
                  const d = new Date(l.horario_entrada);
                  const today = new Date();
                  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                }).map(lead => (
                  <div key={lead.id} className="p-4 bg-[#12121A] border border-[#1C1C28] rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-800 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{lead.nome}</span>
                        <span className={\`px-2 py-0.5 text-[9px] rounded-full font-bold border \${getScoreBadgeStyle(lead.scoreClass)}\`}>
                          {lead.scoreClass} ({lead.scoreValue} pts)
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 font-semibold mb-1">Status: {lead.status?.replace('_', ' ') || 'Novo lead'}</p>
                      <p className="text-[10px] text-gray-500">Telefone: {lead.phone} • Entrada: {new Date(lead.horario_entrada).toLocaleString('pt-BR')}</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleWhatsAppClick(lead)}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Falar no WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
                {leads.filter(l => {
                  const d = new Date(l.horario_entrada);
                  const today = new Date();
                  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                }).length === 0 && (
                  <div className="py-12 text-center text-gray-600 italic text-xs">
                    Nenhum lead recebido hoje até o momento.
                  </div>
                )}
              </div>
            </div>
          )}
  `;

  // Find the LAST </main> and insert before it
  const lastMainIndex = content.lastIndexOf(mainClosingTarget);
  if (lastMainIndex !== -1 && !content.includes("activeTab === 'conversoes'")) {
    content = content.substring(0, lastMainIndex) + newTabsCode + content.substring(lastMainIndex);
    fs.writeFileSync(appPath, content, 'utf8');
    console.log('✅ App.tsx tabs successfully injected!');
  } else {
    console.log('App.tsx already has the new tabs or last </main> not found.');
  }
}

runReplacement();

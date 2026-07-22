---
name: dashboard-crm-bpc
description: >-
  Manual e documentação da estrutura do painel administrativo (Dashboard/CRM),
  cobrindo a visualização do funil Kanban, cálculo de scores, exibição de leads e implantação.
---

# Lara CRM - Painel Administrativo (Dashboard)

Este documento atua como guia de arquitetura e referência de desenvolvimento para o Dashboard do projeto **BPC Triagem Pro**.

---

## 1. Estrutura do Painel (React + Tailwind CSS)
O frontend é construído em React (`src/App.tsx`) e usa Tailwind CSS para uma estilização moderna com tema escuro premium. A interface contém os seguintes elementos principais:

*   **Responsividade Móvel Completa**: Viewport dinâmica que redimensiona a interface para celulares e PCs. Possui menu hambúrguer interativo (☰) no cabeçalho mobile para abrir a gaveta lateral (drawer) de navegação sem poluir a tela.
*   **Indicadores de Performance (Cards de Topo)**:
    *   *Leads Hoje*: Total de triagens iniciadas/concluídas no dia.
    *   *Aguardando*: Leads na fila aguardando resposta humana.
    *   *Em Atendimento*: Atendimentos ativos por operadores.
    *   *Conversões*: Contratos fechados.
    *   *SLA Médio*: Tempo médio de resposta do escritório.
*   **Funil Kanban**: Dividido em 7 estágios (`Novo Lead`, `Em Atendimento`, `Follow-up`, `Consulta Marcada`, `Fechado`, `Perdido`, `Com Advogado`). Suporta rolagem horizontal nativa com gestos no mobile.
*   **Sidebar de Detalhes do Lead**:
    *   Exibe dados coletados organizados por categoria (Triagem Universal, Qualificação BPC, Qualificação INSS, Qualificação Aposentadoria, Vínculo de Advogado).
    *   Timeline cronológica dos eventos da FSM.
    *   Acesso ao chat em tempo real com o lead via WhatsApp.
*   **Aba de Configurações (Settings)**:
    *   Configuração do SLA crítico e exibição dos cartões de pesos de score previdenciário para os 3 funis do sistema.

---

## 2. Lógica de Score e Classificação no Dashboard
O score previdenciário de cada lead é calculado e classificado no client-side usando a biblioteca unificada compartilhado (`src/lib/score.ts`), garantindo consistência com o robô (servidor):

*   **Cálculo Dinâmico**: Durante a triagem, o painel recalcula o score na tela em tempo real à medida que as respostas chegam do WhatsApp. O score gravado no banco de dados só atua como override estático quando o estado da triagem for `FINISHED` (e não for lead recuperável).

### Classificação Visual
*   🔥 **Quente** (Score $\ge 70$): Alta probabilidade de vitória e intenção imediata.
*   🟡 **Morno** (Score entre 40 e 69): Qualificação intermediária.
*   ❄️ **Frio** (Score $< 40$): Qualificação baixa ou leads com advogado não recuperáveis.

### Regras do Score por Funil (Unificadas em `src/lib/score.ts`)

#### 1. Funil de Aposentadoria / INSS Regular
*   *Contribuição*: $\ge 28$ anos (+40 pts) | entre 15 e 27 anos (+25 pts) (analisa tanto `tempo_contribuicao` quanto `inss_tempo_carteira`).
*   *Idade*: $\ge 60$ anos (+20 pts) | entre 55 e 59 anos (+15 pts).
*   *Sem advogado*: +15 pts.
*   *Trabalho com registro*: +10 pts.
*   *Trabalho especial ou rural*: +20 pts.
*   *Documentos em mãos*: +10 pts.

#### 2. Funil de BPC/LOAS (Assistencial)
*   *Idade*: $\ge 65$ anos (+40 pts).
*   *Nunca contribuiu para o INSS*: +20 pts.
*   *Renda per capita baixa (Bolsa Família, sem renda, etc)*: +20 pts.
*   *Mora sozinho / família de baixa renda*: +10 pts.
*   *CadÚnico ativo*: +10 pts.
*   *Doença ou limitação grave*: +15 pts.
*   *Deficiência*: +20 pts.
*   *Acamado ou dependente*: +25 pts.

#### 3. Funil de INSS por Incapacidade (Auxílio-doença)
*   *Qualidade de segurado*: Contribuindo atualmente (+30 pts) | Já contribuiu no passado (+15 pts).
*   *Doença ou limitação grave*: +30 pts.
*   *Possui laudos médicos*: +20 pts.
*   *Sem advogado*: +20 pts.

---

## 3. Tratamento de Leads com Advogado
O dashboard trata o status e o score do lead de forma diferenciada dependendo da sua classificação ética:

*   **Leads Não Recuperáveis** (`is_recoverable: false`):
    *   O score é automaticamente zerado (0 pts).
    *   O lead é categorizado como **Frio**.
    *   O Kanban move o card automaticamente para a coluna **Com Advogado**.
*   **Leads Recuperáveis / Leads de Ouro** (`is_recoverable: true`):
    *   O score e a qualificação original são mantidos (não é zerado).
    *   O card entra na coluna **Novos Leads** com prioridade de atendimento humano.
    *   A seção *"Vínculo com Advogado Anterior"* destaca na tela: `Recuperável? Sim (Lead Quente!)` e exibe o estado das assinaturas de Contrato e Procuração.

---

## 4. Comandos de Compilação e Implantação
Para fazer alterações no dashboard e testá-lo:

1.  **Verificar Tipos e Compilação**:
    ```bash
    npx tsc --noEmit
    ```
2.  **Verificar Build de Produção**:
    ```bash
    npm run build
    ```
3.  **Enviar alterações**:
    Pushes para a branch `main` no GitHub disparam automaticamente a compilação e deploy na Vercel.

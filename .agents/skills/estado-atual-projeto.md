---
name: estado-atual-projeto
description: >-
  Documentação e guia do estado atual de desenvolvimento do robô Lara (SofiaEngine)
  e do Dashboard/CRM, consolidado com todas as melhorias e correções até 25/07/2026.
---

# Estado Atual do Projeto - Lara CRM & SofiaEngine

Este documento consolida o estado técnico atual de desenvolvimento do projeto **BPC Triagem Pro** (atualizado em 25/07/2026). Serve de referência rápida e instrução para qualquer agente que precise atuar no código.

---

## 1. Arquitetura Geral

O projeto é dividido em três camadas principais:
1.  **Motor Conversacional (`src/sofia.ts`)**: Controla a FSM (Finite State Machine), a extração híbrida de dados (RegEx + LLM) e as respostas automáticas da atendente virtual **Lara**.
2.  **Integração do WhatsApp (`conectar-baileys.ts`)**: Executa a escuta do WhatsApp via Baileys, gerencia debounce de mensagens, de-duplicação de eventos e as rotinas de follow-up por inatividade.
3.  **Dashboard Administrativo (`src/App.tsx` & `src/main.tsx`)**: Painel de CRM em React + Tailwind CSS estruturado em formato de funil Kanban, com timeline de eventos, chat em tempo real e visualização de pesos do score.

---

## 2. Motor de Conversa (SofiaEngine FSM)

A triagem é guiada deterministicamente por estados. As principais características e melhorias ativas são:

### Tratamento Precoce de Dúvidas (Bypass de Sessão Vazia)
*   **Guarda de Honorários e Endereço**: Os filtros determinísticos `detectarPerguntaValor` e `detectarPerguntaEndereco` rodam no início de `processMessage`, antes do bloco `if (!session)`.
*   Isso garante que se a primeira mensagem de um lead (gerada por botões ou links de campanha, ex: *"Eu vou ter que pagar para ser atendido?"*) contiver termos de preço ou localização, a Lara responde o esclarecimento de forma amigável e, na mesma mensagem, emenda o fluxo inicial da triagem pedindo o nome do usuário.
*   **Mensagem de Gratuidade de Consulta**: A resposta sobre valores foi atualizada para indicar explicitamente que a primeira consulta é totalmente gratuita.
*   **Expressão Regular de Valores**: O método `detectarPerguntaValor` foi atualizado para capturar variações verbais complexas de "pagar" como typos de digitação: `pegar pelo`, `pegar para`, `pegar por`, além de `pagar`, `pagamentos`, `cobranca`, `taxas`, etc.

### Prevenção de Pergunta Redundante de Contribuição
*   **Fallback Inteligente**: Se o lead relata trabalhar atualmente (`trabalha_atualmente === true`) mas o regime (formal/informal) for indefinido na mensagem inicial, o sistema assume preventivamente `esta_contribuindo_atualmente = true`.
*   Com isso, a FSM pula o estado redundante `AWAITING_CURRENT_CONTRIBUTION` (que perguntava *"Como está sua rotina de trabalho?"*) e avança direto para as perguntas específicas do funil.

### Tratamento de Advogado Anterior (Código de Ética)
*   **Leads Não Recuperáveis**: Se o lead possuir processo na Justiça, assinou contrato e assinou procuração com outro advogado, ele é marcado como `is_recoverable: false`, recebe mensagem ética de despedida, tem o score zerado e vai para a coluna **Com Advogado**.
*   **Leads Recuperáveis**: Se possuir advogado mas o pedido estiver travado apenas no INSS e sem contrato firmado, ele é marcado como `is_recoverable: true`, recebe mensagem de transição de autoridade e segue a triagem com score normal.

---

## 3. CRM Dashboard & Sincronização

A interface administrativa é adaptada para telas móveis e desktop, apresentando:
*   **Menu Hambúrguer Lateral**: Exibe a gaveta (drawer) de navegação em celulares de forma limpa.
*   **Deduplicação de Cards**: Função `fetchLeads` no frontend deduplica registros por número de telefone antes de renderizar no Kanban.
*   **Cálculo Dinâmico de Score**: Classificação por cores (Quente 🔥 $\ge 70$, Morno 🟡 $40$-$69$, Frio ❄️ $< 40$) é recalculada no client-side em tempo real.
*   **Handoff / Mutar Bot**: Ao clicar em **"Assumir Lead"**, a flag `status` vai para `'em_atendimento'`. O robô WhatsApp identifica essa flag no banco e silencia imediatamente (`return null`) para aquele cliente.
*   **Rolagem Vertical em Celular**: O contêiner do dashboard permite rolagem vertical no mobile (`overflow-y-auto md:overflow-hidden` no `main`) e as colunas do Kanban possuem altura adaptada (`h-[500px] md:h-full`), permitindo visualizar a seção de métricas e o Kanban completos no celular ao rolar a página para baixo.

---

## 4. Comandos e Rotinas Operacionais

### Backup e Restauração
Caso precise restaurar o sistema após um desligamento ou instabilidade:
```bash
# Restaurar os arquivos estáveis do backup local
npx tsx restaurar-backup.ts

# Limpar sessões de teste para reiniciar a triagem
npx tsx clean_session.ts
```

### Inicialização do Robô
```bash
# Iniciar escuta do Baileys/WhatsApp
npx tsx conectar-baileys.ts
```

### Verificação de Tipos e Build (TypeScript)
```bash
npx tsc --noEmit
npm run build
```

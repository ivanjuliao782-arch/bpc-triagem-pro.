---
name: restaurar-estado-bpc
description: >-
  Restaura o projeto BPC Triagem Pro exatamente para o estado estável atual (22/07/2026)
  contendo o fluxo responsivo do Dashboard, o motor da Lara com a trava de score para
  leads recuperáveis e o fallback de IA para mensagens longas (>20 palavras).
---

# Restaurar Estado do Projeto BPC

## Visão Geral
Esta skill descreve como restaurar todos os arquivos do projeto para o estado estável e funcional atual (atualizado em 22/07/2026). Use-a se houver queda de energia, queda de internet, travamentos locais ou se precisar reiniciar a operação do zero.

## Como Restaurar o Projeto de um Apagão

Caso sua máquina local desligue ou perca a conexão, execute as etapas abaixo:

### 1. Restaurar os Arquivos do Backup Local
Restaure todos os arquivos de código estáveis (`src/sofia.ts`, `src/App.tsx`, `conectar-baileys.ts`, etc.) a partir da pasta `/backups`:
```bash
npx tsx restaurar-backup.ts
```

### 2. Limpar Sessões de Teste Anteriores
Para que o banco de dados comece limpo sem resíduos de testes:
```bash
npx tsx limpar-sessoes.ts
```

### 3. Iniciar o Ouvinte do WhatsApp (Robô Lara)
Execute o comando em segundo plano para reconectar o Baileys ao WhatsApp:
```bash
npx tsx conectar-baileys.ts
```

---

## Recursos e Proteções Ativas no Estado Atual (22/07/2026)
Ao restaurar o backup, você garante que as seguintes melhorias estarão ativas:
1.  **Dashboard Responsivo**: O painel se ajustará automaticamente a telas de celulares e PCs (com viewport corrigido em `index.html` e menu hambúrguer em `src/App.tsx`).
2.  **Trava de Score de Advogado**: Leads com advogado marcados como recuperáveis (`is_recoverable: true`) mantêm sua pontuação normal no dashboard.
3.  **Fallback de Mensagem Longa (> 20 palavras)**: Mensagens complexas com mais de 20 palavras no meio da conversa forçam o processamento por IA, impedindo perda de dados voluntários (como doenças e contribuições).

---
name: lara-engine-triagem
description: >-
  Manual do motor de triagem do robô Lara, cobrindo a FSM (Finite State Machine),
  extração híbrida (regex + GPT), respostas determinísticas e rotinas de follow-up.
---

# Lara - Motor de Triagem Inteligente

Este documento atua como a especificação de engenharia da agente conversacional **Lara**, detalhando suas rotinas internas, FSM e fluxos de conversa.

---

## 1. Estrutura da FSM (Finite State Machine)
A conversa é guiada de forma determinística por estados em `src/sofia.ts`.

### Estados Iniciais e Sub-fluxo de Advogado (Controle Ético)
1.  `AWAITING_NAME`: Solicita e extrai o nome do usuário.
2.  `AWAITING_LAWYER`: Pergunta se o cliente já possui advogado.
    *   Se **Não**: Prossegue para `AWAITING_AGE`.
    *   Se **Sim**: Desvia para o sub-fluxo ético:
        *   `LAWYER_CHECK_ACTION`: Processo na Justiça ou apenas INSS?
        *   `LAWYER_CHECK_CONTRACT`: Assinou contrato de honorários?
        *   `LAWYER_CHECK_PROCURACAO`: Assinou procuração?
    *   *Resolução do Sub-fluxo*:
        *   Se tiver **Justiça + Contrato + Procuração**: O lead é considerado **Não Recuperável** (`is_recoverable: false`). O bot envia a mensagem de despedida ética e encerra (`state_fsm: 'FINISHED'`, `status_final: 'com_advogado'`, `score_total: 0`).
        *   Caso contrário: O lead é considerado **Recuperável** (`is_recoverable: true`). Ele recebe uma mensagem persuasiva de transição de autoridade e o fluxo retoma para a triagem geral (`AWAITING_AGE`). O `score_total` deste lead **não** é zerado nem afetado negativamente pela presença do advogado anterior.

### Estados da Triagem Geral
*   `AWAITING_AGE`: Solicita a idade (guarda para beneficiários próprios ou familiares terceiros).
*   `AWAITING_TOTAL_CONTRIBUTION`: Coleta o histórico/tempo de contribuição.
*   `AWAITING_CURRENT_CONTRIBUTION`: Verifica se está trabalhando atualmente.
*   `AWAITING_LAST_CONTRIBUTION_TIME`: (Se inativo) Há quanto tempo parou de contribuir.
*   `AWAITING_DISEASE`: Pergunta sobre doenças ou limitações de saúde.
*   `AWAITING_DISABILITY`: Pergunta sobre deficiências.

### Ramos de Fluxo Específico (INSS vs BPC/LOAS vs Aposentadoria)
Com base nos dados acumulados, a FSM decide dinamicamente o fluxo do lead na conclusão da triagem geral:
*   **Aposentadoria** (Idade + Contribuição suficiente): Direciona para o roteiro de histórico detalhado de trabalho (`RETIREMENT_AWAITING_WORK_HISTORY`, `RETIREMENT_AWAITING_SPECIAL_RURAL`).
*   **BPC/LOAS** (Idoso $\ge 65$ ou Deficiente sem contribuição): Direciona para perguntas de assistência social (`BPC_AWAITING_HOUSEHOLD`, `BPC_AWAITING_HOUSEHOLD_INCOME`, `BPC_AWAITING_HOME_STATUS`, `BPC_AWAITING_CADUNICO`).
    *   *Especialidade BPC Deficiente*: Para o fluxo de `BPC_DEFICIENTE` (idade < 65 com deficiência), após a pergunta de CadÚnico, o robô faz uma pergunta extra de laudo/exames médicos (`INSS_AWAITING_REPORTS`) para garantir a comprovação médica da deficiência necessária para a perícia do INSS.
*   **INSS Contributivo**: Direciona para perguntas de laudos médicos e recolhimento (`INSS_AWAITING_EMPLOYMENT_TYPE`, `INSS_AWAITING_LAST_CONTRIBUTION`, `INSS_AWAITING_REPORTS`).

---

## 2. Extração Híbrida de Informações e Fallbacks
O robô processa as respostas recebidas de forma híbrida:
1.  **Código Puro (RegEx)**: Verifica padrões e respostas curtas comuns (ex: *"sim"*, *"não"*, *"só INSS"*, números para idade/tempo de contribuição) para fornecer respostas instantâneas de baixíssimo custo.
2.  **Qualificação de Idade Inteligente**: Para mensagens curtas (até 4 palavras), aceita números isolados como idade (ex: *"64"*). Para mensagens longas (> 4 palavras), o sistema exige obrigatoriamente qualificadores textuais (como *"anos"*, *"de idade"*, *"tenho X"*, *"idade X"*) para evitar confundir a idade com tempos e prazos relatados pelo cliente (ex: *"1 ano sem receber"*).
3.  **Auto-Detecção de Beneficiário Anterior (LOAS/BPC e Deficiência)**: No analisador de código puro (`sanitizeExtractedData`), caso o cliente afirme diretamente que já recebia LOAS/BPC ou que possui alguma deficiência, o sistema preenche previamente as variáveis de contribuição (definindo `ja_contribuiu: false`, `esta_contribuindo_atualmente: false`, `tempo_parou_contribuir: 'nunca'`) e de saúde, avançando o robô automaticamente para as próximas fases correspondentes, sem repetir perguntas cujas respostas já foram implicitamente dadas.
4.  **Trava de Mensagem Longa (> 20 palavras)**: Se a mensagem do cliente tiver mais de 20 palavras, o sistema força o fallback de IA.
5.  **Sincronização de Scores em RegEx**: Toda vez que uma resposta é resolvida por código puro/RegEx, o motor do robô recalcula o `score_total` do lead usando a biblioteca centralizada (`src/lib/score.ts`) e o persiste no Supabase.

---

## 3. Resposta de Endereço (Bypass)
Existe um detector determinístico de perguntas sobre endereço e localização:
*   Padrões suportados (com e sem acentuação/pontuação): *"onde fica"*, *"onde é"*, *"você é de onde"*, *"endereço"*, *"onde vocês atendem"*, *"cade vocês"*, *"onde fica o escritório"*, *"qual cidade vocês ficam"*, etc.
*   **Ação**: O robô envia o endereço físico e, **na mesma mensagem**, repete a pergunta exata do estado atual da FSM, sem alterar o estado do cadastro.

---

## 4. Guarda de Silenciamento de Triagem Finalizada
Para evitar que o robô envie mensagens repetidas de encerramento quando o cliente responde com agradecimentos (ex: *"obrigado"*, *"tá bem"*, *"ok"*):
*   Após o robô enviar a mensagem de encerramento no estado `FINISHED`, é definida a flag `triagem_encerrada_msg_enviada: true` no banco de dados.
*   Qualquer mensagem recebida do usuário após a ativação desta flag faz com que o robô retorne silenciosamente `null`, ignorando a mensagem e deixando o canal livre para a equipe de atendimento humano do CRM.

---

## 5. Rotina de Follow-up (Inatividade)
O arquivo `conectar-baileys.ts` roda uma rotina periódica integrada ao WhatsApp:
*   **Check de Inatividade**: Varre sessões ativas a cada 1 minuto.
*   **Mensagem (72 horas)**: Envia um follow-up persuasivo com saudação baseada no horário de Brasília + Nome do cliente.
*   **Auto-Fechamento (Mais 24 horas)**: Se o lead continuar inativo após 24 horas adicionais do follow-up, o status do CRM muda para `perdidos` (Reprovado por inatividade) e a FSM fecha (`FINISHED`).

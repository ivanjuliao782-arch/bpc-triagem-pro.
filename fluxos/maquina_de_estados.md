# Lógica de Fluxo da Lara (FSM)

Este documento detalha o funcionamento interno do mecanismo de qualificação baseado na Máquina de Estados Finita (FSM) que roda no arquivo `src/sofia.ts`.

---

## 1. O que é a FSM da Lara?

Lara utiliza a estratégia de **"Estado Rígido com Ilusão de Naturalidade"**.
O motor do LLM recebe em seu prompt o estado atual e o histórico, sendo obrigado a responder focando estritamente em extrair a informação que falta para o estado atual. Isso garante que a conversa não saia dos trilhos jurídicos.

---

## 2. Transições de Estado

### FASE 1: Coleta Universal
1. **START** ➔ Lara cumprimenta e pede o nome.
2. **AWAITING_NAME** ➔ Coleta o nome, reage com simpatia e pede a idade.
3. **AWAITING_AGE** ➔ Coleta a idade, reage e pergunta se trabalha atualmente.
4. **AWAITING_WORK** ➔ Coleta a resposta e pergunta se já contribuiu para o INSS.
5. **AWAITING_CONTRIBUTION** ➔ Coleta a resposta e pergunta se possui alguma doença, sequela de acidente ou limitação que impeça o trabalho.
6. **AWAITING_DISEASE** ➔ Coleta a doença/limitação. Neste ponto, o motor do bot executa a **Classificação Interna de Fluxo**.

### FASE 2: Classificação Interna e Bifurcação

Com base nas 5 respostas iniciais, o sistema define a variável `fluxo_ativo`:

* **BPC_IDOSO**: Idade $\ge$ 65, sem contribuição recente, baixa renda.
* **BPC_DEFICIENTE**: Idade < 65, tem doença/incapacidade, sem contribuições significativas, baixa renda.
* **INSS_CONTRIBUTIVO**: Tem doença/incapacidade, qualidade de segurado ativa ou carência preenchida.
* **EXCECAO**: Sem doença relevante, sem idade mínima.

---

## 3. Sub-fluxos Específicos

### Roteiro BPC (BPC_IDOSO ou BPC_DEFICIENTE)
1. **BPC_AWAITING_HOUSEHOLD** ➔ Pergunta quantidade de moradores e parentesco.
2. **BPC_AWAITING_HOUSEHOLD_INCOME** ➔ Pergunta quem tem renda na casa e valores.
3. **BPC_AWAITING_HOME_STATUS** ➔ Pergunta se a casa é própria/alugada e se possui eletrodomésticos básicos.
4. **BPC_AWAITING_CADUNICO** ➔ Pergunta se possui Cadastro Único (CadÚnico).
5. **FINISHED** ➔ Mensagem de encerramento padrão da Dra. Mônica.

### Roteiro INSS Contributivo (INSS_CONTRIBUTIVO)
1. **INSS_AWAITING_EMPLOYMENT_TYPE** ➔ Pergunta sobre a profissão, regime de carteira assinada ou autônomo, e como pagava.
2. **INSS_AWAITING_REPORTS** ➔ Pergunta se possui exames ou laudos e a data deles.
3. **FINISHED** ➔ Mensagem de encerramento padrão.



# Melhorias no Chat de Dados: Contexto temporal + Limites + Prompt enriquecido

## O que muda

### 1. Ultimo input de dados
A edge function vai consultar a tabela `upload_history` para buscar a data/hora do upload mais recente de cada tipo de dado (vendas, ads, seguidores, marketing). Essa informacao sera incluida no contexto enviado a IA, junto com uma regra no prompt para que ela **sempre informe ao usuario ate quando os dados vao**.

Exemplo de resposta da IA: *"Os dados de vendas estao atualizados ate 08/02/2026 (ultimo upload em 08/02 as 22:40). Com base nesses dados..."*

### 2. Aviso de limite de 1000 linhas
Ao consultar cada tabela, a funcao vai verificar se o numero de linhas retornadas atingiu exatamente o limite (1000 para vendas, 300 para ads, etc.). Se sim, inclui um flag `dados_truncados: true` no contexto, e o prompt instrui a IA a avisar o usuario:

*"Atencao: o volume de dados excede o limite que consigo processar. A analise abaixo cobre apenas parte do periodo solicitado."*

### 3. Prompt com regras mais claras
O prompt do sistema sera enriquecido com regras adicionais:
- Sempre mencionar o periodo coberto pelos dados e a data do ultimo upload
- Nunca mostrar JSON cru -- sempre tabelas ou texto formatado
- Avisar quando os dados estao truncados
- Usar agregacao diaria para ultimos 30 dias e semanal para 30-90 dias

## Mudancas tecnicas

### Arquivo: `supabase/functions/chat-with-data/index.ts`

**Nova consulta -- ultimo upload por tipo:**
```text
SELECT data_type, MAX(created_at) as ultimo_upload, 
       MAX(date_range_end) as dados_ate
FROM upload_history
GROUP BY data_type
```

**Flag de truncamento:**
- Apos cada query, comparar `rows.length` com o limite usado
- Se `rows.length >= limit`, marcar `dados_truncados = true` no contexto daquele tipo

**Agregacao diaria (ultimos 30 dias):**
- Adicionar campo `por_dia` com receita/pedidos/frete por dia
- Manter `por_semana` para o periodo 30-90 dias

**Prompt atualizado com novas regras:**
- "SEMPRE comece informando o periodo dos dados e a data do ultimo upload"
- "Se `dados_truncados` for true, avise: os dados excedem o limite processavel"
- "NUNCA mostre JSON cru -- formate sempre em tabelas markdown ou texto"
- "Use `por_dia` para perguntas sobre periodos curtos (ate 30 dias)"
- "Use `por_semana` para tendencias de medio prazo"

**Aumento de limite de vendas:** de 500 para 1000

### Nenhum outro arquivo precisa ser alterado
Todas as mudancas sao na edge function. O frontend ja renderiza markdown corretamente.

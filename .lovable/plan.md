
# Ensinar o Chat IA sobre Todo o Dashboard

## Problema identificado

O chat tem 3 limitacoes criticas:

1. **Janela de dados limitada a 90 dias** — o usuario nao consegue perguntar sobre meses antigos (ex: "ticket medio de agosto")
2. **Sem dados de clientes** — a agregacao nao inclui `cliente_email`/`cliente_nome`, entao perguntas como "top 10 clientes" nao funcionam
3. **Sem breakdown mensal de anuncios** — `top_anuncios` agrega 90 dias sem separacao por mes

## Solucao em 3 partes

### Parte 1: Expandir janela de dados para TODOS os dados disponiveis

Remover o filtro de 90 dias do `fetchDataContext`. Em vez de `d90`, buscar TODOS os dados do banco. Para manter o contexto compacto, mudar a estrategia de agregacao:

- **Ultimos 30 dias**: breakdown diario (como hoje)
- **30-90 dias**: breakdown semanal (como hoje)
- **90+ dias**: breakdown MENSAL (novo)

Isso permite responder sobre qualquer mes historico sem sobrecarregar o prompt.

### Parte 2: Adicionar agregacao por cliente (top clientes)

Na funcao `aggregateSales`, adicionar um campo `top_clientes` que agrupa por `cliente_email` (ou `cliente_nome` como fallback):

```text
top_clientes (top 30 por receita):
- nome, email, total_pedidos, receita_total, ticket_medio, primeiro_pedido, ultimo_pedido
```

Tambem adicionar `clientes_resumo`:
- total_clientes_unicos
- clientes_novos (1 pedido)
- clientes_recorrentes (2+ pedidos)
- taxa_recompra
- media_dias_entre_compras

### Parte 3: Adicionar breakdown mensal de anuncios

Adicionar `top_anuncios_por_mes` na funcao `aggregateAds`:
- Para cada mes (YYYY-MM), top 15 anuncios por receita
- Incluindo: nome, gasto, receita, roas, cliques, conversoes

### Parte 4: Atualizar o system prompt

Adicionar instrucoes sobre os novos campos:
- `top_clientes` para perguntas sobre melhores clientes
- `clientes_resumo` para metricas de base de clientes
- `top_anuncios_por_mes` para performance de ads por mes
- `por_mes` (vendas mensais) para consultas de meses antigos
- Explicar segmentacao de clientes (Primeira Compra / Recorrente / Fiel / VIP)

## Detalhes tecnicos

### Arquivo modificado
- `supabase/functions/chat-with-data/index.ts`

### Mudancas na funcao `fetchDataContext` (~linha 57)

Remover o filtro `d90` das queries. Usar string vazia ou data muito antiga como `minDate` para buscar tudo. A paginacao `fetchAll` ja existe e suporta isso.

### Mudancas na funcao `aggregateSales` (~linha 99)

1. Adicionar breakdown mensal (alem do diario e semanal existentes):

```text
const monthMap: Record<string, { revenue, orders, freight }> = {};
// Para dados alem de 90 dias, agrupar por mes
```

2. Adicionar agrupamento por cliente:

```text
const customerMap: Record<string, { nome, email, orders, revenue, firstOrder, lastOrder }> = {};
for (const r of rows) {
  const key = r.cliente_email || r.cliente_nome || "Anonimo";
  // acumular...
}
```

3. Calcular metricas de clientes:
   - Total unicos, novos vs recorrentes, taxa recompra

### Mudancas na funcao `aggregateAds` (~linha 247)

Adicionar agrupamento por mes+anuncio:

```text
const monthAdMap: Record<string, Record<string, { gasto, receita, cliques, impressoes, conversoes }>> = {};
```

### Mudancas no `SYSTEM_PROMPT` (~linha 355)

Adicionar instrucoes:
- "O campo `por_mes` contem vendas agregadas por mes. Use para consultas sobre meses especificos"
- "O campo `top_clientes` contem os 30 maiores clientes por receita. Use para perguntas sobre melhores clientes"
- "O campo `clientes_resumo` contem total de clientes, taxa de recompra e segmentacao"
- "O campo `top_anuncios_por_mes` agrupa top 15 anuncios por receita em cada mes (chave YYYY-MM)"
- Segmentacao: Primeira Compra (1 pedido), Recorrente (2), Fiel (3-4), VIP (5+ ou R$ 500+)

### Mudanca no select de `sales_data` (~linha 63)

Adicionar `cliente_email, cliente_nome` ao select para viabilizar a agregacao por cliente.

## Resultado esperado

Apos essa mudanca, o chat conseguira responder:
- "Qual o ticket medio de agosto?" (dados historicos completos)
- "Quais os top 10 clientes nos ultimos 90 dias?" (dados de clientes)
- "Quais os 5 melhores anuncios de janeiro?" (breakdown mensal)
- "Como evoluiu a taxa de recompra?" (metricas de clientes)
- "Quantos clientes VIP temos?" (segmentacao)

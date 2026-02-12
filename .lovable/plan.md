

# Corrigir limitacoes do Chat com Dados

## Problemas identificados

1. **Produtos "Desconhecido"**: A funcao usa `p.nome || p.name` (linha 136) mas o campo correto nos dados e `descricaoAjustada` ou `descricao`. Nenhum registro tem campo `nome` ou `name`.

2. **Dados truncados - Vendas**: 2.781 registros no banco, limite atual e 1.000 (perde 64% dos dados).

3. **Dados truncados - Marketing**: 2.035 registros no banco, limite atual e 300 (perde 85% dos dados).

4. **Dados truncados - Ads**: 478 registros no banco, limite atual e 300 (perde 37% dos dados).

5. **Sem estatisticas de amostras**: Nao ha breakdown de amostras por tipo de pet nem contagem separada.

## Solucao

Reescrever a funcao `chat-with-data` para:
- Buscar dados em lotes (paginacao) ate cobrir tudo
- Agregar no servidor antes de enviar ao modelo de IA
- Usar os campos corretos de produto

### Alteracoes no arquivo `supabase/functions/chat-with-data/index.ts`

### 1. Corrigir mapeamento de produto (critico)

Linha 136 atual:
```text
const name = p.nome || p.name || "Desconhecido";
```

Corrigir para:
```text
const name = p.descricaoAjustada || p.descricao || p.nome || p.name || "Desconhecido";
```

### 2. Buscar todos os registros com paginacao

Criar funcao auxiliar `fetchAll` que busca em lotes de 1000 ate nao haver mais registros. Substituir as chamadas com `.limit()` por esta funcao.

```text
async function fetchAll(supabase, table, select, dateCol, minDate, orderCol) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from(table)
      .select(select)
      .gte(dateCol, minDate)
      .order(orderCol, { ascending: false })
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
```

### 3. Adicionar estatisticas de amostras

No `aggregateSales`, apos iterar os produtos, classificar pedidos somente-amostra por tipo de pet:
- Verificar se descricao contem "caes" ou "cachorro" -> Cachorro
- Verificar se descricao contem "gatos" ou "gato" -> Gato
- Pedido com ambos -> Cachorro + Gato

Adicionar ao contexto:
```text
amostras: {
  total_pedidos_amostra: N,
  cachorro: N,
  gato: N,
  ambos: N,
}
```

### 4. Adicionar top produtos por mes

Expandir o `aggregateSales` para agrupar produtos por mes (YYYY-MM), gerando uma estrutura `top_produtos_por_mes` com os 10 produtos mais vendidos por quantidade e receita em cada mes.

### 5. Aumentar detalhamento de ads por dia

Mudar o range de 14 dias para 30 dias no breakdown diario de ads (linha 196: `d14` -> `d30`).

### 6. Atualizar system prompt

Adicionar instrucoes sobre:
- Amostras e seu breakdown por tipo de pet
- Campo `top_produtos_por_mes` para perguntas temporais
- Remover aviso de truncamento (dados agora sao completos)

## Resultado esperado

- Produtos aparecerao com nomes reais (ex: "Comida de Dragao - Original (90g)")
- Todos os 2.781 registros de vendas serao processados
- Todos os registros de ads e marketing serao incluidos
- Chat tera dados de amostras por tipo de pet
- Avisos de truncamento desaparecerao

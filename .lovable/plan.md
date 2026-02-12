

# Adicionar breakdown por anuncio individual no Chat com Dados

## Problema

A funcao `aggregateAds` agrega todos os dados de ads em totais e por dia, mas nao envia o detalhamento por anuncio individual ao modelo de IA. O banco tem o campo `anuncio` com nomes unicos (ex: "TP003 - Amostra Gatos", "TP003 - Petisco de BSF"), mas o chat nunca recebe essa informacao.

## Solucao

Adicionar um campo `top_anuncios` na saida de `aggregateAds` que agrupa por nome de anuncio, somando gasto, receita, cliques e impressoes, e retornando os top 30 ordenados por receita.

### Alteracoes no arquivo `supabase/functions/chat-with-data/index.ts`

### 1. Adicionar agrupamento por anuncio na funcao `aggregateAds` (linha ~247-286)

Dentro da funcao `aggregateAds`, antes do `return`, adicionar:

```text
const adMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number; conversoes: number }> = {};
for (const r of rows) {
  const adName = r.anuncio || r.campanha || "Sem nome";
  if (!adMap[adName]) adMap[adName] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };
  adMap[adName].gasto += Number(r.gasto || 0);
  adMap[adName].receita += Number(r.receita || 0);
  adMap[adName].cliques += Number(r.cliques || 0);
  adMap[adName].impressoes += Number(r.impressoes || 0);
  adMap[adName].conversoes += Number(r.conversoes || 0);
}

const topAds = Object.entries(adMap)
  .sort((a, b) => b[1].receita - a[1].receita)
  .slice(0, 30)
  .map(([name, d]) => ({
    anuncio: name,
    gasto: d.gasto.toFixed(2),
    receita: d.receita.toFixed(2),
    roas: d.gasto > 0 ? (d.receita / d.gasto).toFixed(2) : "0",
    cliques: d.cliques,
    impressoes: d.impressoes,
    conversoes: d.conversoes,
  }));
```

Adicionar `top_anuncios: topAds` ao objeto de retorno.

### 2. Adicionar agrupamento por objetivo

Tambem agrupar por `objetivo` para dar contexto sobre a estrategia:

```text
const objectiveMap: Record<string, { gasto: number; receita: number; cliques: number }> = {};
for (const r of rows) {
  const obj = r.objetivo || "Desconhecido";
  if (!objectiveMap[obj]) objectiveMap[obj] = { gasto: 0, receita: 0, cliques: 0 };
  objectiveMap[obj].gasto += Number(r.gasto || 0);
  objectiveMap[obj].receita += Number(r.receita || 0);
  objectiveMap[obj].cliques += Number(r.cliques || 0);
}
```

Adicionar `por_objetivo: objectiveMap` ao retorno.

### 3. Atualizar system prompt (linha ~310-313)

Adicionar instrucoes:
- "O campo `top_anuncios` contem os 30 anuncios com maior receita, incluindo gasto, receita, ROAS, cliques e impressoes de cada um"
- "O campo `por_objetivo` agrupa ads por objetivo de campanha (OUTCOME_SALES, LINK_CLICKS, etc.)"
- "Use `top_anuncios` para responder perguntas sobre melhores/piores anuncios"

## Resultado esperado

- O chat conseguira listar os 5 melhores anuncios de fevereiro com nome, gasto, receita e ROAS
- Perguntas como "qual anuncio teve melhor ROAS?" serao respondidas com dados reais
- O breakdown por objetivo dara contexto sobre a estrategia de ads


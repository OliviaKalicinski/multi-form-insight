

# Corrigir inconsistencia entre CTR/ROAS exibidos e classificacao

## Problema

A classificacao e os valores exibidos usam fontes de dados diferentes:

| Dado | Valor exibido na tabela | Valor usado na classificacao |
|---|---|---|
| CTR | `ad["CTR (todos)"]` (pre-calculado do CSV) | `cliques_de_saida / impressoes * 100` (calculado) |
| Cliques | `ad["Cliques (todos)"]` | `ad["Cliques de saida"]` (prioridade) |
| ROAS | `ad["ROAS de resultados"]` (se existir no CSV) | `receita / investimento` (sempre calculado) |

Resultado: um anuncio mostra CTR 2.93% e ROAS 2.41x (ambos acima dos thresholds), mas a classificacao calcula internamente com cliques de saida (que pode dar CTR < 2%) e classifica como "Conversor Silencioso".

## Solucao

Unificar: usar os **mesmos valores calculados** para exibicao, coloracao E classificacao. A funcao `getAdClassification` ja calcula CTR e ROAS corretamente — basta reutilizar esses valores na tabela.

## Alteracoes

### Arquivo unico: `src/components/dashboard/AdsBreakdown.tsx`

### 1. Expandir retorno de `getAdClassification`

Alterar para retornar um objeto com os valores calculados alem da classificacao:

```typescript
const getAdMetrics = (ad: AdsData) => {
  const investment = parseValue(ad["Valor usado (BRL)"]);
  const impressions = parseValue(ad["Impressões"]);
  const revenue = parseValue(ad["Valor de conversão da compra"]);
  const clicks = parseValue(ad["Cliques de saída"]) 
    || parseValue(ad["Cliques no link"]) 
    || parseValue(ad["Cliques (todos)"]);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const roas = investment > 0 ? revenue / investment : 0;
  const classification = investment >= 10 ? classifyFunnelRole(ctr, roas) : null;

  return { ctr, roas, clicks, classification };
};
```

### 2. Usar valores unificados no render da tabela

Dentro do `.map()` do body (linhas 399-407), substituir:

- `ctr` vem de `getAdMetrics(ad).ctr` em vez de `parseValue(ad["CTR (todos)"])`
- `roas` vem de `getAdMetrics(ad).roas` em vez de `calculateRoas(ad)`
- `clicks` vem de `getAdMetrics(ad).clicks` em vez de `parseValue(ad["Cliques (todos)"])`

### 3. Usar mesma funcao na ordenacao

Na ordenacao por `ctr` (linha 182), usar `getAdMetrics(a).ctr` em vez de `parseValue(a["CTR (todos)"])`.
Na ordenacao por `roas`, usar `getAdMetrics(a).roas`.

### 4. Remover `calculateRoas`

A funcao `calculateRoas` (linhas 62-72) usava `ad["ROAS de resultados"]` do CSV como fonte primaria, criando divergencia. Sera removida, unificando tudo em `getAdMetrics`.

## Resultado esperado

O anuncio do exemplo (CTR 2.93%, ROAS 2.41x) sera classificado como **Conversor** (verde) porque agora exibicao e classificacao usam exatamente os mesmos valores calculados.

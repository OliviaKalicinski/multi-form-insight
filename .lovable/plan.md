

# Usar dados do Meta (CSV) diretamente em vez de calcular

## Problema

A funcao `getAdMetrics` calcula CTR, ROAS e cliques manualmente, mas o CSV do Meta ja traz esses valores prontos. Alem disso, usa uma cadeia de fallback para cliques (`Cliques de saida` > `Cliques no link` > `Cliques (todos)`) que diverge do valor oficial do Meta.

## Solucao

Alterar `getAdMetrics` para ler todos os valores diretamente dos campos do CSV, mantendo calculo apenas como fallback quando o campo estiver vazio.

## Alteracoes

### Arquivo: `src/components/dashboard/AdsBreakdown.tsx`

Alterar a funcao `getAdMetrics` (linhas 94-105):

```typescript
const getAdMetrics = (ad: AdsData) => {
  const investment = parseValue(ad["Valor usado (BRL)"]);
  const impressions = parseValue(ad["Impressões"]);
  const revenue = parseValue(ad["Valor de conversão da compra"]);
  const clicks = parseValue(ad["Cliques (todos)"]);

  // Usar valores do Meta (CSV) como fonte primaria
  const ctrFromCsv = parseValue(ad["CTR (todos)"]);
  const roasFromCsv = parseValue(ad["ROAS de resultados"]);

  // Fallback: calcular apenas se o CSV nao trouxer o valor
  const ctr = ctrFromCsv > 0 ? ctrFromCsv : (impressions > 0 ? (clicks / impressions) * 100 : 0);
  const roas = roasFromCsv > 0 ? roasFromCsv : (investment > 0 ? revenue / investment : 0);

  const classification = investment >= 10 ? classifyFunnelRole(ctr, roas) : null;

  return { ctr, roas, clicks, classification };
};
```

### O que muda

- **CTR**: usa `ad["CTR (todos)"]` do Meta como fonte primaria (antes: calculava manualmente)
- **ROAS**: usa `ad["ROAS de resultados"]` do Meta como fonte primaria (antes: calculava manualmente)
- **Cliques**: volta a usar `ad["Cliques (todos)"]` (antes: priorizava `Cliques de saida`)
- Calculo manual so entra como fallback se o campo CSV estiver vazio/zero
- A classificacao passa a usar os mesmos valores oficiais do Meta

### O que NAO muda

- Nenhum outro arquivo alterado
- Cores, legenda, filtros, ordenacao, tooltips permanecem iguais


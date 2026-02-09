

# Plano: Corrigir datas dos anuncios e delimitadores dos uploaders

## Diagnostico

### Problema das datas de anuncios
Todos os registros de cada mes ficam com data `YYYY-MM-01` porque a funcao `extractDateFromMonth` extrai apenas o primeiro dia do campo "Mes" (ex: "2025-11-01 - 2025-11-30" vira "2025-11-01"). Isso acontece para TODOS os meses, nao apenas novembro.

**Porem, isso e o comportamento esperado para o formato de exportacao mensal do Meta Ads.** Os 39 registros de novembro sao 39 anuncios diferentes, nao 39 dias. Os totais estao corretos:
- Gasto: R$ 11.866,75
- Impressoes: 845.211
- Cliques: 17.493
- Conversoes: 339
- Receita: R$ 14.004,65

**Nenhuma correcao e necessaria no parser de anuncios** -- o campo `data` serve como referencia mensal, e os dashboards ja agrupam por mes (YYYY-MM).

### Problema dos delimitadores
Dois uploaders nao tem auto-deteccao de delimitador, o que pode causar falha ao importar CSVs com ponto-e-virgula ou tab:

| Uploader | Delimitador | Status |
|---|---|---|
| SalesUploader | `""` (auto) | OK |
| AdsUploader | `""` (auto) | OK |
| FollowersUploader | nenhum (padrao virgula) | Precisa corrigir |
| CSVUploader (marketing) | nenhum (padrao virgula) | Precisa corrigir |
| InstagramMetricsParser | parser manual | OK |

## Solucao

Adicionar `delimiter: ""` nos dois uploaders que estao faltando:

### Arquivo 1: `src/components/dashboard/FollowersUploader.tsx`
- Adicionar `delimiter: ""` na chamada `Papa.parse` (linha 69-71)

### Arquivo 2: `src/components/dashboard/CSVUploader.tsx`
- Adicionar `delimiter: ""` na chamada `Papa.parse` (linha 73-75)

## Secao tecnica

Ambas as alteracoes sao identicas -- adicionar uma unica linha `delimiter: "",` apos `header: true,` na configuracao do PapaParse. Isso habilita auto-deteccao de separadores (virgula, ponto-e-virgula, tab).


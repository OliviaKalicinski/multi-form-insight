

# Remover gate de maturidade da Analise de Amostras

## Problema
O dashboard mostra badges de maturidade ("X% com 60+ dias", "Analise confiavel") e a secao "Conversao por Tempo" usa gates temporais, o que confunde a interpretacao. O usuario quer ver sempre: total de clientes que compraram amostra vs total que recompraram, sem filtros de tempo.

## Mudancas

### 1. `src/pages/AnaliseSamples.tsx`
- **Remover o badge de maturidade** (linhas 227-243) que mostra "Analise confiavel" ou "X% com 60+ dias"
- **Remover ou simplificar a secao `conversionByTime`** nos graficos/cards que mostram conversao por janela (30/60/90/180 dias) -- manter apenas como informacao secundaria, nao como metrica principal
- O card principal "Taxa de Conversao (amostra -> regular)" ja mostra a taxa bruta correta (qualified/converted), entao permanece como esta

### 2. `src/utils/samplesAnalyzer.ts`
- **`calculateRepurchaseBehavior`**: Ja calcula a taxa bruta corretamente (sem gate). Nenhuma mudanca necessaria.
- **`calculateConversionByTime`**: Manter a funcao mas deixar claro na UI que sao taxas "dentro de X dias" (informacional), nao o KPI principal.
- **`calculateMaturityMetrics`**: Manter a funcao (pode ser util internamente), mas remover sua exibicao na UI principal.

### 3. Ajuste na UI do card principal
- Atualizar o texto do card de "Taxa de Conversao" para deixar explicito: "Base: todos os clientes que iniciaram com amostra" (sem mencionar maturidade)
- Remover qualquer referencia a "gate de maturidade" ou "base elegivel" que cause confusao

## Resumo
A taxa principal exibida sera sempre: `convertidos / total_qualificados` (ex: 11/627 = 1,8%), sem nenhum filtro temporal. As analises por janela de tempo (30/60/90 dias) ficam como detalhe secundario em aba separada, claramente rotuladas como "conversao dentro de X dias".

## Arquivos modificados
1. `src/pages/AnaliseSamples.tsx` -- remover badge maturidade, ajustar textos
2. `src/utils/samplesAnalyzer.ts` -- nenhuma mudanca logica, apenas manter compatibilidade


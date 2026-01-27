
# Correção: Linha de Meta Mais Visível

## Problema

A linha "Meta" está sendo renderizada **por baixo** das barras no gráfico, tornando-a pouco visível. Em Recharts, a ordem de renderização segue a ordem dos componentes no JSX.

## Solução

Mover o `ReferenceLine` para **depois** dos componentes `Bar`, e também aumentar a espessura e opacidade da linha para melhor visibilidade.

## Arquivo a Modificar

`src/components/dashboard/DailyVolumeChart.tsx`

## Mudanças

1. **Mover ReferenceLine para depois das Bars** - Isso faz a linha ser renderizada por cima das barras
2. **Aumentar strokeWidth** - De 1 (default) para 2
3. **Usar cor sólida mais forte** - Garantir contraste adequado

## Ordem Atual (errada):
```text
<CartesianGrid />
<XAxis />
<YAxis />
<Tooltip />
<ReferenceLine />  ← Renderiza primeiro (fica por baixo)
<Bar productOrders />
<Bar sampleOnlyOrders />
```

## Ordem Corrigida:
```text
<CartesianGrid />
<XAxis />
<YAxis />
<Tooltip />
<Bar productOrders />
<Bar sampleOnlyOrders />
<ReferenceLine />  ← Renderiza por último (fica por cima)
```

## Resultado Esperado

A linha de Meta/Média aparecerá **sobre** as barras, claramente visível mesmo quando as barras a ultrapassam.

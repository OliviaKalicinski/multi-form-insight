
# Remover Ticket Médio da visão consolidada de Operações

## Mudança

No arquivo `src/pages/Operacoes.tsx`, o card "Forma de Envio Principal" (HERO card, linhas 267-313) contém um grid 2x2 com 4 sub-cards: Pedidos, Faturamento, % do Total e **Ticket Médio**.

Como Ticket Médio não faz sentido no consolidado (mistura naturezas), vamos:

1. **Linhas 305-310**: Envolver o sub-card de Ticket Médio com `{!isConsolidated && (...)}` para ocultá-lo no modo consolidado.

2. **Linha 286**: Tornar o grid dinâmico — `grid-cols-2` quando há 4 items, `grid-cols-3` ou manter `grid-cols-2` com 3 items quando consolidado. Mais simples: manter `grid-cols-2` e o layout se ajusta naturalmente com 3 items.

### Arquivo tocado
- `src/pages/Operacoes.tsx` — condicionar exibição do sub-card Ticket Médio

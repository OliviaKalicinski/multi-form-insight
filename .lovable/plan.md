

# Liberar movimentação livre no Kanban para todos os pedidos

Remover todas as validações de transição de status, mantendo apenas a checagem mínima de ter ≥1 item para sair de "Pedidos".

## Mudança

**`src/hooks/useOperationalOrders.ts`** — bloco `updateStatus.mutationFn`

Remover a variável `isSeeding` e todas as guards condicionais. O bloco de validação inteiro vira apenas:

```typescript
if (newStatus === "aguardando_expedicao") {
  if (!order.items || order.items.length === 0) 
    throw new Error("Pedido precisa de pelo menos 1 item");
}
```

Todas as outras checagens (destinatário, lote, peso, medidas, rastreio, NF) são removidas. Qualquer pedido anda livremente entre colunas.

**1 arquivo, ~20 linhas removidas.**


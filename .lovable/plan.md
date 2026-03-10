

# Seeding anda livre no Kanban

Já existe `isSeeding` na linha 343 usado apenas para NF no envio. Basta expandir essa guarda para pular **todas** as validações de transição.

## Mudança

**`src/hooks/useOperationalOrders.ts`** — linhas 345-367

Envolver os três blocos de validação (`aguardando_expedicao`, `fechado`, `enviado`) com `if (!isSeeding)`, exceto a checagem mínima de ter pelo menos 1 item:

```typescript
if (newStatus === "aguardando_expedicao") {
  if (!order.items || order.items.length === 0) throw new Error("Pedido precisa de pelo menos 1 item");
  if (!isSeeding) {
    if (!order.customer_id) {
      if (!order.destinatario_nome) throw new Error("...");
      if (!order.destinatario_endereco) throw new Error("...");
      if (!order.destinatario_cidade) throw new Error("...");
      if (!order.destinatario_cep) throw new Error("...");
    }
  }
}
if (newStatus === "fechado" && !isSeeding) {
  // lote, peso, medidas
}
if (newStatus === "enviado" && !isSeeding) {
  // rastreio, NF
}
```

Seeding mantém apenas: precisa de ≥1 item para sair de "Pedidos". Todo o resto (destinatário, lote, peso, medidas, rastreio, NF) é ignorado.

**1 arquivo**, ~15 linhas alteradas.


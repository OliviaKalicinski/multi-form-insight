

## Ajuste: regra "Apenas Amostras" + estatísticas de contato

### Refinamento da regra "Apenas Amostras"

Definição corrigida: **cliente cuja vida inteira de compras é exclusivamente amostras** — ou seja, **TODOS os pedidos** dele são amostra (R$0,01–R$1,00 ou nome contendo "amostra/sample/degustação/kit teste"). Se em algum momento ele fez 1 pedido normal, sai do filtro.

Diferente de antes (que olhava só o primeiro pedido). Agora é "100% dos pedidos = amostra".

### Implementação

1. **Novo helper em `Clientes.tsx`** (memoizado a partir de `processedOrders`):
   ```ts
   // Set<cpf_cnpj> de clientes cujos 100% dos pedidos são amostra
   const sampleOnlyCpfSet = useMemo(() => {
     const byCpf = new Map<string, { total: number; samples: number }>();
     processedOrders.forEach(o => {
       if (!o.cpf_cnpj) return;
       const cur = byCpf.get(o.cpf_cnpj) ?? { total: 0, samples: 0 };
       cur.total++;
       if (isSampleOrder(o)) cur.samples++;
       byCpf.set(o.cpf_cnpj, cur);
     });
     return new Set(
       [...byCpf.entries()]
         .filter(([_, v]) => v.total > 0 && v.total === v.samples)
         .map(([cpf]) => cpf)
     );
   }, [processedOrders]);
   ```
   Reutiliza `isOnlySampleOrder` / critério de amostra do `samplesAnalyzer.ts`.

2. **`useCustomerFilters`**: aceita `sampleOnlyCpfSet?: Set<string>` nos args. Quando `segmentFilter === "apenas-amostras"`, aplica `list = list.filter(c => sampleOnlyCpfSet.has(c.cpf_cnpj ?? ""))`.

3. **`UnifiedFilters`**: adiciona `<SelectItem value="apenas-amostras">Apenas Amostras</SelectItem>` no select de Segmento, com separador visual antes (item disabled "─────").

### Estatísticas de contato (mantém o que já estava no plano)

Linha discreta logo abaixo do contador "Clientes com compra • X de Y":

```
📧 980 com email (79,4%)  ·  📱 612 com telefone (49,6%)  ·  ⚠ 142 sem contato (11,5%)
```

- Calculado sobre `filtered` (responde aos filtros ativos).
- Funciona nas 3 abas (Clientes / Leads / Todos).
- Generaliza o `leadsContactStats` existente em `contactStats` reutilizável.
- "Sem contato" em `text-amber-600` quando > 0; demais em `text-muted-foreground`.
- Percentuais com 1 casa decimal, formato pt-BR.

### Confirmação (sem mudança de código)

Lead → Cliente já é automático: upload de NF preenche `first_order_date` via `recalculate_customer_stats`, e `is_provisional` vira `false` na próxima leitura. O registro migra sozinho da aba Leads para Clientes.

### Arquivos modificados

- `src/pages/Clientes.tsx` — calcula `sampleOnlyCpfSet` (regra "100% dos pedidos = amostra"), passa pro hook, renderiza linha de `contactStats`.
- `src/hooks/useCustomerFilters.ts` — aceita `sampleOnlyCpfSet`, filtra quando `segmentFilter === "apenas-amostras"`.
- `src/components/crm/UnifiedFilters.tsx` — nova opção "Apenas Amostras" no select de Segmento.




# Catálogo Operacional + Seeding — Plano Final

## Estado atual do banco (confirmado)

- Constraint `chk_natureza`: `CHECK (natureza_pedido IN ('B2C','B2B','B2B2C'))` -- uppercase
- Constraint `chk_status`: inclui `cancelado`
- 1 pedido existente com `valor_total_informado = 0`
- `operational_order_items` sem DELETE policy (RLS ativo)
- Coluna `valor_total_informado`: NOT NULL DEFAULT 0

## Execução

### Passo 1 — Data fix (via insert tool)
```sql
UPDATE operational_orders SET valor_total_informado = 0.01 WHERE valor_total_informado = 0;
```

### Passo 2 — Migração SQL
```sql
-- Natureza: renomear constraint + adicionar Seeding
ALTER TABLE operational_orders DROP CONSTRAINT chk_natureza;
ALTER TABLE operational_orders ADD CONSTRAINT chk_operational_orders_natureza
  CHECK (natureza_pedido IN ('B2C','B2B','B2B2C','Seeding'));

-- Valor: default seguro + CHECK > 0
ALTER TABLE operational_orders ALTER COLUMN valor_total_informado SET DEFAULT 0.01;
ALTER TABLE operational_orders ADD CONSTRAINT chk_valor_total_positive
  CHECK (valor_total_informado > 0);

-- Destinatário (coexiste com customer_id)
ALTER TABLE operational_orders
  ADD COLUMN destinatario_nome text,
  ADD COLUMN destinatario_documento text,
  ADD COLUMN destinatario_email text,
  ADD COLUMN destinatario_telefone text,
  ADD COLUMN destinatario_endereco text,
  ADD COLUMN destinatario_bairro text,
  ADD COLUMN destinatario_cidade text,
  ADD COLUMN destinatario_cep text;

-- Fiscal
ALTER TABLE operational_orders
  ADD COLUMN tipo_nf text CHECK (tipo_nf IN ('venda','bonificacao','remessa','nao_aplicavel')),
  ADD COLUMN nf_pendente boolean DEFAULT false;

-- DELETE policy em items (para edit flow)
CREATE POLICY "Authenticated can delete operational_order_items"
  ON operational_order_items FOR DELETE TO authenticated USING (true);
```

### Passo 3 — 6 arquivos de codigo

**1. `src/data/operationalProducts.ts`** — reescrever completo

Interface com `id`, `nome`, `unidade`, `marca`, `categoria` (produto/kit/amostra/material). 33 produtos conforme catálogo aprovado. Helpers: `findProductById(id)` e `productsByBrandAndCategory` (agrupamento duplo).

**2. `src/hooks/useOperationalOrders.ts`**

- Interfaces: adicionar 8 campos destinatario + `tipo_nf` + `nf_pendente` em `OperationalOrder`, `CreateOrderInput`, `UpdateOrderInput`
- `calcIsFiscalExempt`: comparar `item.produto === "LF_FRASS"`
- `nf_pendente` universal: `= !numero_nf` em create/update
- Validar `valor > 0` no hook
- `updateStatus` para Seeding: exigir destinatario (nome/endereco/cidade/cep) se sem customer_id; para `enviado` sem NF, setar `nf_pendente = true` sem bloquear

**3. `src/components/kanban/NewOrderForm.tsx`**

- Natureza: adicionar "Seeding"
- Dropdown: gravar `product.id`, exibir `product.nome (unidade)`, agrupar marca → categoria
- Campos destinatario condicionais (Seeding sem cliente)
- Campo `tipo_nf` (default "bonificacao" para Seeding)
- Validar valor > 0

**4. `src/components/kanban/EditOrderForm.tsx`** — mesmas mudanças

**5. `src/components/kanban/OrderCard.tsx`**

- `findProductById` para nomes amigaveis nos itens
- Badge "SEEDING" roxo
- Badge "⚠ NF PENDENTE" amarelo quando `nf_pendente === true`

**6. `src/pages/KanbanOperacional.tsx`**

- Filtro natureza: adicionar "Seeding"
- CSV: `findProductById` para nomes, colunas Tipo NF / NF Pendente

## Impacto

- 1 data fix + 1 migração (10 colunas, 2 constraints alteradas, 1 RLS policy)
- 1 arquivo reescrito, 5 editados
- `operational_order_items.produto` passa a gravar ID tecnico
- `nf_pendente` universal, sem logica por natureza


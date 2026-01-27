
# Detalhamento Hierárquico: Canal → Produto no Demonstrativo Financeiro

## Objetivo

Expandir o card "Demonstrativo Financeiro" para exibir uma estrutura de dois níveis sob a Receita Líquida:
1. **Nível 1**: Canais de vendas (Amazon, Base, Mercado Livre, Shopify)
2. **Nível 2**: Produtos vendidos dentro de cada canal

---

## Estrutura Visual Proposta

```text
📄 Demonstrativo Financeiro

Receita Bruta                              R$ 14.378  [100%]
  (-) Frete                                 R$ 5.094  [-35.4%]
─────────────────────────────────────────────────────────────
Receita Líquida                             R$ 9.284  [64.6%]
    ├─ Amazon                               R$ 3.200  [34.5%]
    │     ├─ Ração Premium Cães              R$ 1.800  [56.3%]
    │     ├─ Petisco Natural                 R$ 900   [28.1%]
    │     └─ Suplemento Vitamínico           R$ 500   [15.6%]
    ├─ Shopify                              R$ 5.120  [55.2%]
    │     ├─ Kit Alimentação Completa        R$ 2.500  [48.8%]
    │     ├─ Ração Senior                    R$ 1.620  [31.6%]
    │     └─ Petisco Dental                  R$ 1.000  [19.5%]
    └─ Mercado Livre                        R$ 964    [10.4%]
          └─ Ração Filhotes                  R$ 964   [100%]
─────────────────────────────────────────────────────────────
  (-) Custo (8%)                            R$ 743    [-5.2%]
─────────────────────────────────────────────────────────────
Lucro Bruto                                 R$ 8.541

Margem de Contribuição                      92.0%
```

---

## Mudanças Técnicas

### 1. Novo Tipo de Dados

Criar uma nova interface para estrutura hierárquica canal → produtos:

```typescript
interface ProductContribution {
  productName: string;
  revenue: number;
  percentage: number;  // % dentro do canal
}

interface PlatformWithProducts {
  platform: string;
  revenue: number;
  marketShare: number;  // % da receita líquida total
  products: ProductContribution[];
}
```

### 2. Nova Função em `src/utils/financialMetrics.ts`

Criar função `getPlatformPerformanceWithProducts()`:

```text
Lógica:
1. Iterar por todos os pedidos
2. Para cada pedido:
   - Identificar o canal (order.ecommerce)
   - Para cada produto no pedido (order.produtos[]):
     - Acumular revenue no mapa: Map<canal, Map<produto, revenue>>
3. Converter para estrutura hierárquica
4. Ordenar canais por revenue (desc)
5. Ordenar produtos dentro de cada canal por revenue (desc)
6. Limitar top N produtos por canal (ex: top 5)
```

### 3. Modificar `src/components/dashboard/FinancialBreakdownCard.tsx`

**Nova prop:**
```typescript
interface FinancialBreakdownCardProps {
  grossRevenue: number;
  shippingCost: number;
  costPercentage?: number;
  platformBreakdown?: PlatformWithProducts[];  // NOVA
  maxProductsPerChannel?: number;              // NOVA (padrão: 5)
}
```

**Renderização:**
- Após "Receita Líquida", renderizar lista de canais
- Cada canal é expansível (inicialmente colapsado) ou sempre visível
- Dentro de cada canal, listar produtos com indentação
- Usar cores/ícones para diferenciar níveis
- Aplicar limite de produtos exibidos por canal

### 4. Modificar `src/pages/PerformanceFinanceira.tsx`

Calcular e passar os dados hierárquicos:

```typescript
// Calcular breakdown por canal com produtos
const platformWithProducts = useMemo(() => {
  return getPlatformPerformanceWithProducts(periodOrders, 5);
}, [periodOrders]);

// Passar para o componente
<FinancialBreakdownCard
  grossRevenue={financialMetrics.faturamentoBruto}
  shippingCost={financialMetrics.freteTotal}
  costPercentage={financialGoals.custoFixo}
  platformBreakdown={platformWithProducts}
  maxProductsPerChannel={5}
/>
```

---

## Design dos Níveis Hierárquicos

| Nível | Indentação | Estilo | Ícone |
|-------|------------|--------|-------|
| Canal | `ml-4` | `text-sm font-medium` | ├─ ou └─ |
| Produto | `ml-8` | `text-xs text-muted-foreground` | ├─ ou └─ |

**Cores por canal (opcional):**
- Amazon: `#FF9900` (laranja)
- Shopify: `#96BF48` (verde)
- Mercado Livre: `#FFE600` (amarelo)
- Base: `#6366F1` (roxo)

---

## Fluxo de Dados

```text
sales_data (DB)
     ↓
periodOrders (ProcessedOrder[])
     ↓
getPlatformPerformanceWithProducts()
     ↓
PlatformWithProducts[]
     ↓
FinancialBreakdownCard
     ↓
┌─ Canal 1
│   ├─ Produto A
│   ├─ Produto B
│   └─ Produto C
└─ Canal 2
    └─ Produto D
```

---

## Resumo das Alterações

| Arquivo | Ação | Complexidade |
|---------|------|--------------|
| `src/types/marketing.ts` | Adicionar interfaces `ProductContribution` e `PlatformWithProducts` | Baixa |
| `src/utils/financialMetrics.ts` | Criar `getPlatformPerformanceWithProducts()` | Alta |
| `src/components/dashboard/FinancialBreakdownCard.tsx` | Adicionar renderização hierárquica | Alta |
| `src/pages/PerformanceFinanceira.tsx` | Calcular e passar dados hierárquicos | Baixa |

---

## Considerações

- **Performance**: Limitar a 5 produtos por canal para manter o card compacto
- **Consistência**: Usar `breakdownOrders()` para desmembrar kits em produtos individuais
- **Filtro de Amostras**: Excluir "Kit de Amostras" (R$ 0,01) da listagem de produtos
- **UX**: Canais com apenas 1 produto ainda mostram a hierarquia completa

---

## Resultado Esperado

O usuário verá uma estrutura em árvore mostrando:
- Quanto cada canal contribuiu para a Receita Líquida
- Quais produtos foram vendidos em cada canal
- O percentual de cada produto dentro do seu canal

Isso proporciona visibilidade completa sobre a origem das receitas em dois níveis de detalhe.

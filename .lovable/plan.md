
# Reconciliação de Identidade NF -- Implementação Final

## Problema
3.101 pedidos NF entram com `cpfCnpj = ""` (mapeado de `cliente_email` no banco). Todos colapsam em um único "cliente fantasma" no `groupOrdersByCustomer()`, causando ~613 clientes qualificados quando deveriam ser 800+.

## Arquivo: `src/hooks/useDataPersistence.ts`

### 1. Adicionar função `reconcileNFIdentity` (antes do hook, linha 104)

Função pura que:
- Indexa pedidos e-commerce por `numeroPedido` e `numeroPedidoPlataforma` (com `trim()`) em um Map
- Para cada pedido NF com `cpfCnpj` vazio:
  - Tenta match via `numeroPedidoPlataforma` do NF contra o Map
  - Se match com `cpfCnpj` válido: herda `cpfCnpj` e `nomeCliente`
  - Senão: atribui ID sintético `nf-{numeroPedido}`
- Log auditável com: total órfãos, reconciliados, sintéticos, taxa

### 2. Chamar reconciliação dentro de `loadAllData` (entre linhas 179 e 237)

Após construir `salesData` (linha 179), antes de `setStats` (linha 237):

```text
const reconciledSalesData = reconcileNFIdentity(salesData);
```

Substituir `salesData` por `reconciledSalesData` em:
- `setStats` (linha 237): `salesCount: reconciledSalesData.length`
- `console.log` (linha 245): `vendas: reconciledSalesData.length`
- `return` (linha 252): `salesData: reconciledSalesData`

## Campos confirmados no código

- `fonteDados` (linha 174): `'nf' | 'ecommerce'` -- correto
- `cpfCnpj` (linha 146): vem de `row.cliente_email` -- é o campo de identidade
- `numeroPedidoPlataforma` (linha 176): chave de reconciliação
- `numeroPedido` (linha 144): chave secundária

## O que NÃO muda

- Nenhuma deduplicação
- Nenhuma alteração no banco
- Campos fiscais intocados
- Total de pedidos e receita permanecem idênticos
- Nenhum outro arquivo é modificado

## Resultado esperado

- Zero pedidos com `cpfCnpj = ""`
- Clientes qualificados: ~613 para ~800+
- Nov/2025: ~3 para ~38 clientes visíveis
- Log no console com taxa de reconciliação para validação

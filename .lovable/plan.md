

# Reclamacao vinculada a Pedido -- Implementacao

## Resumo

Reestruturar a pagina "Nova Reclamacao" para o fluxo **Cliente -> Pedido -> Reclamacao**. Adicionar `order_id` no banco, substituir autocomplete por query dedicada, carregar pedidos do cliente selecionado, auto-preencher campos a partir do pedido, e validar campos obrigatorios.

## 1. Migration: adicionar `order_id` em `customer_complaint`

```sql
ALTER TABLE customer_complaint
ADD COLUMN order_id uuid REFERENCES sales_data(id) ON DELETE SET NULL;

CREATE INDEX idx_complaint_order_id ON customer_complaint(order_id);
```

Nullable para manter compatibilidade com reclamacoes historicas.

## 2. Reescrever `src/pages/ReclamacaoNova.tsx`

### Remocoes
- Modo "novo cliente" (toggle, campos nome/email, `UserPlus` button)
- Dependencia de `useCustomerData` -- substituida por query dedicada na tabela `customer`

### Novo fluxo

**Etapa 1 -- Selecionar Cliente**
- Query dedicada: `customer` table, select `id, nome, cpf_cnpj`, filtro `is_active = true`, `.limit(5000)`
- Query key: `['customers-autocomplete']`, staleTime 10min
- Busca client-side por nome + cpf_cnpj (case-insensitive), top 20 resultados
- Ao trocar cliente: resetar pedido selecionado e todos campos auto-preenchidos

**Etapa 2 -- Selecionar Pedido** (aparece apos selecionar cliente)
- Query: `sales_data` filtrado por `cliente_email = customer.cpf_cnpj`
- Seleciona: `id, numero_pedido, numero_nota, data_venda, forma_envio, natureza_operacao, status, produtos`
- `.order('data_venda', { ascending: false }).limit(50)`
- Tabela compacta com radio buttons: Numero Pedido, Data, NF, Forma Envio, Status
- Badge "Exibindo ultimos 50 pedidos" quando houver 50 resultados
- Loading state, mensagem vazia se nao ha pedidos

**Etapa 3 -- Auto-preenchimento ao selecionar pedido**
- `nf_produto` <- `numero_nota`
- `transportador` <- `forma_envio`
- `natureza_pedido` <- `natureza_operacao`
- `produto` <- Se multiplos produtos no JSON, renderizar Select com `descricaoAjustada || descricao` de cada produto. Se unico, preencher direto. Campo editavel.
- Todos campos auto-preenchidos permanecem editaveis

**Campos manuais restantes:**
Canal, Gravidade, Tipo de Reclamacao, Data do Contato, Descricao, Lote, Atendente, Link, Local da Compra, Acao/Orientacao

**Validacao para submit (todos obrigatorios):**
- `customer_id` + `order_id` + `descricao` + `tipo_reclamacao` + `gravidade` + `data_contato`

**Mutation:** salva `order_id` junto com todos os campos. Invalida queries de complaints.

## 3. Fix `src/hooks/useCustomerData.ts`

Adicionar `.limit(5000)` na query de `customer_full` para corrigir o bug de 1000 rows que afeta outras paginas (Clientes, Segmentacao, Churn).

```typescript
.from('customer_full')
.select('*')
.limit(5000)
```

## Arquivos modificados

1. **Migration SQL** -- `order_id` em `customer_complaint`
2. **`src/pages/ReclamacaoNova.tsx`** -- reescrita completa do fluxo (cliente -> pedido -> reclamacao)
3. **`src/hooks/useCustomerData.ts`** -- adicionar `.limit(5000)`

## Detalhes tecnicos

- Join: `customer.cpf_cnpj = sales_data.cliente_email` (confirmado que ambos armazenam CPF/CNPJ)
- JSON `produtos` usa campos `descricaoAjustada` (prioritario) e `descricao` (fallback)
- Lote permanece manual (nao existe no JSON dos pedidos)
- `data_contato` default = hoje, obrigatorio
- Pedidos cancelados/devolvidos sao exibidos (decisao operacional)
- Ao trocar cliente, pedido selecionado e campos auto-preenchidos sao resetados para evitar vinculo cruzado


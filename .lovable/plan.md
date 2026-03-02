
# CRM: Editar Reclamacoes, Selecao de Pedido e Contato do Cliente

## Resumo

Tres melhorias no perfil do cliente (aba CRM):

1. **Editar reclamacoes existentes** -- hoje so da para criar, nao editar
2. **Selecao automatica de pedido** ao criar reclamacao (igual ja funciona na pagina `/reclamacoes/nova`)
3. **Mostrar telefone e email** no header do perfil do cliente

---

## Mudancas

### 1. Adicionar funcao `updateComplaint` no hook `useComplaints.ts`

Criar uma mutation `updateComplaint` que faz UPDATE em `customer_complaint` com todos os campos editaveis (descricao, gravidade, status, tipo_reclamacao, produto, lote, nf_produto, canal, atendente, acao_orientacao, local_compra, transportador, link_reclamacao).

### 2. Criar componente `ComplaintEditForm.tsx`

Modal de edicao similar ao `ComplaintForm.tsx`, mas pre-populado com os dados da reclamacao existente. Campos editaveis: canal, gravidade, tipo_reclamacao, descricao, produto, lote, nf_produto, local_compra, atendente, acao_orientacao, link_reclamacao, status.

### 3. Atualizar `ComplaintList.tsx` com botao de editar

Adicionar um botao de edicao (icone Pencil) em cada card de reclamacao. Ao clicar, abre o `ComplaintEditForm` com os dados pre-preenchidos.

### 4. Refatorar `ComplaintForm.tsx` para selecao de pedido

Substituir o campo de texto livre "NF do Produto" por um fluxo de selecao de pedido:
- Buscar os pedidos do cliente via `sales_data` (query por `cliente_email = cpf_cnpj`)
- Exibir um Select/dropdown com os pedidos do cliente (numero_pedido + data)
- Ao selecionar um pedido, auto-preencher NF, transportador e produto (mesmo padrao do `ReclamacaoNova.tsx`)

Para isso, o `ComplaintForm` precisara receber o `cpfCnpj` do cliente como prop (alem do `customerId`).

### 5. Mostrar email e telefone no `CustomerProfileHeader.tsx`

- Buscar dados da tabela `customer_identifier` onde `customer_id = customer.id`
- Exibir email (se existir) e telefone (se existir) no header, abaixo do CPF/CNPJ
- Como telefone nao existe no banco atualmente (apenas 27 emails e 924 CPFs registrados), o campo aparecera como "--" mas estara pronto para quando o dado for inserido

### 6. Atualizar `ClientePerfil.tsx`

- Passar `cpfCnpj` para o `ComplaintForm`
- Passar a funcao `updateComplaint` do hook para o `ComplaintList`
- Passar os identificadores (email/telefone) para o `CustomerProfileHeader`

---

## Detalhes tecnicos

### Busca de identificadores
```text
SELECT type, value FROM customer_identifier WHERE customer_id = ?
```
Filtrando por `type IN ('email', 'phone')` para exibir no header.

### Selecao de pedido no ComplaintForm
Reutilizar a mesma logica do `ReclamacaoNova.tsx`:
- Query: `sales_data` filtrado por `cliente_email = cpfCnpj`, ordenado por data desc, limit 50
- Ao selecionar pedido: auto-fill NF, transportador, natureza, produto
- Enviar `order_id` junto com a reclamacao

### Edicao de reclamacao
- UPDATE na tabela `customer_complaint` (RLS ja permite: "Authenticated can update complaints")
- Campos editaveis: todos exceto `customer_id`, `created_at`, `created_by`

### Nenhuma mudanca no banco de dados necessaria
- A tabela `customer_complaint` ja suporta UPDATE via RLS
- A tabela `customer_identifier` ja tem os dados de email
- O campo `order_id` ja existe na tabela `customer_complaint`

## Arquivos modificados
1. `src/hooks/useComplaints.ts` -- adicionar mutation updateComplaint
2. `src/components/crm/ComplaintForm.tsx` -- adicionar selecao de pedido
3. `src/components/crm/ComplaintList.tsx` -- adicionar botao editar + modal
4. `src/components/crm/ComplaintEditForm.tsx` -- novo componente
5. `src/components/crm/CustomerProfileHeader.tsx` -- mostrar email/telefone
6. `src/pages/ClientePerfil.tsx` -- passar props adicionais

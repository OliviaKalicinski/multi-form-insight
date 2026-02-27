

# Nova Reclamacao Page

## Summary
Create a standalone page at `/reclamacoes/nova` for registering complaints. Simple, functional, no overengineering. Three blocks: customer identification, complaint data, submit button.

## Files to Create

### 1. `src/pages/ReclamacaoNova.tsx`
Full-page form with:

**Block 1 - Customer Identification**
- Toggle between "Cliente existente" and "Novo cliente"
- Existing: search input that filters customers by name/cpf_cnpj, clickable list showing top 20 matches, selected customer confirmation
- New: name + email fields, creates customer on submit with `cpf_cnpj = email` and `observacoes = 'Cliente criado via formulário de reclamação'`

**Block 2 - Complaint Data**
All fields from the schema, organized in a clean grid:
- Canal (select: WhatsApp, E-mail, SAC, Instagram, Telefone, Reclame Aqui, Outro)
- Gravidade (select: Baixa, Media, Alta, Critica)
- Tipo de Reclamacao (select: Qualidade, Entrega, Atendimento, Produto Errado, Falta de Produto, Validade, Embalagem, Outro)
- Data do Contato (date input, default: today)
- Descricao (textarea, required)
- Produto, Lote, NF do Produto, Local da Compra, Transportador, Natureza do Pedido, Atendente (text inputs)
- Link da Reclamacao (URL input)
- Acao/Orientacao (textarea)

**Block 3 - Submit**
- Single "Salvar Reclamacao" button
- Loading state while saving
- Toast success/error
- Redirects to `/reclamacoes` on success

**Mutation logic (inline, no separate hook needed for MVP)**
- If "new customer" mode: INSERT into `customer` first, get `id`
- INSERT into `customer_complaint` with all fields, `status = 'aberta'`
- Invalidate `complaints` and `complaints-all` query keys
- No edge function needed -- authenticated user passes RLS

## Files to Modify

### 2. `src/App.tsx`
- Import `ReclamacaoNova`
- Add route: `/reclamacoes/nova` with same ProtectedRoute + AuthenticatedLayout wrapper
- Place it BEFORE the `/reclamacoes` route to avoid route matching issues

### 3. `src/pages/Reclamacoes.tsx`
- Add a "Nova Reclamacao" button in the header (next to Export CSV)
- `onClick={() => navigate('/reclamacoes/nova')}`

## Technical Details

- Uses existing `useCustomerData` hook for customer list
- Uses `useMutation` from tanstack-react-query directly (no new hook file)
- Customer search filters by `nome` and `cpf_cnpj` (case-insensitive), limited to 20 results
- Date field sends ISO string with noon time to avoid timezone issues
- Empty string fields sent as `null` to keep database clean
- Validation: requires `descricao` + valid customer (selected or new with name+email)
- No schema changes needed -- all fields already exist in `customer_complaint`


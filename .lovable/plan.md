

## Corrigir timeout do import-shopify-customers (504 IDLE_TIMEOUT)

### Diagnóstico
A planilha tem **6.044 linhas**, divididas em lotes de 500. Cada chamada da edge function:
1. Recarrega TODOS os índices do banco (customers + identifiers) — ~5–10s por chamada.
2. Processa 500 linhas, cada uma com 3–4 queries individuais (insert customer, select phones, insert/update identifier).

Resultado: cada lote ultrapassa o limite de 150s da edge function → **504 IDLE_TIMEOUT**. Por isso a importação trava.

### Solução

**1. Reduzir BATCH_SIZE de 500 para 150** (`src/pages/ImportarClientesShopify.tsx`)
- Lotes menores cabem dentro dos 150s. ~40 lotes em vez de 12, mas cada um termina rápido.
- Atualizar a estimativa de tempo exibida ao usuário.

**2. Remover queries redundantes dentro do loop** (`supabase/functions/import-shopify-customers/index.ts`)
- O bloco que faz `SELECT existingPhones` por linha é o maior gargalo. Substituir por consulta ao índice `phoneIndex` em memória (já carregado) — se o cliente já está mapeado a algum telefone no índice, atualizar via `update ... eq("customer_id", id).eq("type", "phone")` direto, sem o select prévio.
- Mover `update shopify_customer_id` para só executar quando realmente mudou (já carregado no índice).

**3. Pular linhas sem `Customer ID` E sem email/telefone mais cedo** (frontend)
- Olhando o CSV: várias linhas têm 0 contatos (`shopify-forms-…` test customers). Filtrar antes de mandar reduz o volume real.

**4. Adicionar log por lote no frontend**
- Mostrar no console qual lote está rodando + tempo decorrido, pra facilitar debug futuro.

### Arquivos modificados
- `src/pages/ImportarClientesShopify.tsx` — `BATCH_SIZE = 150`, filtro adicional de linhas sem contato, log por lote
- `supabase/functions/import-shopify-customers/index.ts` — eliminar `SELECT existingPhones` por linha usando `phoneIndex`, evitar `update` desnecessário de `shopify_customer_id`

### Resultado esperado
- Cada lote roda em 30–60s (bem abaixo dos 150s).
- Importação completa em ~15–25 minutos para os 6k clientes (rodando lotes em série, como já está).
- Zero erros de timeout.




## Corrigir erros de TypeScript no `import-shopify-customers`

### Diagnóstico

Após confirmar o comportamento "telefone só é adicionado se cliente ainda não tem nenhum", o build falha em 4 pontos da edge function porque `customerId` está tipado como `string | null` quando passado para `Map.set(...)`, que exige `string`.

Os 4 erros estão nas linhas 191, 193, 217, 238 — todos dentro do bloco que executa **depois** de criar/identificar o cliente, momento em que `customerId` já é garantidamente `string` (não-nulo). É só uma limitação de inferência do TS.

### Solução

Adicionar uma asserção/narrowing logo após `customerId` estar definitivamente atribuído, para que o TypeScript pare de tratá-lo como `string | null` no resto do escopo.

### Mudança em `supabase/functions/import-shopify-customers/index.ts`

- Após o bloco `if (!customerId) { ...insert... } else { ...update... }`, adicionar:
  ```typescript
  // narrowing: a este ponto customerId é garantidamente string
  const cid: string = customerId!;
  ```
- Substituir as 4 ocorrências de `customerId` nas linhas 191, 193, 217, 238 (e demais usos restantes na função `processRow` daqui em diante, incluindo os `.insert({ customer_id: customerId, ...})` e o `.eq("id", customerId)` se ainda existirem após esse ponto) por `cid`.

Isso elimina os 4 erros TS2345 sem mudar nenhum comportamento.

### Deploy

Após o ajuste, redeployar a função `import-shopify-customers` para o Supabase.

### Arquivos modificados

- `supabase/functions/import-shopify-customers/index.ts` — narrowing de `customerId` para `cid: string`.


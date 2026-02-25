

# Assert Economic Invariants - Implementacao

## Resumo

Criar a edge function permanente `assert-economic-invariants` com protecao por header secreto, cobrindo os 4 cenarios de invariancia economica + sanidade global.

## Arquivos

### 1. `supabase/functions/assert-economic-invariants/index.ts`

Edge function que:
- Valida header `x-assert-key` contra secret `ASSERT_KEY`
- Executa 4 cenarios com prefixo `TEST-BLIND-{timestamp}`
- Cleanup preventivo e final
- Retorna HTTP 200 (todos passaram) ou HTTP 500 (falha)

**Cenarios:**

1. **Ecommerce -> NF**: Insere ecommerce, depois NF. Verifica COUNT total = 1, fonte_dados = nf, COUNT ecommerce = 0
2. **NF -> Ecommerce (bloqueio)**: Insere NF, tenta ecommerce. Verifica erro retornado, COUNT total = 1, fonte_dados = nf, COUNT ecommerce = 0
3. **Duplicata NF (idempotencia)**: Insere NF com valor 100, upsert com valor 200. Verifica COUNT = 1, valor_total = 200
4. **Ecommerce isolado (idempotencia)**: Insere ecommerce com valor 50, upsert com valor 75. Verifica COUNT = 1, valor_total = 75, fonte_dados = ecommerce

**Sanidade global pos-cleanup:**
- Query por `numero_pedido LIKE 'TEST-BLIND-%' OR numero_nota LIKE 'TEST-BLIND-%'` deve retornar 0
- Contagem geral por `fonte_dados` (informativa)

**Seguranca:**
- Header `x-assert-key` obrigatorio, comparado contra env `ASSERT_KEY`
- Retorna 401 se ausente ou incorreto

### 2. Secret `ASSERT_KEY`

Solicitar ao usuario via `add_secret` para configurar uma chave de autorizacao.

### 3. `.lovable/plan.md`

Atualizar com status da implementacao.

## Detalhes Tecnicos

- Usa `createClient` com `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Campos obrigatorios por registro: `data_venda`, `valor_total`, `produtos` (NOT NULL no schema)
- NF requer `numero_nota` (CHECK constraint), ecommerce requer `numero_pedido` (CHECK constraint)
- Upsert NF usa `onConflict: "numero_nota,serie"`, upsert ecommerce usa `onConflict: "numero_pedido,fonte_dados"`
- Cenario 2 valida estado apos erro (COUNT + fonte_dados), nao apenas presenca de erro


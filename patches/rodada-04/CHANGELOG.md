# Rodada 04 — 2026-04-22

Conjunto de correções pontuais, feature anexo-no-card e higiene de marca.

## 1) Bugs corrigidos

### Bug #1 — Farinha BSF "Desidratada" ≠ "Desengordurada"
**Sintoma:** NFs traziam "Farinha BSF Desidratada" e o sistema criava SKU separado do
"Farinha BSF Desengordurada" (nome oficial), fragmentando a contagem de produção.

**Causa raiz:** regex de normalização reconhecia as duas grafias como produtos distintos.

**Opção escolhida:** regex aceita as duas grafias e consolida tudo no SKU oficial
`LF_FARINHA_BSF_DESENGORDURADA`. Evita migração de dados e zero-config para NFs legadas.

**Arquivos alterados:**
- `src/data/operationalProducts.ts` — removido SKU duplicado `LF_FARINHA_BSF_DESIDRATADA`.
- `src/utils/productNormalizer.ts` — regex unificado `desengordurada|desidratada` → Desengordurada.
- `supabase/functions/process-nf-pdf/index.ts` — mesmo tratamento na Edge Function.

### Bug #3 — Reclamações: filtro de pedidos pelo CPF/CNPJ errado
**Sintoma:** ao criar reclamação, a lista de pedidos do cliente vinha vazia mesmo
com pedidos existentes.

**Causa raiz:** query filtrava `.eq("cliente_email", selectedCustomer.cpf_cnpj)` — comparava
e-mail do cliente contra CPF/CNPJ. Mismatch puro de coluna.

**Arquivo alterado:**
- `src/pages/ReclamacaoNova.tsx` linha 126 — `cliente_email` → `cpf_cnpj`.

### Bug #5 — Novos registros via CSV não apareciam no Kanban
**Sintoma:** import em `/cadastro-influenciadores` inseria com `kanban_status = NULL`; a
query do kanban filtra `.not("kanban_status", "is", null)` e os registros ficavam invisíveis.

**Causa raiz:** coluna `influencer_registry.kanban_status` sem `DEFAULT`. A função
`influencerToDBRow` também omitia o campo no upsert.

**Opção escolhida:** fix no nível de banco via `ALTER COLUMN ... SET DEFAULT 'prospeccao'`.
Motivo: preserva o padrão existente de **soft-delete** (UPDATE SET kanban_status = NULL para
arquivar). Um DEFAULT só dispara em INSERT que omite a coluna — não mexe em UPDATE nem em
registros já arquivados.

**Arquivo novo:**
- `supabase/migrations/20260422200000_kanban_status_default.sql`

> Registros arquivados (NULL) **continuam arquivados** — comportamento intencional. Se
> Bruno quiser ressuscitar algum, faz manualmente no Supabase Studio (UPDATE ... SET
> kanban_status = 'prospeccao' WHERE id = '...').

## 2) Feature nova

### Bug #4 — Anexar orçamento do fornecedor direto no card
**Pedido:** poder anexar o PDF/imagem do orçamento recebido do fornecedor sem precisar
abrir o Sheet lateral (fluxo 1-clique).

**Implementação:**
- Rodapé do card ganhou: badge `📎 N anexos` + botão `Anexar orçamento`.
- Click dispara `<input type="file">` oculto global com `budgetId` guardado em ref.
- Reutiliza `uploadMutation` existente (mesmo bucket `budget-attachments`, mesma tabela
  `budget_attachments`). Zero duplicação de lógica.
- Nova query `budget-attachment-counts` traz contagens por budget_id para todos os cards
  de uma vez (1 round-trip, não N).
- Invalidação de cache adicionada em `uploadMutation`, `deleteAttachmentMutation`,
  `createMutation` e `updateMutation` para manter o badge sempre correto.
- Botão usa `e.stopPropagation()` para não abrir o Sheet ao anexar.

**Arquivo alterado:**
- `src/pages/OrcamentosAprovacao.tsx` — +74 linhas.

### Bug #6 — Reclassificação Buzz Fly + Fiotec → B2B
**Pedido:** "BUZZ FLY P&D EM ALIM está classificada como B2B2C, corrigir para B2B.
Confirmar que Fiotec também esteja em B2B."

**Causa raiz:** `determineSegment` em `invoiceParser.ts` classifica Serie 1 sem unidade
de peso (kg/L) como B2B2C. Clientes institucionais (P&D, Fiotec) podem comprar em
embalagens não-peso mas comercialmente são B2B.

**Fix em 2 camadas:**
- **Código (imports futuros):** whitelist `B2B_ALWAYS_PATTERNS` em `invoiceParser.ts`
  sobrescreve a classificação automática. Matching por substring case-insensitive
  na razão social (`Nome Cliente` da NF). Patterns iniciais: `buzz fly`, `fiotec`.
- **Dados históricos:** migration SQL roda `UPDATE sales_data SET segmento_cliente = 'b2b'`
  em todas as linhas que batem com os patterns. Idempotente (`IS DISTINCT FROM 'b2b'`).

**Arquivos alterados:**
- `src/utils/invoiceParser.ts` — whitelist + assinatura de `determineSegment`.
- `supabase/migrations/20260422201000_reclassify_b2b_whitelist.sql` (novo).

> Pra adicionar novos clientes B2B-sempre, basta editar `B2B_ALWAYS_PATTERNS`.
> Recomendado complementar com CNPJ quando disponível (matching mais preciso).

## 3) Higiene de marca — "Let's Fly" → "Lets Fly"

Remoção do apóstrofo em toda a UI. Motivo: consistência com o nome oficial registrado.

**Arquivos alterados:**
- `src/components/AppSidebar.tsx`
- `src/components/GlobalFilter.tsx`
- `src/pages/LetsFly.tsx`
- `src/pages/PaginaInteligente.tsx`
- `src/pages/VisaoExecutivaV2.tsx`

## 4) Como aplicar

```bash
# 1. Build local (já validado — passou)
cd multi-form-insight
npm run build

# 2. Push pra main → Lovable aplica migration automaticamente
git push origin main

# 3. Verificação pós-deploy (Supabase Studio, SQL Editor):
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='influencer_registry'
  AND column_name='kanban_status';
-- Esperado: column_default = 'prospeccao'::text
```

## 5) O que NÃO foi feito nesta rodada

- Bug #2: sem repro clara, pulado conforme alinhamento.
- Auditoria sistêmica de `invalidateQueries`: hipótese descartada (93% das mutations
  já invalidam corretamente). Cancelada sem prejuízo.
- UI para "ressuscitar" influenciadores arquivados (NULL): decisão de não mexer para
  não expor mecânica de soft-delete. Se virar necessidade, vira Rodada 05.

## 6) Risco / Rollback

- **Migration `kanban_status_default`:** reversível com
  `ALTER TABLE public.influencer_registry ALTER COLUMN kanban_status DROP DEFAULT;`
- **Farinha unificação:** reversível editando os 3 regex de volta. Dados já gravados
  como `LF_FARINHA_BSF_DESIDRATADA` continuam funcionando (o SKU físico foi removido
  da lista mas o ID ainda é aceito em leituras). Se houver produção ativa com esse SKU,
  rodar UPDATE migratório em `operational_production`.
- **Anexo no card:** feature aditiva; remover o bloco JSX do rodapé do card reverte.



## Reorganização dos filtros da página Clientes

Validei o plano contra o código. Concordo com 90% — só ajusto: **manter `churn_status` e `journey_stage` como dados separados nas colunas/badges da tabela** (já são colunas distintas e ordenáveis), **unificar só a UX dos filtros** num único seletor "Status". E agora incorporo a regra: **a aba Leads é exclusivamente B2C** (origem Shopify Comida de Dragão).

### O que muda

**Antes** — 3 zonas visuais, 10 estados, 2 componentes, Canal/Jornada como botões soltos:

```text
[ Search | Churn | Segmento | Pet | Resp ]      ← CustomerFilters
[ Canal: Todos B2C B2B2C B2B ]                  ← botões soltos
[ Jornada: Todas Novo Recorrente Campeã … ]     ← botões soltos
```

**Depois** — 1 zona visual, 1 componente `UnifiedFilters`:

```text
Clientes:
[🔍 Buscar | Canal ▾ | Status ▾ | Segmento ▾ | Pet ▾ | Responsável ▾ ]

Leads (B2C fixo, vindo do Shopify Comida de Dragão):
[🔍 Buscar | Origem ▾ | Contato ▾ | Responsável ▾ ]
```

### Decisões concretas

1. **Aba Leads é exclusivamente B2C**:
   - Quando `viewMode === "leads"`, o `channelFilter` é forçado para `"B2C"` no hook (e ignora qualquer outra seleção).
   - O **Select de Canal não é renderizado** na visão Leads — não faz sentido escolher canal se é fixo.
   - Adicionar um pequeno **badge informativo** ao lado do título da aba: `"B2C · Shopify Comida de Dragão"`, deixando explícita a origem dos dados.
   - Comentário no hook documentando a regra para futuros devs.

2. **Novo componente `UnifiedFilters`** (`src/components/crm/UnifiedFilters.tsx`) recebe `viewMode` como prop e renderiza o conjunto correto de selects. Substitui `CustomerFilters` + `LeadsFilters`.

3. **Canal vira `Select`** (apenas na visão Clientes), em vez de botões soltos. Mantém badges coloridos via `SEGMENT_COLORS` dentro dos `SelectItem`.

4. **Filtro "Status" unificado** combina `churn` + `journey` na UI (apenas visão Clientes):
   - Opções: `Todos`, `Ativo`, `Novo`, `Recorrente`, `Campeã`, `Em Risco`, `Inativo`, `Perdido/Churn`
   - Mapeamento interno:
     - `Ativo` → `churn=active, journey=all`
     - `Novo` / `Recorrente` / `Campeã` → `journey=<x>, churn=all`
     - `Em Risco` → `journey=risco, churn=all`
     - `Inativo` → `churn=inactive, journey=all`
     - `Perdido/Churn` → `journey=perdido, churn=all`
   - Colunas de Churn e Jornada na tabela continuam intactas.

5. **Novo hook `useCustomerFilters`** (`src/hooks/useCustomerFilters.ts`) centraliza os 10 estados, o `useMemo` do `filtered`, o `resetPage()` e a regra B2C-fixo-em-leads. Retorna `{ filters, setters, filtered }`.

6. **Search placeholder corrigido** para `"Buscar por nome, CPF/CNPJ, email ou telefone..."` em ambos os modos.

7. **`Clientes.tsx` enxuga ~120 linhas**: removidos blocos de botões "Canal" e "Jornada", `if/else LeadsFilters/CustomerFilters` e os 10 `useState`.

### Arquivos modificados/criados

- **NOVO** `src/components/crm/UnifiedFilters.tsx`
- **NOVO** `src/hooks/useCustomerFilters.ts`
- `src/pages/Clientes.tsx` — usa hook + componente novo, adiciona badge "B2C · Shopify Comida de Dragão" no header da aba Leads
- `src/components/crm/CustomerFilters.tsx` — re-export de `UnifiedFilters` (compat) ou removido
- `src/components/crm/LeadsFilters.tsx` — idem

### Resultado esperado

- Painel de filtros em **1 linha visual** responsiva
- 6 controles na visão Clientes, 4 na visão Leads (Canal removido por ser fixo)
- Origem dos leads (B2C / Shopify CdD) explícita na UI
- Zero quebra de comportamento nas colunas e badges da tabela
- `Clientes.tsx` perde ~120 linhas de boilerplate


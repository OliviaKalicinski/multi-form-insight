

# Coluna Pet na Lista de Clientes + Util Compartilhado

## Mudanças

### 1. `src/utils/petProfile.ts` — NOVO
Extrair a lógica de classificação de pet por cliente para um utilitário compartilhado:

```typescript
export function buildClientPetMap(salesData: ProcessedOrder[]): Map<string, BuyerPetProfile>
```

Fluxo interno:
- `getB2COrders(salesData)` → para cada pedido com `cpf_cnpj`
- Normaliza CPF (`replace(/\D/g, '')`)
- Para cada produto: `FRIENDLY_TO_ID[p.descricaoAjustada]` → `PRODUCT_ANIMAL_MAP[productId]`
- Agrupa `Set<AnimalSignal>` por cliente → classifica (0=nao_identificado, 1=espécie, >1=multiplos)
- Retorna `Map<cpf_normalizado, BuyerPetProfile>`

Também exportar:
```typescript
export function getClientPetSpecies(salesData: ProcessedOrder[], cpf: string): AnimalSignal[]
```
Para uso no badge de "Múltiplos" (mostrar quais espécies: "Cães • Gatos").

### 2. `src/hooks/useBuyerProfile.ts` — Refatorar
Substituir a lógica inline de classificação por chamada a `buildClientPetMap` do novo util. Manter toda a agregação de métricas (contagem, receita, ticket, geografia) no hook.

### 3. `src/pages/Clientes.tsx` — Adicionar coluna Pet
- Importar `useDashboard` para acessar `salesData`
- Importar `buildClientPetMap` de `petProfile.ts`
- Computar `petMap` via `useMemo(() => buildClientPetMap(salesData), [salesData])`
- Adicionar coluna "Pet" na tabela com badge colorido (sem emoji):
  - Usa `PET_PROFILE_LABELS` e `PET_PROFILE_COLORS`
  - Para "Múltiplos": mostra sub-label com espécies (ex: "Cães • Gatos")
  - Para "Não identificado": célula vazia (sem badge)
- Adicionar `petFilter` state + filtro no `CustomerFilters`
- Adicionar sort key `'pet'` com ordem semântica via `PET_PROFILE_ORDER`
- Merge com customer data via `cpf_cnpj` normalizado

### 4. `src/components/crm/CustomerFilters.tsx` — Adicionar filtro Pet
Adicionar um Select para filtrar por perfil de pet (Cães, Gatos, Exóticos, Múltiplos, Não identificado, Todos).

## Arquivos tocados (4)

| Arquivo | Ação |
|---------|------|
| `src/utils/petProfile.ts` | Criar — lógica compartilhada |
| `src/hooks/useBuyerProfile.ts` | Refatorar — usar `buildClientPetMap` |
| `src/pages/Clientes.tsx` | Coluna Pet + filtro + sort |
| `src/components/crm/CustomerFilters.tsx` | Adicionar filtro por pet |




# Perfil de Compradores B2C — Plano Corrigido (v3)

## Correção obrigatória aplicada

`productId` **não existe** na estrutura `produtos[]` do `ProcessedOrder`. O campo disponível é `descricaoAjustada` (já normalizado pelo parser no momento do upload).

A solução correta é usar `FRIENDLY_TO_ID[descricaoAjustada]` — um lookup direto no mapa existente, sem re-executar `normalizeFiscalProduct`. Isso é seguro porque `descricaoAjustada` já é o output do parser.

```text
Fluxo no hook:
order.produtos[i].descricaoAjustada
  → FRIENDLY_TO_ID[descricaoAjustada]
  → productId
  → PRODUCT_ANIMAL_MAP[productId]
  → AnimalSignal | undefined
```

## Arquivos (3)

### 1. `src/data/operationalProducts.ts`
Adicionar exports:

```typescript
export type AnimalSignal = 'caes' | 'gatos' | 'exoticos';
export type BuyerPetProfile = 'caes' | 'gatos' | 'exoticos' | 'multiplos' | 'nao_identificado';

export const PRODUCT_ANIMAL_MAP: Record<string, AnimalSignal> = {
  CD_SUPLEMENTO_INTEGRAL_180G: 'caes',
  CD_SUPLEMENTO_CONCENTRADO_200G: 'caes',
  CD_AMOSTRA_SUPLEMENTO_INTEGRAL: 'caes',
  CD_AMOSTRA_SUPLEMENTO_CONCENTRADO: 'caes',
  CD_SUPLEMENTO_GATOS_180G: 'gatos',
  CD_KIT_GATOS: 'gatos',
  CD_AMOSTRA_GATOS: 'gatos',
  CD_GRUB_120G: 'exoticos',
  CD_AMOSTRA_GRUB: 'exoticos',
};

export const PET_PROFILE_ORDER: BuyerPetProfile[] = [
  'caes', 'gatos', 'exoticos', 'multiplos', 'nao_identificado'
];

export const PET_PROFILE_LABELS: Record<BuyerPetProfile, string> = {
  caes: 'Cães', gatos: 'Gatos', exoticos: 'Exóticos',
  multiplos: 'Múltiplos', nao_identificado: 'Não identificado',
};

export const PET_PROFILE_COLORS: Record<BuyerPetProfile, string> = {
  caes: '#3B82F6', gatos: '#8B5CF6', exoticos: '#10B981',
  multiplos: '#F97316', nao_identificado: '#9CA3AF',
};
```

### 2. `src/hooks/useBuyerProfile.ts` — NOVO

- Importa `getB2COrders`, `isRevenueOrder`, `getOfficialRevenue` de `revenue.ts`
- Importa `FRIENDLY_TO_ID` de `productNormalizer.ts`
- Importa `PRODUCT_ANIMAL_MAP` de `operationalProducts.ts`
- Resolve animal signal via: `FRIENDLY_TO_ID[p.descricaoAjustada]` → `PRODUCT_ANIMAL_MAP[productId]`
- Agrupa por `cpf_cnpj.replace(/\D/g, '')` → `Set<AnimalSignal>` por cliente
- Classifica: size=0 → nao_identificado, size=1 → espécie, size>1 → multiplos
- Calcula: contagem, receita (só vendas), ticket médio (com guard `/0`) por perfil
- Índice de preenchimento: identificados / total
- Geografia: Top 10 UFs e Cidades por volume de pedidos B2C de venda
- Tudo memoizado com `useMemo`

### 3. `src/pages/Publico.tsx`

Seção "Perfil dos Compradores (B2C)" abaixo do conteúdo Instagram:
- Badge: "Pet identificado em X de Y clientes (Z%)"
- Top 10 Estados (bar horizontal)
- Top 10 Cidades (bar horizontal)
- Distribuição por pet (donut) — ordem e cores fixas
- Receita por pet (bar vertical)
- Ticket médio por pet (métrica inline)
- Se não houver salesData, mensagem orientando upload




# Unificar classificação de pet — Plano v7 final (implementação)

Todos os pontos do feedback resolvidos. A correção chave do último round: o fallback para amostras deve aplicar keyword matching no `descricao` raw para resolver o nome correto do catálogo antes de consultar `FRIENDLY_TO_ID`.

## Mudanças

### 1. `src/utils/petProfile.ts` — Adicionar `classifyProductsByAnimal`

Nova função exportada que classifica um conjunto de produtos:

```typescript
export function classifyProductsByAnimal(
  produtos: Array<{ descricao?: string; descricaoAjustada?: string }>
): BuyerPetProfile
```

Pipeline por produto:
1. `FRIENDLY_TO_ID[p.descricaoAjustada]` → `PRODUCT_ANIMAL_MAP[id]` → sinal (funciona para suplementos, grub, kits)
2. **Fallback para amostras**: se `descricaoAjustada === "Kit de Amostras"` e o passo 1 não deu sinal, usar keyword matching no `p.descricao` raw para resolver o nome de catálogo correto (`"Amostra Gatos"`, `"Amostra Grub"`, etc.), depois `FRIENDLY_TO_ID` → `PRODUCT_ANIMAL_MAP`
3. Acumular `Set<AnimalSignal>` → 0 sinais = `nao_identificado`, 1 = espécie, >1 = `multiplos`

Mapa de keywords para fallback (inline, 4 entradas — apenas as amostras com sinal animal):
```typescript
const SAMPLE_RAW_TO_FRIENDLY: [RegExp, string][] = [
  [/gato/i,        'Amostra Gatos'],
  [/grub/i,        'Amostra Grub'],
  [/concentrad/i,  'Amostra Suplemento Concentrado'],
  [/integral/i,    'Amostra Suplemento Integral'],
];
```

Refatorar `buildClientPetMap` para usar `classifyProductsByAnimal` internamente (agrupar produtos por CPF → classificar).

### 2. `src/types/marketing.ts` (linhas 587-600)

Substituir:
```typescript
byPetType: { dog: {...}; cat: {...} }
```
Por:
```typescript
byPetType: Partial<Record<BuyerPetProfile, {
  uniqueCustomers: number;
  repurchaseRate: number;
  avgTicket: number;
  customersWhoRepurchased: number;
}>>
```

Importar `BuyerPetProfile` de `@/data/operationalProducts`.

### 3. `src/utils/samplesAnalyzer.ts`

- **Eliminar** `PetType` (linha 49) e `getSamplePetType` (linhas 55-63)
- **Reescrever** `calculateSampleMetricsByPetType` (linhas 853-914):
  - Importar `classifyProductsByAnimal` de `petProfile.ts`
  - Para cada cliente qualificado: `classifyProductsByAnimal(sampleOrder.produtos.filter(isSampleProduct))`
  - Acumular por `BuyerPetProfile` (incluindo `nao_identificado`)
  - Calcular taxas finais dinamicamente para cada perfil presente
  - Retornar `Partial<Record<BuyerPetProfile, ...>>`

### 4. `src/pages/AnaliseSamples.tsx` (linhas 444-551)

Substituir card fixo "Cachorro vs Gato" por card dinâmico:
- Importar `PET_PROFILE_ORDER`, `PET_PROFILE_LABELS`, `PET_PROFILE_COLORS` de `operationalProducts`
- Iterar `PET_PROFILE_ORDER.filter(k => k !== 'nao_identificado' && metrics.byPetType?.[k])`
- Cada perfil renderiza uma coluna com clientes, recompra, ticket médio
- Usar cor do `PET_PROFILE_COLORS` para background/text
- Insight comparativo entre os dois perfis com mais clientes
- Remover imports de `Dog`, `Cat` do lucide

### 5. `src/pages/VisaoExecutivaV2.tsx` (linhas 8-13, 255-273, 316-318, 490-515)

- Remover import de `getSamplePetType`
- Importar `classifyProductsByAnimal` de `petProfile.ts` e `PET_PROFILE_LABELS`, `BuyerPetProfile` de `operationalProducts`
- Substituir `samplesDog/samplesCat/samplesBoth` por:
  ```typescript
  const samplesByProfile: Partial<Record<BuyerPetProfile, number>> = {};
  onlySampleOrders.forEach(o => {
    const profile = classifyProductsByAnimal(o.produtos.filter(p => isSampleProduct(p)));
    samplesByProfile[profile] = (samplesByProfile[profile] || 0) + 1;
  });
  ```
- Na renderização (linhas 490-515): iterar `Object.entries(samplesByProfile).filter(([k]) => k !== 'nao_identificado')` com labels dinâmicos

### 6. `supabase/functions/chat-with-data/index.ts`

- **Linhas 170-175**: Substituir `else hasDog = true` (default cachorro) por: usar mesmo keyword matching (`gato`→gatos, `grub`→exoticos, `concentrad|integral`→caes, senão→sem sinal). Adicionar acumulador `hasExotico`.
- **Linhas 597-605**: Atualizar documentação do prompt para refletir ontologia real:
  ```
  - Tipo de pet da amostra: classificação por keywords no nome:
    - "gato"/"gatos" → gatos
    - "grub" → exóticos  
    - "suplemento integral"/"suplemento concentrado" → cães
    - Demais (original, legumes, spirulina) → sem sinal específico
    - Múltiplos sinais no mesmo pedido → múltiplos
  ```

## Arquivos (6)

| Arquivo | Ação |
|---------|------|
| `src/utils/petProfile.ts` | Adicionar `classifyProductsByAnimal` com fallback raw |
| `src/types/marketing.ts` | `byPetType` → `Partial<Record<BuyerPetProfile, ...>>` |
| `src/utils/samplesAnalyzer.ts` | Eliminar `getSamplePetType`, reescrever com pipeline determinístico |
| `src/pages/AnaliseSamples.tsx` | Card dinâmico com `PET_PROFILE_ORDER` |
| `src/pages/VisaoExecutivaV2.tsx` | Acumular por `BuyerPetProfile` |
| `supabase/functions/chat-with-data/index.ts` | Atualizar heurística + prompt |




# Unificar classificação de pet — Plano v7 final ✅ IMPLEMENTADO

## Resumo
Centralizada a classificação de pet em `classifyProductsByAnimal` (petProfile.ts) com fallback para `descricao` raw quando `descricaoAjustada` é colapsado para "Kit de Amostras".

## Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/utils/petProfile.ts` | ✅ `classifyProductsByAnimal` + `resolveAnimalSignal` com fallback raw |
| `src/types/marketing.ts` | ✅ `byPetType` → `Partial<Record<BuyerPetProfile, ...>>` |
| `src/utils/samplesAnalyzer.ts` | ✅ Eliminado `getSamplePetType`/`PetType`, usa `classifyProductsByAnimal` |
| `src/pages/AnaliseSamples.tsx` | ✅ Card dinâmico com `PET_PROFILE_ORDER` |
| `src/pages/VisaoExecutivaV2.tsx` | ✅ `samplesByProfile` acumulador por `BuyerPetProfile` |
| `supabase/functions/chat-with-data/index.ts` | ✅ Keyword matching atualizado (cães, gatos, exóticos, múltiplos) + prompt |

## Pipeline final
```
descricaoAjustada → FRIENDLY_TO_ID → PRODUCT_ANIMAL_MAP → sinal
fallback: descricaoAjustada === "Kit de Amostras" → descricao raw → keyword → FRIENDLY_TO_ID → PRODUCT_ANIMAL_MAP
```

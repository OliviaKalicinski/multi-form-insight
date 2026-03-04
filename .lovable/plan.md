

# M1–M4 Ads Metrics Audit Fix (final)

## M2 — Multilingual fallback + dead code removal

**File: `src/utils/adsCalculator.ts`**
- Line 44: `const getValue` → `export const getValue`
- Lines 282-284: replace hardcoded keys with `getValue` + full fallback list including `"Amount Spent"`:
  - investimento: `["Valor usado (BRL)", "Amount spent (BRL)", "Amount spent", "Amount Spent", "Valor gasto", "Spent"]`
  - compras: `["Compras", "Purchases", "Purchase"]`
  - roas: `["ROAS de resultados", "ROAS (results)", "Result ROAS"]`

**Delete:** `src/utils/roasCalculator.ts` and `src/components/dashboard/ROASCard.tsx` (dead code, never imported).

## M1 — Rename ROAS label

**File: `src/pages/Ads.tsx`**
- Line 497: `"ROAS do Negócio"` → `"ROAS Ads"`
- Line 512: `"Receita total ÷ investimento total em mídia"` → `"Receita pixel Meta ÷ investimento total em mídia"`

## M3 — CTR click source heuristic (with reviewer fix)

**File: `src/utils/adsCalculator.ts`** lines 208-209:
```typescript
// Before
const clicksForFunnel = cliquesDesaida || cliquesLinkTotal || cliquesTodosTotal;

// After
const hasEngagementOnly = engajamentosTotal > 0 && comprasTotal === 0 && cliquesLinkTotal === 0;
const clicksForFunnel = hasEngagementOnly
  ? cliquesTodosTotal
  : (cliquesDesaida || cliquesLinkTotal || cliquesTodosTotal);
```

The extra `cliquesLinkTotal === 0` guard prevents false positives on new sales campaigns that haven't converted yet but do have link clicks.

## M4 — Separate engagement from conversion rate

**File: `src/types/marketing.ts`** — add after line 114:
```typescript
taxaConversaoResultados: number;
```

**File: `src/utils/adsCalculator.ts`**:
- Line 89 (defaults): add `taxaConversaoResultados: 0,`
- Lines 229-231: replace mixed metric:
  ```typescript
  const taxaEngajamento = alcanceTotal > 0 ? (engajamentosTotal / alcanceTotal) * 100 : 0;
  const taxaConversaoResultados = alcanceTotal > 0 ? (resultadosTotal / alcanceTotal) * 100 : 0;
  ```
- Line 261 (return): add `taxaConversaoResultados,`

No UI changes needed — `taxaEngajamento` now shows pure engagement (correct for all current consumers in Ads.tsx and Seguidores.tsx). `taxaConversaoResultados` is available for future use.

## Summary

| Fix | Files | Lines changed |
|-----|-------|---------------|
| M2 | adsCalculator.ts | ~8 |
| M2 | delete 2 dead files | 0 |
| M1 | Ads.tsx | 2 |
| M3 | adsCalculator.ts | 3 |
| M4 | adsCalculator.ts + marketing.ts | ~6 |


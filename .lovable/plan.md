

## Fix: Normalize query key in PerformanceInfluenciadores.tsx

**Problem:** The query key `["influencer_registry"]` in `PerformanceInfluenciadores.tsx` differs from `["influencer-registry"]` used in `CadastroInfluenciadores.tsx`. This means invalidating the cache after saving a CPF in Cadastro doesn't refresh the Performance page data.

**Change:** In `src/pages/PerformanceInfluenciadores.tsx`, update the `queryKey` from `["influencer_registry"]` to `["influencer-registry"]`.

Single-line change, no other files affected.


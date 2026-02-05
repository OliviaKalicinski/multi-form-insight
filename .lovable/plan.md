

# Plano: Transparencia de Cortes no Mapa CTR x ROAS

## Objetivo
Tornar visivel ao usuario o que o mapa esta mostrando e o que esta omitindo, sem remover nenhum filtro existente.

---

## Mudancas

### 1. `src/utils/adFormatClassifier.ts` — Retornar metadados de corte

Modificar `buildAdFunnelMap` para retornar, alem do array de entries, um objeto de diagnostico:

```text
interface FunnelMapResult {
  entries: AdFunnelEntry[];
  diagnostics: {
    totalRows: number;         // linhas originais recebidas
    uniqueAds: number;         // nomes unicos apos agrupamento
    excludedBySpend: number;   // descartados por gasto < R$10
    excludedSpendTotal: number; // gasto total dos descartados
  };
}
```

A funcao passa a retornar `FunnelMapResult` em vez de `AdFunnelEntry[]`.

Logica:
- Contar `ads.length` antes de agrupar
- Contar `grouped.size` apos agrupar
- Contar quantos grupos tem `spend < 10` antes de descartar

### 2. `src/components/dashboard/AdFunnelMap.tsx` — Exibir transparencia

Adicionar entre o contrato semantico e os cards de quadrante:

**Banner de contexto** (fundo `slate-50`, texto `slate-500`, `text-xs`):

```text
"Exibindo X anuncios (Y linhas agrupadas por nome).
 Z anuncios nao exibidos por gasto < R$10 (total: R$ W)."
```

Mostra apenas as partes relevantes:
- Se `excludedBySpend > 0`: mostrar a linha de exclusao
- Se `uniqueAds < totalRows`: mostrar "agrupadas por nome"
- Se nenhum corte ocorreu: nao mostrar o banner

### 3. Manter `console.debug` para diagnostico (dev)

No `buildAdFunnelMap`, adicionar:

```text
console.debug('[AdFunnelMap]', {
  totalRows: ads.length,
  uniqueAds: grouped.size,
  excludedBySpend,
  displayed: entries.length,
});
```

---

## O que NAO muda

- Filtro de `spend < 10` permanece
- Agrupamento por nome permanece
- Contrato semantico permanece
- Disclaimer de formato permanece
- Nenhuma acao automatica adicionada

---

## Secao Tecnica

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/utils/adFormatClassifier.ts` | `buildAdFunnelMap` retorna `FunnelMapResult` com diagnostics |
| `src/components/dashboard/AdFunnelMap.tsx` | Consome `FunnelMapResult`, exibe banner de transparencia |

### Ordem de execucao

```text
1. Modificar buildAdFunnelMap para retornar FunnelMapResult
2. Atualizar AdFunnelMap.tsx para consumir o novo formato e exibir banner
```


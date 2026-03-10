

# Inverter prioridade em `resolveAnimalSignal` + adicionar `CD_KIT_AMOSTRAS: 'caes'`

Duas mudanças mínimas, 2 arquivos:

### 1. `src/utils/petProfile.ts` — Inverter ordem da lógica

Mover o bloco de fallback (raw keyword detection) para **antes** do caminho principal, de modo que quando `descricaoAjustada === "Kit de Amostras"`, o raw é verificado primeiro. Se não encontrar nada no raw, aí sim cai no mapa via `FRIENDLY_TO_ID`.

```typescript
function resolveAnimalSignal(
  descricaoAjustada?: string,
  descricao?: string
): AnimalSignal | null {
  // Priority 1: raw keyword detection for collapsed samples
  if (descricaoAjustada === "Kit de Amostras" && descricao) {
    for (const [regex, friendlyName] of SAMPLE_RAW_TO_FRIENDLY) {
      if (regex.test(descricao)) {
        const productId = FRIENDLY_TO_ID[friendlyName];
        if (productId) {
          const signal = PRODUCT_ANIMAL_MAP[productId];
          if (signal) return signal;
        }
      }
    }
  }

  // Priority 2: standard path
  if (descricaoAjustada) {
    const productId = FRIENDLY_TO_ID[descricaoAjustada];
    if (productId) {
      const signal = PRODUCT_ANIMAL_MAP[productId];
      if (signal) return signal;
    }
  }

  return null;
}
```

### 2. `src/data/operationalProducts.ts` — Adicionar ao `PRODUCT_ANIMAL_MAP`

```typescript
CD_KIT_AMOSTRAS: 'caes',
```

Agora o pipeline fica:

```text
descricaoAjustada == "Kit de Amostras"
  → raw tem "gato"?  → gatos
  → raw tem "grub"?  → exoticos
  → raw não detectável? → CD_KIT_AMOSTRAS → caes
```


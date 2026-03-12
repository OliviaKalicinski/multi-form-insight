

# Inverter prioridade em `resolveAnimalSignal` + adicionar `CD_KIT_AMOSTRAS: 'caes'` ✅ IMPLEMENTADO

## Resumo
Invertida a ordem de detecção em `resolveAnimalSignal`: raw keyword detection agora tem prioridade sobre o mapa padrão quando `descricaoAjustada === "Kit de Amostras"`. Adicionado `CD_KIT_AMOSTRAS: 'caes'` ao `PRODUCT_ANIMAL_MAP` como fallback seguro.

## Pipeline final
```
descricaoAjustada == "Kit de Amostras"
  → raw tem "gato"?  → gatos
  → raw tem "grub"?  → exoticos
  → raw não detectável? → CD_KIT_AMOSTRAS → caes
```

## Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/utils/petProfile.ts` | ✅ Invertida prioridade: raw detection antes do mapa padrão |
| `src/data/operationalProducts.ts` | ✅ `CD_KIT_AMOSTRAS: 'caes'` adicionado ao `PRODUCT_ANIMAL_MAP` |

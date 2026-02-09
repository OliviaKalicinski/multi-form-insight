
# Plano: Regra de classificacao visivel + cores dinamicas em CTR e ROAS

## Objetivo

Duas mudancas na tabela `AdsBreakdown`:

1. Mostrar a regra de classificacao (thresholds CTR >= 2% e ROAS >= 1.5x) de forma visivel para o usuario
2. Colorir os valores de CTR e ROAS com verde/vermelho baseado nos thresholds da classificacao, para que a combinacao visual explique o quadrante

## Alteracoes

### Arquivo unico: `src/components/dashboard/AdsBreakdown.tsx`

### 1. Cores dinamicas no CTR (linha 381)

Antes: verde apenas se CTR >= 1.5 (threshold arbitrario e diferente da classificacao).

Depois: verde se CTR >= 2.0, vermelho se CTR < 2.0. Usar os mesmos thresholds da classificacao por quadrante.

```
CTR >= 2.0  →  text-green-600 font-medium
CTR < 2.0   →  text-red-500
```

### 2. Cores dinamicas no ROAS (linhas 396-402)

Antes: verde se ROAS >= 1, amarelo se < 1.

Depois: verde se ROAS >= 1.5, vermelho se ROAS < 1.5 (e > 0). Alinhado com o threshold da classificacao.

```
ROAS >= 1.5  →  text-green-600 font-semibold
ROAS > 0 && < 1.5  →  text-red-500
ROAS === 0  →  text-muted-foreground "-"
```

Isso permite que o usuario veja visualmente a combinacao: verde+verde = Conversor, verde+vermelho = Isca, etc.

### 3. Legenda da regra de classificacao

Adicionar um bloco pequeno abaixo do header do card (dentro do `CardHeader`, apos o `CardDescription`) com a regra resumida:

```text
Classificacao: CTR >= 2% e ROAS >= 1.5x = Conversor | CTR >= 2% e ROAS < 1.5x = Isca | ...
```

Formato: uma linha de badges compactas lado a lado, cada uma com a cor da classificacao e o criterio resumido. Envoltas em um container com borda leve e padding minimo, com icone de info.

Layout:

```text
[🟢 Conversor: CTR>=2% + ROAS>=1.5x] [🟡 Isca: CTR>=2% + ROAS<1.5x] [🔵 Silencioso: CTR<2% + ROAS>=1.5x] [🔴 Ineficiente: CTR<2% + ROAS<1.5x]
```

Em mobile (< md), empilhar em 2 colunas.

## Secao tecnica

### Thresholds

Importar `CTR_REFERENCE` e `ROAS_REFERENCE` de `adFormatClassifier.ts` -- porem estes sao constantes locais (nao exportadas). Opcoes:

- Exportar as constantes do classificador (mudanca minima em `adFormatClassifier.ts`: adicionar `export` nas linhas 20-21)
- Ou declarar constantes locais no componente referenciando os mesmos valores

Recomendacao: exportar do classificador para manter source of truth unica. Mudanca de 2 palavras (`export const` em vez de `const`).

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/utils/adFormatClassifier.ts` | Exportar `CTR_REFERENCE` e `ROAS_REFERENCE` |
| `src/components/dashboard/AdsBreakdown.tsx` | Cores CTR/ROAS, legenda de regra |

### O que NAO muda

- Nenhum calculo alterado
- Classificacao continua usando `classifyFunnelRole` existente
- Ordenacao e filtros intocados
- Tooltips das badges mantidos

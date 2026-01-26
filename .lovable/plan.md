

# Diagnóstico: Métrica de Crescimento de Seguidores

## Problema Encontrado

A métrica de crescimento pode estar sendo calculada de forma incorreta dependendo de como os dados do Instagram são interpretados.

## Dados Atuais no Banco

| Mês | Novos Seguidores | Dias |
|-----|------------------|------|
| Jan/2026 | 520 | 24 |
| Dez/2025 | 650 | 31 |
| Nov/2025 | 1.688 | 30 |

### Calculo Atual de Crescimento (Jan vs Dez)

```text
Crescimento Absoluto = 520 - 650 = -130
Crescimento Percentual = -130 / 650 = -20%
```

Este calculo esta correto SE os valores no banco representam **novos seguidores ganhos por dia**.

---

## Possivel Causa do Problema

O CSV do Instagram exporta o **total de seguidores do perfil naquele dia**, nao a variacao diaria.

**Exemplo do que o Instagram exporta:**
```text
Data, Seguidores (total do perfil)
2026-01-16, 156.013
2026-01-17, 156.038  (ganhou 25)
2026-01-18, 156.061  (ganhou 23)
```

**O que o sistema atual faz:**
Salva o valor "bruto" como se fosse delta diario:
```text
2026-01-16 -> 13  (deveria ser 156.013)
2026-01-17 -> 25  (deveria ser 156.038)
```

Parece que os valores estao sendo salvos incorretamente, capturando apenas os ultimos digitos ou interpretando errado.

---

## Solucao Proposta

### Opcao 1: Interpretar como Delta (atual)

Se o CSV do Instagram traz a **variacao diaria** (ex: +13, +25):
- O sistema esta correto
- O crescimento de Janeiro esta realmente negativo (-20% vs Dezembro)
- Nao ha bug, apenas Janeiro teve menos novos seguidores

### Opcao 2: Interpretar como Total Acumulado

Se o CSV do Instagram traz o **total do perfil** (ex: 156.013, 156.038):
- Precisamos modificar o parser para calcular o delta entre dias consecutivos
- A formula seria: `novos_dia = total_hoje - total_ontem`

---

## Arquivos a Modificar

1. **`src/utils/instagramMetricsParser.ts`**
   - Adicionar logica para detectar se valores sao totais acumulados ou deltas
   - Se forem totais, calcular a diferenca entre dias consecutivos

2. **`src/hooks/useDataPersistence.ts`**
   - Atualizar `saveInstagramMetrics` para processar corretamente seguidores

3. **`src/components/dashboard/InstagramMetricsUploader.tsx`**
   - Adicionar preview dos dados para o usuario confirmar se estao corretos

---

## Verificacao Necessaria

Antes de implementar, preciso que voce confirme:

**Como sao os valores no CSV de Seguidores do Instagram?**

- Se os valores sao pequenos (ex: 13, 25, 18) = delta diario = sistema OK
- Se os valores sao grandes (ex: 156.000) = total acumulado = precisa correcao

---

## Resumo

O crescimento de **-20%** que voce esta vendo pode estar correto (Janeiro realmente teve menos novos seguidores que Dezembro) OU pode ser um bug no parser que esta salvando valores incorretos.

Preciso da sua confirmacao sobre o formato do CSV para determinar a correcao exata.


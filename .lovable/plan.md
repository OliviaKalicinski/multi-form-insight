
# Correção: Legenda Dinâmica no Gráfico de Volume

## Problema Identificado

A legenda do gráfico de Volume de Pedidos mostra sempre 4 categorias:
- **Acima:** Produtos, Só Amostras (verde escuro, verde claro)
- **Abaixo:** Produtos, Só Amostras (amarelo escuro, amarelo claro)

Porém, quando **todas as barras estão acima da meta** (como no seu caso), as cores amarelas não aparecem no gráfico, mas a legenda continua exibindo-as - causando confusão.

---

## Solução Proposta

Tornar a legenda **dinâmica**, mostrando apenas as categorias que realmente aparecem no gráfico:

### Lógica:
1. Calcular quais cores estão presentes no gráfico
2. Verificar se existem barras acima E/OU abaixo da meta
3. Mostrar na legenda apenas as categorias que têm dados visíveis

### Exemplo:
- Se **todas** as barras estão acima da meta: mostrar apenas "Produtos" e "Só Amostras" em verde
- Se **todas** estão abaixo: mostrar apenas em amarelo
- Se **misturado**: mostrar ambas as categorias

---

## Arquivo a Modificar

`src/components/dashboard/DailyVolumeChart.tsx`

---

## Mudanças Técnicas

### 1. Calcular categorias visíveis (novo useMemo)

Adicionar lógica para detectar se existem barras acima e/ou abaixo da meta:

```text
const { hasAbove, hasBelow } = useMemo(() => {
  let hasAbove = false;
  let hasBelow = false;
  
  chartData.forEach(item => {
    if (item.orders >= targetLine) hasAbove = true;
    else hasBelow = true;
  });
  
  return { hasAbove, hasBelow };
}, [chartData, targetLine]);
```

### 2. Renderizar legenda condicional

Modificar a seção de legenda para mostrar apenas categorias relevantes:

- Se `hasAbove === true`: mostrar seção "Acima:" com cores verdes
- Se `hasBelow === true`: mostrar seção "Abaixo:" com cores amarelas
- Se ambos `true`: mostrar ambas as seções
- Sempre mostrar a linha de referência (Meta/Média)

---

## Resultado Esperado

**Antes (seu caso atual):**
```text
Acima: ● Produtos ● Só Amostras
Abaixo: ● Produtos ● Só Amostras  ← Confuso, não aparece no gráfico!
```

**Depois:**
```text
● Produtos ● Só Amostras — Meta: 350  ← Simples e claro
```

Ou se houver barras mistas:
```text
Acima: ● Produtos ● Só Amostras
Abaixo: ● Produtos ● Só Amostras
— Meta: 350
```

---

## Resumo

Uma pequena correção que adiciona um `useMemo` para detectar quais cores estão em uso e renderiza a legenda condicionalmente, eliminando a confusão de mostrar categorias que não existem no gráfico.

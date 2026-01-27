
# Toggle de Amostras no Gráfico de Volume

## O que será implementado

Um botão de toggle no gráfico de Volume de Pedidos que permite:
- **Toggle ON (padrão)**: Mostra barras empilhadas (Produtos + Só Amostras) - comportamento atual
- **Toggle OFF**: Mostra apenas "Produtos", sem considerar pedidos de amostras

---

## Mudanças Visuais

O toggle será posicionado ao lado dos botões de período (Diário/Semanal/Mensal):

```text
📦 Volume de Pedidos                    [Diário] [Semanal] [Mensal]  [🧪 Incluir Amostras]
```

### Estados do Toggle:
- **Ativo**: Ícone preenchido + texto "Incluir Amostras" 
- **Inativo**: Ícone outline + texto "Só Produtos"

---

## Comportamento

| Toggle | Barras exibidas | Meta/Média baseada em |
|--------|-----------------|----------------------|
| ON | Produtos + Só Amostras (empilhadas) | Total de pedidos |
| OFF | Apenas Produtos | Apenas pedidos com produtos |

Quando "Amostras" está desativado:
- Barras mostram apenas `productOrders`
- Linha de referência (Meta/Média) recalcula baseada apenas em produtos
- Tooltip mostra apenas dados de produtos
- Legenda simplificada (sem menção a amostras)

---

## Arquivo a Modificar

`src/components/dashboard/DailyVolumeChart.tsx`

---

## Detalhes Técnicos

### 1. Novo estado interno

Adicionar estado local para controlar o toggle:

```text
const [includeSamples, setIncludeSamples] = useState(true);
```

### 2. Dados filtrados

Criar um novo `useMemo` que ajusta os dados baseado no toggle:

- Quando `includeSamples = true`: usar dados completos (comportamento atual)
- Quando `includeSamples = false`: usar apenas `productOrders` como valor total

### 3. Recalcular média/meta

A linha de referência deve considerar apenas produtos quando amostras estão excluídas.

### 4. Botão toggle no header

Adicionar botão com ícone (Flask/Beaker) ao lado dos botões de período:

```text
<Button variant={includeSamples ? "default" : "outline"} size="sm">
  <FlaskConical /> {includeSamples ? "Incluir Amostras" : "Só Produtos"}
</Button>
```

### 5. Ajustar gráfico

Quando `includeSamples = false`:
- Ocultar a barra de `sampleOnlyOrders`
- Usar cor única para produtos (sem empilhamento)
- Simplificar legenda

### 6. Ajustar tooltip

Quando `includeSamples = false`:
- Não mostrar linha de "Só Amostras"
- Comparação com meta baseada apenas em produtos

---

## Resultado Esperado

### Com Amostras (toggle ON):
```text
[Barra verde escuro: Produtos] + [Barra verde claro: Só Amostras]
```

### Sem Amostras (toggle OFF):
```text
[Barra verde: apenas Produtos]
```

O usuário poderá alternar facilmente entre as duas visualizações para entender:
1. Volume total de pedidos (com amostras)
2. Volume real de produtos vendidos (sem amostras)



# Reestruturar pagina de Anuncios - 5 Fases

## FASE 1 -- Aliases semanticos e correcoes de investimento

### 1.1 Aliases (apos linha 149)

```typescript
const totalInvestment = totalInvestmentAllObjectives;
const objectiveInvestment = metrics.investimentoTotal;
const revenueBenchmarkMultiplier = 3;
const grossMediaResult = metrics.valorConversaoTotal - totalInvestment;
```

### 1.2 Correcoes pontuais

| Linha atual | Antes | Depois |
|---|---|---|
| 191 | `netProfit` | Substituir por `grossMediaResult` (mesmo calculo, nome correto) |
| 477 | `metrics.investimentoTotal * 3` | `totalInvestment * revenueBenchmarkMultiplier` |
| 641 | ROI card com `metrics.roi` | Renomear para "Resultado Bruto" com `formatCurrency(grossMediaResult)`, badge Positivo/Negativo |
| 881 | `metrics.investimentoTotal` | `totalInvestment` com label "Investido (total midia):" |

O card de ROI (linha 639-646) passa a exibir valor monetario (nao percentual), com status baseado em positivo/negativo, e tooltip: "Resultado bruto considerando apenas investimento em midia."

---

## FASE 5 (executada antes das fases visuais) -- Filtro manual de objetivo

### Estado

Adicionar `useState` no componente:

```typescript
const [manualObjective, setManualObjective] = useState<string>('auto');
```

### Logica

Criar `effectiveObjective` que substitui `primaryObjective` em todos os usos:

```typescript
const effectiveObjective = useMemo(() => {
  if (manualObjective === 'auto') return determinePrimaryObjective(currentMonthAdsData);
  return manualObjective;
}, [manualObjective, currentMonthAdsData]);
```

Substituir `primaryObjective` por `effectiveObjective` em: `activeAdsData`, `objectivesSummary`, trends.

### UI

Adicionar `ToggleGroup` no header (entre titulo e badges):

- Opcoes: Auto (detectado) | Sales | Engagement | Traffic
- Opcoes sem dados ficam desabilitadas
- Import de `ToggleGroup` e `ToggleGroupItem` de `@/components/ui/toggle-group`

### Persistencia

Usar `sessionStorage` para manter selecao durante a sessao.

---

## FASE 2 -- BLOCO 1: Decisao (topo, substitui ROW 1 atual)

O ROW 1 atual (ROAS hero 2-col + 6 satellite cards 3-col) e substituido por:

```text
+---------------------------+---------------------------+---------------------------+
| ROAS do Negocio (HERO)    | Resultado Bruto de Midia  | Status Decisional         |
| correctedRoas             | grossMediaResult          | Texto: Escalavel /        |
| Receita total / invest.   | Badge: Positivo/Negativo  | Saudavel / Em observacao  |
|   total em midia          | Tooltip honesto            | / Prejuizo operacional   |
| Barra progresso vs meta   |                           | Subtexto explicativo      |
+---------------------------+---------------------------+---------------------------+
```

### Card 1 -- ROAS do Negocio

- Subtitulo: "Receita total / investimento total em midia" (evita confusao com ROAS Meta)
- Reutiliza toda a logica existente de `getRoasStatus`, `getRoasInterpretation`, `roasProgress`
- Cor dinamica via thresholds do banco

### Card 2 -- Resultado Bruto de Midia

- Valor: `formatCurrency(grossMediaResult)`
- Badge: "Positivo" (verde) ou "Negativo" (vermelho)
- Edge case: quando `totalInvestment === 0`, estado neutro, sem badge
- Tooltip: "Receita de vendas menos investimento total em midia. Nao considera custos operacionais."
- Visual: valor financeiro (sem cores de performance relativa)

### Card 3 -- Status Decisional

Derivado do ROAS, sem nova engine:

| Condicao | Label | Cor |
|---|---|---|
| correctedRoas >= roasExcelente | Escalavel | Verde |
| correctedRoas >= roasMedio | Saudavel | Azul |
| correctedRoas >= roasMinimo | Em observacao | Amarelo |
| correctedRoas < roasMinimo | Prejuizo operacional | Vermelho |

Subtexto curto explicativo para cada estado. Sem animacoes.

---

## FASE 3 -- BLOCO 2: Diagnostico rapido

Substitui os 6 satellite cards + ROW 2.5 por um grid compacto:

```text
+-------------+-------------+-------------+------------------+
|    CTR      |    CPC      |    CPA      |  Taxa Conversao  |
+-------------+-------------+-------------+------------------+
| Investimento|   Receita   |  Conversoes |      CPM         |
|  (total)    | (atribuida) |             |                  |
+-------------+-------------+-------------+------------------+
```

- Linha 1: diagnostico de eficiencia, usa `objectiveInvestment`
- Linha 2: contexto de escala. Investimento usa `totalInvestment`. Receita com label "Receita atribuida aos anuncios"
- Todos compact, trends opcionais, tooltips existentes
- Status visual neutro (sem cores fortes de sucesso/perigo)

---

## FASE 4 -- Reorganizar blocos existentes

Nova ordem da pagina (Sales View):

1. BLOCO 1: Decisao (3 cards -- FASE 2)
2. BLOCO 2: Diagnostico (grid 2x4 -- FASE 3)
3. Funil de Conversao + Alcance e Performance (movido, sem mudanca de calculo)
4. Metricas adicionais: LPV, Ticket Medio, Frequencia (sem ROI, que agora esta no BLOCO 1)
5. Resumo Financeiro Inline (ROW 3 corrigido com `totalInvestment` e label "Investido (total midia)")
6. AdsBreakdown (tabela, sem mudanca)
7. AdFunnelMap (quadrante, sem mudanca)

Sem scroll automatico nem highlights animados.

---

## Resumo de alteracoes

| Arquivo | Mudancas |
|---|---|
| `src/pages/Ads.tsx` | Todas as 5 fases: aliases, filtro manual, bloco decisional, diagnostico, reorganizacao |

Nenhum arquivo novo. Nenhum componente externo alterado. Imports adicionais: `useState` (ja importado via React), `ToggleGroup`/`ToggleGroupItem`.

### Ordem de execucao

1. FASE 1: aliases + correcoes de investimento
2. FASE 5: filtro manual de objetivo
3. FASE 2: bloco decisional
4. FASE 3: bloco diagnostico
5. FASE 4: reorganizar blocos


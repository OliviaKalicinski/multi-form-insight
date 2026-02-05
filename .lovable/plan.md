

# Plano: Etapa 5.1 — Card de Memória de Decisão

## Objetivo
Criar um card de memória histórica que mostra ao usuário o registro factual das decisões tomadas sobre recomendações, sem influenciar nenhum comportamento do sistema.

---

## Princípio Fundamental

O card é um **espelho histórico**:
- Exibe apenas dados que já existem em `useDecisionEvents().memory`
- Não calcula nada novo
- Não influencia geração, ordem ou prioridade de recomendações
- Não contém botões, ações ou CTAs

**Propósito ético**: Provar para o usuário que a memória existe antes de ser usada para qualquer coisa.

---

## Componente: DecisionMemoryCard

### Arquivo a Criar
`src/components/executive/DecisionMemoryCard.tsx`

### Props

```text
interface DecisionMemoryCardProps {
  memory: DecisionMemory;
}
```

### Estrutura Visual

```text
+--------------------------------------------------+
| 📋 Memória de Decisão                            |
| Registro histórico das recomendações apresentadas |
+--------------------------------------------------+
|                                                   |
| [4]         [2]         [1]         [1]          |
| Geradas    Aceitas    Rejeitadas   Expiradas     |
|                                                   |
+--------------------------------------------------+
| ⏱️ Tempo médio: 2.4h entre geração e decisão     |
+--------------------------------------------------+
| Métrica       Geradas  Aceitas  Rejeitadas  Exp  |
| ─────────────────────────────────────────────────|
| roasAds          2        1         1        0   |
| churn            1        1         0        0   |
| ticketMedio      1        0         0        1   |
+--------------------------------------------------+
| ℹ️ Este histórico não altera automaticamente     |
| recomendações, alertas ou prioridades.           |
| Ele existe para tornar explícita a relação       |
| entre sugestões do sistema e decisões humanas.   |
+--------------------------------------------------+
```

### Regras de Exibição

1. **Só exibir se `memory.totalGenerated > 0`**
   - Se não há histórico, não mostrar o card

2. **Tempo médio**: só exibir se `avgResponseTimeHours > 0`
   - Formatar como horas se < 24h, dias se >= 24h

3. **Tabela por métrica**: não mostrar `acceptanceRate`
   - Mesmo existindo no tipo, é deliberadamente omitido

4. **Cores neutras**: usar cinza/slate, sem verde/vermelho forte
   - O card não julga, apenas registra

---

## Integração em AnaliseCritica.tsx

### Localização na Página

Inserir **após** a seção de Recomendações Prioritárias e **antes** da Análise Trimestral:

```text
{/* RECOMENDAÇÕES PRIORITÁRIAS */}
...

{/* MEMÓRIA DE DECISÃO */}
{memory.totalGenerated > 0 && (
  <DecisionMemoryCard memory={memory} />
)}

{/* ANÁLISE TRIMESTRAL */}
...
```

### Fonte de Dados

Usar o hook já existente:

```text
const { memory } = useDecisionEvents();
```

Já está disponível no componente `AnaliseCritica.tsx` (linha 24-31).

---

## Detalhes de Implementação

### Seção 1: Cabeçalho

```text
<CardHeader>
  <CardTitle className="flex items-center gap-2">
    <History className="h-5 w-5 text-slate-500" />
    Memória de Decisão
  </CardTitle>
  <CardDescription>
    Registro histórico das recomendações apresentadas
  </CardDescription>
</CardHeader>
```

### Seção 2: Resumo Geral (4 números)

Grid com 4 colunas mostrando:
- Total geradas
- Aceitas
- Rejeitadas
- Expiradas

**Microcopy abaixo**: "Desde o início do uso deste painel"

### Seção 3: Tempo Médio de Resposta

Condicional: só mostrar se `avgResponseTimeHours > 0`

```text
const formatResponseTime = (hours: number): string => {
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} dias`;
};
```

**Microcopy**: "Tempo médio entre geração e decisão explícita"

### Seção 4: Tabela por Métrica

Colunas:
| Métrica | Geradas | Aceitas | Rejeitadas | Expiradas |

- Não mostrar `acceptanceRate`
- Só exibir métricas com `generated > 0`
- Usar nomes legíveis para as métricas (mapa de tradução)

### Seção 5: Rodapé Epistemológico

Texto fixo em `text-xs text-muted-foreground`:

```text
Este histórico não altera automaticamente recomendações, alertas ou prioridades.
Ele existe para tornar explícita a relação entre sugestões do sistema e decisões humanas.
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/executive/DecisionMemoryCard.tsx` | CRIAR |
| `src/pages/AnaliseCritica.tsx` | MODIFICAR - Adicionar o card |

---

## Ordem de Execução

```text
1. Criar DecisionMemoryCard.tsx com toda a estrutura
2. Integrar em AnaliseCritica.tsx após Recomendações
```

---

## O Que Este Card NÃO Faz

- Não é score
- Não é ranking
- Não é feedback loop
- Não influencia geração, ordem ou prioridade
- Nenhuma função de decisão lê este card
- Não tem botões ou ações

---

## Critério de Sucesso

A etapa está correta se:

1. O card não muda nada no sistema
2. O usuário entende o que está vendo
3. O sistema não reage ao que está no card
4. Nenhuma função consulta essa memória
5. Se perguntarem "Isso muda algo?", a resposta é "Ainda não."


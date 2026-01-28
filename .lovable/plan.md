
# Plano: Adicionar Botão "Trimestre" e Indicador de Atualização dos Dados

## Visao Geral

Este plano implementa duas funcionalidades:
1. Botao "Trimestre" nos graficos de volume/faturamento para visualizar dados agregados por trimestre
2. Indicador da data de atualizacao dos dados no header global, visivel durante a navegacao

---

## 1. Botao Trimestre nos Graficos

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/dashboard/DailyRevenueChart.tsx` | Adicionar 'quarterly' ao `ChartViewMode` e botao "Tri" |
| `src/components/dashboard/DailyVolumeChart.tsx` | Adicionar 'quarterly' ao `ChartViewMode` e botao "Tri" |
| `src/utils/financialMetrics.ts` | Criar funcoes `calculateQuarterlyRevenue()` e `calculateOrdersByQuarterWithTypes()` |
| `src/pages/ComportamentoCliente.tsx` | Atualizar tipo do estado `volumeView` e adicionar botao |

### Detalhes Tecnicos

**Novo tipo ChartViewMode:**
```typescript
export type ChartViewMode = 'daily' | 'weekly' | 'monthly' | 'quarterly';
```

**Novas funcoes em financialMetrics.ts:**
```typescript
// Agrupa pedidos por trimestre (Q1=Jan-Mar, Q2=Abr-Jun, etc.)
export const calculateQuarterlyRevenue = (orders: ProcessedOrder[]) => {
  // Agrupa por "yyyy-Q1", "yyyy-Q2", etc.
  // Retorna { quarter: string; revenue: number }[]
};

export const calculateOrdersByQuarterWithTypes = (orders: ProcessedOrder[]) => {
  // Similar ao mensal, mas agrupado por trimestre
  // Retorna { quarter: string; orders: number; sampleOnlyOrders: number; productOrders: number }[]
};
```

**UI do botao:**
- Label: "Tri" (abreviacao de Trimestre)
- Posicao: Apos o botao "Mes" nos toggles existentes

---

## 2. Indicador de Data de Atualizacao no Header

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/contexts/DashboardContext.tsx` | Adicionar `lastDataUpdate: Date | null` ao contexto |
| `src/hooks/useDataPersistence.ts` | Buscar data do ultimo upload do banco |
| `src/App.tsx` | Exibir indicador no header global |

### Estrutura Visual Proposta

O indicador aparecera no header global (sticky), ao lado do titulo "Dashboard de Marketing":

```text
┌─────────────────────────────────────────────────────────────┐
│ [≡]  📊 Dashboard de Marketing          Dados: 26/01 22:40 │
└─────────────────────────────────────────────────────────────┘
```

### Detalhes Tecnicos

**DashboardContext - nova propriedade:**
```typescript
interface DashboardContextType {
  // ... existentes
  lastDataUpdate: Date | null;
}
```

**useDataPersistence - buscar ultima atualizacao:**
```typescript
// Dentro de loadAllData(), buscar:
const { data: latestUpload } = await supabase
  .from("upload_history")
  .select("created_at")
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

// Retornar junto com os dados
return { salesData, adsData, followersData, marketingData, lastUpdated: latestUpload?.created_at };
```

**App.tsx - exibir no header:**
```tsx
<header className="flex h-12 items-center border-b px-4 bg-background/95 backdrop-blur">
  <SidebarTrigger className="-ml-1" />
  <div className="ml-4 font-semibold text-sm">📊 Dashboard de Marketing</div>
  
  {/* Spacer */}
  <div className="flex-1" />
  
  {/* Indicador de atualizacao */}
  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
    <span>Dados: {formatLastUpdate()}</span>
  </div>
</header>
```

### Formato da Data

- Se hoje: "Dados: 22:40"
- Se ontem: "Dados: Ontem 22:40"
- Se mais antigo: "Dados: 26/01 22:40"

---

## Resumo de Alteracoes

| Arquivo | Tipo | Complexidade |
|---------|------|--------------|
| `src/utils/financialMetrics.ts` | Adicionar funcoes trimestrais | Media |
| `src/components/dashboard/DailyRevenueChart.tsx` | Tipo + Botao + Logica | Media |
| `src/components/dashboard/DailyVolumeChart.tsx` | Tipo + Botao + Logica | Media |
| `src/pages/ComportamentoCliente.tsx` | Tipo + Botao | Baixa |
| `src/contexts/DashboardContext.tsx` | Nova prop `lastDataUpdate` | Baixa |
| `src/hooks/useDataPersistence.ts` | Buscar data do ultimo upload | Baixa |
| `src/App.tsx` | Exibir indicador no header | Baixa |

---

## Consideracoes de UX

1. **Trimestre**: O botao usa "Tri" como abreviacao para manter consistencia com "Dia", "Sem", "Mes"
2. **Data de atualizacao**: Usa um dot verde para indicar status saudavel + formato minimalista
3. **Responsividade**: O indicador de data oculta o horario em telas muito pequenas, mantendo apenas a data

---

## Fluxo de Dados - Indicador de Atualizacao

```text
upload_history (DB)
       ↓
useDataPersistence.loadAllData()
       ↓
DashboardContext.lastDataUpdate
       ↓
App.tsx (header) → Exibe formatado
```

## Resultado Esperado

1. Graficos de faturamento e volume terao um novo botao "Tri" que agrupa os dados por trimestre
2. Todas as paginas do dashboard exibirao a data/hora da ultima atualizacao dos dados no canto superior direito do header

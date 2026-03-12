

## Diagnóstico

O código em `App.tsx` já está estruturalmente correto — `DashboardProvider` envolve `DashboardLayout` dentro de `AuthenticatedLayout` (linhas 92-95). O erro é causado por **incompatibilidade de versões de módulo durante HMR (Hot Module Replacement)** do Vite: os timestamps no stack trace mostram versões diferentes de `App.tsx` e `DashboardContext.tsx` carregadas simultaneamente, fazendo com que o `createContext` de uma versão não seja reconhecido pelo `useContext` de outra.

## Correção

Tornar o hook `useDashboard` resiliente em vez de lançar erro, retornando `null` quando o contexto não está disponível (situação transitória de HMR). Alternativamente, extrair `DashboardLayout` para um arquivo separado para evitar conflitos de HMR.

**Abordagem escolhida:** Extrair `DashboardLayout` para `src/components/DashboardLayout.tsx` — isso isola o consumidor do contexto em um módulo separado, eliminando o problema de HMR onde provider e consumer são recarregados de forma dessincronizada no mesmo arquivo.

### Arquivos alterados
1. **`src/components/DashboardLayout.tsx`** (novo) — mover o componente `DashboardLayout` + helper `formatLastUpdate` de `App.tsx`
2. **`src/App.tsx`** — remover `DashboardLayout` e `formatLastUpdate`, importar de `@/components/DashboardLayout`


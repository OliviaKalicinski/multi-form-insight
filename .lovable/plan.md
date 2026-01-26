

# Correção: Upload Substitui Dados Locais ao Invés de Acumular

## Problema Identificado

Quando você faz upload de novas planilhas pelo dashboard, os dados dos meses anteriores ficam "em branco" na visualização, mesmo que estejam salvos corretamente no banco de dados.

**Causa raiz:** As funções de upload estão usando `setSalesData()` que **substitui** todo o estado local ao invés de usar `persistSalesData()` que faz o **merge** (junção) corretamente.

### Verificação no Banco de Dados

Os dados estão salvos corretamente:
- **Vendas:** 2.539 registros (Jan/2025 a Jan/2026)
- **Anúncios:** 464 registros (Fev/2025 a Jan/2026)
- Todos os meses possuem dados no banco

---

## Solução

### Parte 1: Corrigir a Página Index.tsx

Atualizar os handlers de upload para usar as funções `persist*` que:
1. Salvam no banco de dados
2. Fazem merge com os dados existentes no estado local

**Arquivo:** `src/pages/Index.tsx`

**Mudanças:**
- Importar `persistSalesData`, `persistAdsData`, `persistFollowersData`, `persistMarketingData` do contexto
- Substituir as chamadas `setSalesData(data)` por `persistSalesData(data, fileName)`
- Aplicar o mesmo padrão para os demais uploaders

### Parte 2: Corrigir CSVUploader, SalesUploader, AdsUploader

Verificar que todos os uploaders estão usando as funções de persistência corretamente e não chamando as funções `set*` que substituem os dados.

**Arquivos afetados:**
- `src/components/dashboard/CSVUploader.tsx`
- `src/components/dashboard/SalesUploader.tsx`
- `src/components/dashboard/AdsUploader.tsx`
- `src/components/dashboard/FollowersUploader.tsx`

### Parte 3: Adicionar Refresh Automático

Após cada upload bem-sucedido, chamar `refreshFromDatabase()` para garantir que o estado local está sincronizado com o banco.

---

## Detalhes Tecnicos

### Fluxo Atual (Com Bug)
```text
Upload CSV --> Parser --> setSalesData(novos_dados)
                                   |
                                   v
                    Estado local = APENAS novos dados
                                   |
                                   v
                    Visualização mostra apenas ultimo upload
```

### Fluxo Corrigido
```text
Upload CSV --> Parser --> persistSalesData(novos_dados)
                                   |
                                   +--> Salva no banco (UPSERT)
                                   |
                                   +--> Merge: estado_anterior + novos_dados
                                   |
                                   v
                    Visualização mostra TODOS os dados
```

### Mudancas no Index.tsx

**Antes:**
```typescript
const handleSalesDataLoaded = (data: any[], fileName: string) => {
  setSalesData(data);  // SUBSTITUI tudo
};
```

**Depois:**
```typescript
const handleSalesDataLoaded = async (data: any[], fileName: string) => {
  await persistSalesData(data, fileName);  // Salva e faz MERGE
};
```

### Mudancas nos Uploaders

Os componentes CSVUploader.tsx, SalesUploader.tsx, AdsUploader.tsx, e FollowersUploader.tsx ja utilizam as funcoes persist internamente, mas tambem chamam `onDataLoaded` que pode estar sobrescrevendo.

A solucao e remover a chamada redundante ao callback `onDataLoaded` ou garantir que o callback nao substitua os dados.

---

## Benefícios

1. Uploads incrementais funcionam corretamente
2. Novos dados sao acumulados aos existentes
3. Nenhuma perda de visualizacao de meses anteriores
4. Estado local sempre sincronizado com banco de dados

---

## Solução Temporária Imediata

Enquanto a correção não é aplicada, você pode recarregar a página (F5) após o upload para forçar o carregamento de todos os dados do banco.


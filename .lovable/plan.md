

## Plano: Limpar dados CSV + Botão "Sincronizar Meta Ads"

### 1. Limpar dados CSV antigos (via insert tool)
Executar DELETE para remover registros com `source = 'csv'` ou `source IS NULL`:
```sql
DELETE FROM ads_data WHERE source = 'csv' OR source IS NULL;
```

### 2. Botão "Sincronizar Meta Ads" na página Ads.tsx

Adicionar um botão no header da página (ao lado do ToggleGroup de objetivos) que:
- Mostra ícone de refresh + texto "Sincronizar Meta Ads"
- Ao clicar, faz POST para a Edge Function usando `supabase.functions.invoke('sync-meta-ads', { body: {} })`
- Mostra estado de loading (spinner) durante a requisição
- Exibe toast de sucesso com número de registros sincronizados ou toast de erro
- Usa `useState` para controlar `isSyncing`

**Chamada:** `supabase.functions.invoke('sync-meta-ads', { body: {} })` (seguindo a regra de nunca usar path direto)

### Arquivos alterados
- `src/pages/Ads.tsx` — adicionar botão + lógica de sync


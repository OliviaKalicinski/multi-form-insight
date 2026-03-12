

## Plano: Atualizar sync-instagram-organic para v2

### Alteração
**`supabase/functions/sync-instagram-organic/index.ts`** — substituir conteúdo completo pelo código v2 fornecido.

Principais mudanças vs v1:
- Busca cada métrica separadamente via `fetchMetric()` em vez de todas juntas (evita erros de métricas incompatíveis)
- Usa `Promise.all` para paralelizar as 7 chamadas à API
- Parse simplificado: itera `item.values` diretamente em vez de `total_value.breakdowns`

### Deploy
A função será deployada automaticamente após salvar o arquivo.

### Teste
Chamar a Edge Function com body `{}` (usará período padrão: últimos 7 dias) e mostrar o JSON de resposta.


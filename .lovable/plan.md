

## Plano: Atualizar sync-meta-ads para v2 com chunking + executar

### Alteração
**`supabase/functions/sync-meta-ads/index.ts`** — substituir conteúdo completo pelo código v2 fornecido. Principais mudanças:
- Nova função `chunkDateRange()` que divide qualquer período em sub-períodos de N dias
- Nova função `syncChunk()` que processa um chunk isoladamente (com limite de 15 páginas)
- Parâmetro `chunk_days` no body (default 7, max 30)
- Resposta inclui detalhes por chunk (`chunkResults`)

### Após deploy
Executar a função com:
```json
{ "date_start": "2025-01-01", "date_stop": "2026-03-12", "chunk_days": 7 }
```

Isso gerará ~63 chunks de 7 dias, processados sequencialmente dentro do mesmo request.


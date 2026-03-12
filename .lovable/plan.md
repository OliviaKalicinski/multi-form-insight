

## Correção: Upsert constraint para ads_data

### Problema
O unique index condicional (`WHERE ad_id IS NOT NULL`) não é reconhecido pelo `ON CONFLICT` do Supabase JS client. É necessário uma constraint real.

### Solução

**Migração SQL:**
1. Remover o índice parcial existente `ads_data_api_upsert_key`
2. Criar uma constraint `UNIQUE (ad_id, data)` real na tabela — como `ad_id` pode ser NULL para dados CSV, e NULL é sempre único em constraints, não haverá conflito com registros CSV existentes (múltiplos NULLs são permitidos em unique constraints do PostgreSQL)

```sql
DROP INDEX IF EXISTS public.ads_data_api_upsert_key;
ALTER TABLE public.ads_data ADD CONSTRAINT ads_data_ad_id_data_unique UNIQUE (ad_id, data);
```

### Por que funciona
No PostgreSQL, `NULL ≠ NULL` em unique constraints. Registros CSV com `ad_id = NULL` nunca conflitam entre si, então a constraint não quebra dados existentes. Apenas registros da API (com `ad_id` preenchido) terão deduplicação.

### Após a migração
Re-executar a Edge Function para confirmar o sync completo.


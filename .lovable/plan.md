

## Plano: Criar Edge Function sync-instagram-organic + migração

### 1. Migração SQL
**`supabase/migrations/20260312130000_instagram_organic_source.sql`**
- Adiciona coluna `source TEXT DEFAULT 'csv'` em `followers_data` e `marketing_data`
- Necessário para o upsert da Edge Function diferenciar dados CSV vs API

### 2. Edge Function
**`supabase/functions/sync-instagram-organic/index.ts`**
- Código fornecido pelo usuário (busca insights orgânicos do Instagram via Meta Graph API)
- Upsert em `followers_data` (seguidores, follows, unfollows) e `marketing_data` (visualizações, alcance, visitas, clicks, interações, engajamentos)
- Usa `META_ACCESS_TOKEN` (já configurado como secret)

### 3. Configuração
**`supabase/config.toml`** — adicionar:
```toml
[functions.sync-instagram-organic]
verify_jwt = false
```

### 4. Teste pós-deploy
Chamar a função com body `{}` e mostrar o resultado JSON.

### Nota sobre upsert
- `followers_data` tem unique em `data` — o upsert `onConflict: "data"` funcionará
- `marketing_data` tem unique em `data,metrica` — o upsert `onConflict: "data,metrica"` funcionará


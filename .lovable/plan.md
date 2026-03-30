

# Plano: Corrigir erro de build + Deploy de Edge Functions

## 1. Corrigir erro de build em `process-nf-pdf/index.ts`

**Problema:** Linha 225 — `pdfjsLib.GlobalWorkerOptions.workerSrc = undefined` causa erro TS2322 porque `undefined` não é atribuível a `string`.

**Correção:** Mudar para:
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = "";
```

## 2. Deploy das Edge Functions

Após corrigir o build, usar a ferramenta de deploy do Supabase para deployar:
- `sync-instagram-posts`
- `sync-instagram-organic`


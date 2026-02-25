

# Assert Economic Invariants - Implementacao

## Status: ✅ IMPLEMENTADO

## Resumo

Edge function permanente `assert-economic-invariants` criada com protecao por header secreto, cobrindo 4 cenarios de invariancia economica + sanidade global.

## Arquivos Criados/Modificados

| Arquivo | Status |
|---------|--------|
| `supabase/functions/assert-economic-invariants/index.ts` | ✅ Criado |
| `supabase/config.toml` | ✅ Atualizado (verify_jwt = false) |
| Secret `ASSERT_KEY` | ✅ Configurado |

## Cenarios Implementados

1. **Ecommerce → NF**: Verifica trigger deleta ecommerce ao inserir NF
2. **NF → Ecommerce (bloqueio)**: Verifica trigger bloqueia ecommerce se NF existe
3. **Duplicata NF (idempotencia)**: Verifica upsert atualiza sem duplicar
4. **Ecommerce isolado (idempotencia)**: Verifica upsert ecommerce funciona isoladamente

## Execucao

Invocar via GET/POST com header `x-assert-key`. Retorna HTTP 200 (ok) ou HTTP 500 (falha).

## Proximo Passo

- Executar a function e validar resultados
- Se todos passarem, liberar ativacao de Receita Fiscal no Executive

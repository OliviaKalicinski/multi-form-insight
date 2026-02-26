

# Idempotencia NF + Log Fiscal Imutavel

## Objetivo

Resolver erro 409 no re-upload de NF (conflito na constraint `uq_sales_pedido_fonte`) e criar tabela de auditoria imutavel `sales_data_log` com rastreabilidade completa de substituicoes. Toda substituicao e registrada, mesmo se payload identico.

---

## Etapa 1: Migracao SQL (uma unica migracao)

### 1.1 Tabela `sales_data_log`

Tabela append-only para snapshots de registros substituidos:

- `id_log` (uuid, PK, default gen_random_uuid())
- `id_original` (uuid, NOT NULL) -- ID do registro em sales_data que foi substituido
- `numero_nota` (text) -- campo-chave para consulta
- `serie` (text) -- campo-chave para consulta
- `numero_pedido` (text) -- campo-chave para consulta
- `payload_completo` (jsonb, NOT NULL) -- snapshot completo do registro antigo
- `substituido_em` (timestamptz, NOT NULL, default now())
- `upload_id` (uuid) -- qual upload causou a substituicao
- `usuario_id` (uuid) -- quem fez o upload
- `arquivo_nome` (text) -- nome do arquivo enviado
- `motivo` (text, default 'reupload_idempotente')

RLS: apenas admins podem INSERT e SELECT (usando `is_admin(auth.uid())`). Sem policy para UPDATE/DELETE = imutavel por RLS.

Indices: `numero_pedido`, `substituido_em`, `upload_id`.

### 1.2 Colunas extras em `upload_history`

- `registros_substituidos` (integer, default 0)
- `pedidos_substituidos` (text[], default '{}')

### 1.3 RPC atomica `nf_snapshot_and_purge`

Funcao PostgreSQL SECURITY DEFINER que executa em uma unica transacao:

1. Guard clause: se array vazio, retorna 0
2. INSERT INTO sales_data_log -- snapshot com `to_jsonb(sd)` dos registros com `numero_pedido = ANY(p_pedidos)` e `fonte_dados = 'nf'`
3. DELETE FROM sales_data -- remove esses mesmos registros
4. Retorna contagem de registros purgados

Owner fixado como postgres. `SET search_path TO 'public'` para seguranca contra schema hijacking.

---

## Etapa 2: Alterar `src/hooks/useDataPersistence.ts`

No fluxo NF (linhas 282-336), inserir antes do upsert:

1. Coletar `numero_pedido` unicos do batch de rows ja montado (linha 284-321)
2. Chamar RPC `nf_snapshot_and_purge` passando: pedidos, uploadId, user.id, fileName
3. Se purgedCount > 0, logar `[NF-REPLACE] X registros substituidos`
4. Executar upsert normalmente em `(numero_nota, serie)` -- agora sem conflito
5. Atualizar upload_history com `registros_substituidos` e `pedidos_substituidos` via `.update()`

---

## Etapa 3: Comentario de premissa em `src/utils/invoiceParser.ts`

Adicionar na linha 96 (antes do log existente na funcao `processInvoiceData`):

```
// PREMISSA: NF distintas devem gerar numero_pedido distinto.
// O fallback NF-{numeroNota} garante isso. Se o parser mudar para
// extrair numero_pedido de Observacoes, validar que NFs distintas
// nao compartilham o mesmo valor, caso contrario a logica de
// substituicao idempotente pode apagar historico fiscal real.
```

---

## Arquivos alterados

1. **Migracao SQL** -- tabela `sales_data_log` + colunas `upload_history` + RPC `nf_snapshot_and_purge`
2. `src/hooks/useDataPersistence.ts` -- chamada RPC antes do upsert NF + update upload_history
3. `src/utils/invoiceParser.ts` -- comentario de premissa

## O que NAO muda

- Nenhum componente de UI
- Nenhum calculo no dashboard
- `sales_data_log` nunca e lido pelo pipeline de metricas

## Validacao

- Re-upload da mesma planilha NF: sem erro 409
- `sales_data_log` contem snapshots completos dos registros antigos
- `upload_history` mostra contagem de substituicoes
- Console mostra `[NF-REPLACE]` com lista de pedidos
- Falha no snapshot causa rollback completo (atomicidade via RPC)
- Dashboard continua funcionando normalmente


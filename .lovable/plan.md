

# Batch Resiliente -- syncIdentifiers

## Problema confirmado

Linhas 213-216: lookup unico `.in('cpf_cnpj', allCpfs)` com ~2500+ CPFs. Linhas 218-221 e 255-257: `return` silencioso em caso de erro. Resultado: email/telefone nunca chega a `customer_identifier`.

## Arquivo modificado

`src/hooks/useDataPersistence.ts` -- funcao `syncIdentifiers` (linhas 186-266)

## Mudancas

### 1. Helper `normalizeCpf`

```text
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '').trim();
```

Usado em dois pontos:
- Na deduplicacao local (emailMap/phoneMap usam CPF normalizado como chave)
- No matching com resultados do banco (normalizar `c.cpf_cnpj` do resultado antes de inserir no Map)

Isso resolve o risco de formato divergente entre planilha e banco.

### 2. Filtrar CPFs sinteticos

Antes do loop de deduplicacao, pular CPFs que comecem com `nf-`. Contar quantos foram filtrados.

### 3. Batch lookup em lotes de 200

Substituir linhas 213-224 por loop:

```text
const LOOKUP_BATCH = 200;
for cada chunk de allCpfs (200 por vez):
  query .in('cpf_cnpj', chunk)
  se erro: logar "[NF-IDENTIFIERS] Erro batch lookup N", incrementar lookupErrors, continuar
  se ok: para cada resultado, cpfToId.set(normalizeCpf(c.cpf_cnpj), c.id)
```

O `.in()` continua usando o CPF original (como esta no banco), mas o Map usa CPF normalizado como chave para matching robusto. Para isso, cada chunk contem os CPFs originais (mascarados) correspondentes aos normalizados, obtidos via um Map reverso `normalizedToOriginal`.

### 4. Batch upsert em lotes de 500

Substituir linhas 251-258 por loop:

```text
const UPSERT_BATCH = 500;
for cada chunk de identifiers (500 por vez):
  upsert com onConflict: 'type,value', ignoreDuplicates: true
  se erro: logar "[NF-IDENTIFIERS] Erro batch upsert N", incrementar upsertErrors, continuar
  se ok: incrementar upsertedCount
```

### 5. Telemetria consolidada com tempo

Substituir linhas 260-262 por relatorio completo:

```text
const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
console.log(`[NF-IDENTIFIERS] Relatorio:
  - CPFs totais: ${allCpfs.length}
  - CPFs sinteticos ignorados: ${syntheticCount}
  - Batches lookup: ${lookupBatches} (${lookupErrors} erros)
  - CPFs encontrados: ${cpfToId.size}
  - CPFs nao encontrados: ${notFound}
  - Emails candidatos: ${emailCount}
  - Telefones candidatos: ${phoneCount}
  - Batches upsert: ${upsertBatches} (${upsertErrors} erros)
  - Identificadores sincronizados: ${upsertedCount}
  - Tempo total: ${elapsed}s`);
```

### 6. Nunca abortar

Remover todos os `return` em caso de erro (linhas 220, 257). Substituir por acumulacao de contadores de erro. Manter o `return` da linha 209 (nenhum dado = noop legitimo).

## O que NAO muda

- Assinatura da funcao permanece `async function syncIdentifiers(orders: ProcessedOrder[]): Promise<void>`
- Chamada em `saveSalesData` nao muda
- Schema do banco nao muda
- Nenhum outro arquivo modificado
- Logica de `onConflict: 'type,value'` permanece (politica existente mantida)

## Resultado esperado

Apos reimportar planilha NF:
- Logs `[NF-IDENTIFIERS]` com contagens coerentes e tempo de execucao
- `customer_identifier` com novos registros de email e phone
- Perfil do cliente exibe email e telefone no `CustomerProfileHeader`


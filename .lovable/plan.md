

# Extrair E-mail e Fone da planilha fiscal e salvar como identificadores

## Resumo
Capturar "E-mail" e "Fone" do CSV de NF, sanitizar rigorosamente, e persistir na `customer_identifier` apos upload. Re-importar a planilha popula os dados automaticamente.

## Decisoes de design

**Constraint existente**: `UNIQUE(type, value)` -- ou seja, um email so pode pertencer a um cliente. Se casal compartilha email, o segundo e ignorado silenciosamente (ignoreDuplicates). Isso e aceitavel para o caso de uso atual.

**Multiplos emails por CPF**: Se o mesmo CPF aparece com emails diferentes na planilha, ambos serao salvos (um por insert). Usaremos `Map<string, Set<string>>` para coletar todos os valores unicos por CPF.

## Mudancas

### 1. `src/types/marketing.ts`

Adicionar ao `InvoiceRawData` (linha ~253):
```text
"E-mail"?: string;
"Fone"?: string;
```

Adicionar ao `ProcessedOrder` (linha ~221):
```text
emailCliente?: string;
telefoneCliente?: string;
```

### 2. `src/utils/invoiceParser.ts`

**Zod schema** -- adicionar campos opcionais:
```text
"E-mail": z.string().optional()
"Fone": z.string().optional()
```

**Funcoes de sanitizacao**:

`sanitizeEmail(raw)`:
- `trim().toLowerCase()`
- Rejeitar: vazio, `"N/A"`, `"--"`, `"0"`, so espacos
- Rejeitar se nao contem `@`, nao contem `.`, comeca com `@`, termina com `@`
- Retornar `undefined` se invalido

`sanitizePhone(raw)`:
- `replace(/\D/g, '')` -- apenas digitos
- Rejeitar se menos de 8 digitos
- Rejeitar `"0"`, strings vazias
- Retornar `undefined` se invalido

**Mapeamento** no `processInvoiceData`:
```text
emailCliente: sanitizeEmail(first["E-mail"])
telefoneCliente: sanitizePhone(first["Fone"])
```

### 3. `src/hooks/useDataPersistence.ts`

Apos o upsert de NF em `sales_data` (linha ~453), adicionar funcao `syncIdentifiers(orders)`:

**Etapa 1 -- Deduplicar localmente**:
- `emailMap: Map<cpfCnpj, Set<email>>` -- permite multiplos emails por CPF
- `phoneMap: Map<cpfCnpj, Set<phone>>` -- permite multiplos telefones por CPF
- Ignorar orders sem cpfCnpj, sem email/phone valido

**Etapa 2 -- Batch lookup de customer.id**:
- Coletar todos os CPFs unicos
- Uma unica query: `SELECT id, cpf_cnpj FROM customer WHERE cpf_cnpj IN (...)`
- Montar `cpfToId: Map<string, uuid>`
- CPFs nao encontrados: ignorar silenciosamente + logar contagem

**Etapa 3 -- Montar e inserir identificadores**:
- Para cada par (cpf, email/phone) valido com customer_id encontrado, criar objeto:
  ```text
  { customer_id, type: 'email'|'phone', value }
  ```
- Inserir em batch com `upsert` usando `onConflict: 'type,value'` + `ignoreDuplicates: true`
- Isso respeita a constraint `UNIQUE(type, value)` e e idempotente

**Log de auditoria**:
```text
[NF-IDENTIFIERS] 45 emails e 38 telefones sincronizados
[NF-IDENTIFIERS] 3 CPFs nao encontrados na tabela customer (ignorados)
```

### 4. `src/components/crm/CustomerProfileHeader.tsx`

Nenhuma mudanca -- ja busca e exibe identificadores de tipo `email` e `phone`.

## Fluxo de dados
```text
CSV NF ("E-mail", "Fone")
  -> invoiceParser (sanitizeEmail, sanitizePhone)
  -> ProcessedOrder (emailCliente, telefoneCliente)
  -> saveSalesData -> syncIdentifiers (dedup -> batch lookup -> upsert customer_identifier)
  -> CustomerProfileHeader (query existente exibe automaticamente)
```

## Arquivos modificados
1. `src/types/marketing.ts` -- adicionar emailCliente/telefoneCliente aos tipos
2. `src/utils/invoiceParser.ts` -- extrair e sanitizar E-mail e Fone
3. `src/hooks/useDataPersistence.ts` -- syncIdentifiers apos upload NF

## Observacao
Usuario precisara re-importar a planilha fiscal para popular os dados. Processo e idempotente -- pode reimportar quantas vezes quiser sem duplicacao.

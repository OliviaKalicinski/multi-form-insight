

# Adaptador Tolerante -- Normalizacao de Headers + Telemetria de Ingestao

## Resumo

Implementar normalizacao robusta de headers no parser de NF para aceitar variacoes reais de planilha humana, com protecao contra colisao, telemetria estruturada e relatorio visual ao usuario.

## Arquivos modificados

1. `src/utils/invoiceParser.ts`
2. `src/components/dashboard/SalesUploader.tsx`

---

## 1. `src/utils/invoiceParser.ts`

### 1.1 Constante HEADER_ALIASES

Mapa explicito de variantes conhecidas para nomes canonicos do Zod schema:

```text
"Contato"           -> "Nome Cliente"
"CPF / CNPJ"        -> "CPF/CNPJ Cliente"
"Natureza"          -> "Natureza da operacao"
"Item UN"           -> "Item Unidade"
"Item Valor"        -> "Item Valor Unitario"
"Item Total"        -> "Item Valor Total"
"Chave de acesso"   -> "Chave de Acesso"
"Peso líquido"      -> "Peso Liquido"
"Peso bruto"        -> "Peso Bruto"
"Data saída"        -> "Data saida"
```

### 1.2 Funcao `normalizeHeaderKey(key: string): string`

Reutiliza a funcao `normalizeText` existente (linha 65): lowercase + remove acentos + trim. Usada para comparar chaves do CSV contra chaves do mapa de aliases de forma tolerante.

### 1.3 Funcao `normalizeRow(row: Record<string, any>): { normalized: Record<string, any>, applied: string[] }`

- Itera sobre cada chave do objeto CSV
- Para cada chave, compara versao normalizada contra aliases normalizados
- Se alias encontrado E chave canonica **nao existe** no objeto: copia valor, registra alias aplicado
- Se alias encontrado E chave canonica **ja existe** (colisao): loga conflito, **nao sobrescreve** (chave original tem prioridade)
- Retorna objeto normalizado + lista de aliases aplicados (ex: `["Contato->Nome Cliente"]`)

### 1.4 Atualizar `InvoiceProcessingResult`

Adicionar tres campos:

```text
aliasesAplicados: string[]     // ex: ["Contato->Nome Cliente", "CPF / CNPJ->CPF/CNPJ Cliente"]
emailsCapturados: number
telefonesCapturados: number
```

### 1.5 Atualizar `processInvoiceData`

- **Antes do loop Zod** (linha 198): aplicar `normalizeRow` em cada linha. Coletar aliases unicos (Set) -- alias e por header, nao por linha.
- **Apos construir orders**: contar emails e telefones validos (`emailCliente` e `telefoneCliente` nao-undefined).
- **Log de telemetria alias** (se aliases aplicados > 0):
  ```text
  [NF-ALIAS] 4 headers normalizados: Contato->Nome Cliente, CPF / CNPJ->CPF/CNPJ Cliente, ...
  ```
- **Log consolidado de ingestao** (sempre, ao final):
  ```text
  [NF-INGEST] Relatorio:
    - 1.243 linhas processadas
    - 12 linhas rejeitadas
    - 4 headers normalizados via alias
    - 38 emails capturados
    - 31 telefones capturados
  ```
- Retornar os tres novos campos no resultado.

### 1.6 Atualizar `detectCSVFormat`

Normalizar headers antes de checar (lowercase + remove acentos) para que variantes de caixa/acento nao causem falha na deteccao.

---

## 2. `src/components/dashboard/SalesUploader.tsx`

### 2.1 Exibir resumo de ingestao apos upload NF

No bloco que ja mostra `nfResult` (linha 248-256), adicionar informacoes extras quando disponiveis:

- Se `aliasesAplicados.length > 0`: mostrar badge ou texto "X headers adaptados"
- Mostrar emails e telefones capturados: "38 emails | 31 telefones"

Exemplo visual no card do arquivo enviado:
```text
[Nota Fiscal] planilha_nf.csv  [Salvo no banco]
Rastreabilidade plataforma: 85.2% das vendas NF
4 headers adaptados | 38 emails | 31 telefones
```

---

## Principios mantidos

- **Tolerante na forma**: aceita variacoes de header, acento, caixa
- **Rigido no nucleo**: Zod continua exigindo campos estruturais (ID Nota, Numero Nota, Serie, Data emissao, Total Faturado, Item Descricao)
- **Observavel**: aliases retornados como dados estruturados (nao apenas console)
- **Controlado**: aliases explicitos, colisoes logadas, nunca sobrescrita silenciosa
- **Educativo**: usuario ve quais adaptacoes foram feitas


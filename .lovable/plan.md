

# Plano: Corrigir parse de CSV de vendas com delimitador ponto-e-virgula

## Problema identificado

O arquivo `expedicao_2.0_1.csv` usa **ponto-e-virgula (;)** como separador de colunas. O `SalesUploader` nao configura o PapaParse para auto-detectar o delimitador, entao ele assume **virgula (,)** e o parse falha silenciosamente -- todas as colunas viram uma unica string, a validacao Zod rejeita as linhas, e nenhum dado e salvo.

O `AdsUploader` ja usa `delimiter: ""` (auto-detect) e funciona corretamente.

## Correcao

### Arquivo: `src/components/dashboard/SalesUploader.tsx`

Adicionar `delimiter: ""` na chamada do `Papa.parse`, identico ao `AdsUploader`:

```text
Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  delimiter: "",           // <-- adicionar esta linha (auto-detect)
  complete: async (results) => {
    ...
  }
});
```

Isso resolve o parse para CSVs com ponto-e-virgula, virgula ou tab.

## Impacto

- Nenhum efeito colateral: `delimiter: ""` e a opcao padrao recomendada pelo PapaParse
- Dados ja salvos no banco nao sao afetados
- Apos a correcao, o usuario pode refazer o upload do mesmo arquivo e os dados serao persistidos corretamente (merge incremental via upsert)

## Secao tecnica

| Arquivo | Mudanca |
|---------|---------|
| `src/components/dashboard/SalesUploader.tsx` | Adicionar `delimiter: ""` no `Papa.parse` |

Apenas 1 linha adicionada. Sem mudancas de logica ou estrutura.

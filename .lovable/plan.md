

# Corrigir detecao de amostras para gato

## Problema

A funcao `getSamplePetType` usa apenas `descricaoAjustada` (que o `productNormalizer` converte para "Kit de Amostras", perdendo a informacao de "gato"). Precisa verificar tambem o campo `descricao` original. Quando nenhum dos campos contem "gato", o padrao ja e "dog" (cachorro), o que esta correto.

## Alteracao

### `src/utils/samplesAnalyzer.ts` (linhas 54-61)

Mudar a funcao `getSamplePetType` para verificar ambos os campos separadamente:

```text
De:
  const name = (produto.descricaoAjustada || produto.descricao || '').toLowerCase();
  const isCat = name.includes("gato");

Para:
  const adjustedName = (produto.descricaoAjustada || '').toLowerCase();
  const originalName = (produto.descricao || '').toLowerCase();
  const isCat = adjustedName.includes("gato") || originalName.includes("gato");
```

A logica de retorno permanece igual: `return isCat ? 'cat' : 'dog'` -- ou seja, quando nao houver nome definido ou nenhum campo mencionar "gato", o padrao continua sendo cachorro.

## Impacto

- Corrige a contagem de amostras gato em todas as paginas (Visao Executiva V2, Analise de Amostras)
- Nenhum outro arquivo alterado
- Nenhuma mudanca no banco de dados


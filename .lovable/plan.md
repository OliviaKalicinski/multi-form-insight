

# Ajustar filtro padrao para "Ultimos 7 Dias"

## Contexto

A logica de filtragem esta correta: calcula `lastDate` a partir da data mais recente nos dados de vendas (08/02/2026) e filtra os ultimos 7 dias a partir dela (02/02 a 08/02). Os valores exibidos correspondem a esse periodo.

O unico ajuste necessario e mudar o valor inicial do filtro de `"1d"` para `"7d"`.

## Alteracao

**Arquivo:** `src/pages/VisaoExecutivaV2.tsx`, linha 21

De:
```text
const [period, setPeriod] = useState<string>("1d");
```

Para:
```text
const [period, setPeriod] = useState<string>("7d");
```

## Resultado

- A pagina abrira com "Ultimos 7 Dias" selecionado por padrao
- O usuario pode alternar para "Ultimo Dia" quando quiser
- A logica de calculo dos 7 dias ja esta implementada e funcionando corretamente


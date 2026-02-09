

# Plano: Remover constraint duplicada na tabela ads_data

## Problema

Existe uma constraint antiga com nome auto-gerado `ads_data_data_campanha_conjunto_anuncio_key` que nao foi removida pela migracao anterior (que so removeu `ads_data_unique_key`). Essa constraint antiga ainda impede insercoes onde `data + campanha + conjunto + anuncio` sao iguais, mesmo que o `objetivo` seja diferente.

## Solucao

Uma unica migracao SQL para remover a constraint remanescente:

```sql
ALTER TABLE ads_data DROP CONSTRAINT IF EXISTS ads_data_data_campanha_conjunto_anuncio_key;
```

## Secao tecnica

| Recurso | Mudanca |
|---|---|
| Migracao SQL | Remover constraint `ads_data_data_campanha_conjunto_anuncio_key` |

Nenhuma alteracao de codigo necessaria. Apos a migracao, basta reimportar o CSV de anuncios normalmente.


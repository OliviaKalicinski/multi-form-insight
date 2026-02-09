
# Plano: Corrigir perda de linhas na deduplicacao de anuncios

## Problema

O CSV de anuncios tem 45 linhas, mas apenas 39 chegam ao banco. Isso acontece porque:

1. O CSV nao tem colunas de **Campanha** nem **Conjunto de anuncios** -- ambas ficam vazias no parse
2. A chave de deduplicacao e `data|campanha|conjunto|anuncio`
3. Como campanha e conjunto sao vazios, anuncios com o **mesmo nome** mas **objetivos diferentes** (ex: OUTCOME_LEADS vs OUTCOME_SALES) sao tratados como duplicatas e seus valores sao somados incorretamente
4. Existem 6 pares de anuncios com nomes identicos mas objetivos diferentes, resultando em 45 - 6 = 39 registros

Exemplos de colisao:
- `tp02-img-v2-cta-grupo-17/11` aparece 2x (OUTCOME_LEADS, linhas 20 e 22)
- `TP02_ SUPLEMENTO_GATO_DIA2_1_V1-03/11` aparece 2x (OUTCOME_SALES, linhas 11 e 29)
- `TP02 - IMG_V2_black-BSF-20/11` aparece 2x (OUTCOME_SALES, linhas 24 e 45)

## Solucao

Adicionar o campo `objetivo` a chave de deduplicacao. Isso diferencia anuncios com mesmo nome mas objetivos distintos.

### Passo 1: Migracao no banco de dados

Remover a constraint unica atual e criar uma nova incluindo `objetivo`:

```sql
ALTER TABLE ads_data DROP CONSTRAINT IF EXISTS ads_data_unique_key;
ALTER TABLE ads_data 
  ADD CONSTRAINT ads_data_unique_key 
  UNIQUE NULLS NOT DISTINCT (data, campanha, conjunto, anuncio, objetivo);
```

### Passo 2: Atualizar a logica de deduplicacao no frontend

**Arquivo**: `src/hooks/useDataPersistence.ts`

Na funcao `saveAdsData`, alterar a chave do Map de deduplicacao (linha 452):

De:
```
const key = `${row.data}|${row.campanha}|${row.conjunto}|${row.anuncio}`;
```

Para:
```
const key = `${row.data}|${row.campanha}|${row.conjunto}|${row.anuncio}|${row.objetivo}`;
```

E atualizar o `onConflict` do upsert (linha 515):

De:
```
onConflict: "data,campanha,conjunto,anuncio"
```

Para:
```
onConflict: "data,campanha,conjunto,anuncio,objetivo"
```

### Passo 3: Limpar e reimportar dados de novembro

Apos a correcao, sera necessario reimportar o CSV de novembro para que as 45 linhas sejam salvas corretamente. Os dados antigos (39 registros) serao atualizados via upsert e os 6 novos registros serao inseridos.

## Impacto

- CSVs que ja tinham campanha e conjunto preenchidos continuam funcionando normalmente (a nova constraint e um superconjunto da anterior)
- Nenhuma outra tabela e afetada
- O campo `objetivo` ja existe na tabela e ja e parseado corretamente

## Secao tecnica

| Arquivo / Recurso | Mudanca |
|---|---|
| Migracao SQL | Trocar constraint unica para incluir `objetivo` |
| `src/hooks/useDataPersistence.ts` (linha 452) | Adicionar `objetivo` na chave do Map de deduplicacao |
| `src/hooks/useDataPersistence.ts` (linha 515) | Adicionar `objetivo` no `onConflict` do upsert |

Total: 1 migracao + 2 linhas alteradas no codigo.

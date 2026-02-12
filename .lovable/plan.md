
# Filtrar Anuncios Ativos e Incluir CTR na Analise

## Problema

1. O chat analisa TODOS os anuncios (ativos, inativos, arquivados) sem distinção - recomenda pausar anúncios que já estão inativos
2. Falta CTR por anúncio individual (aparece "Calculando..." na resposta)
3. Para escalar, deveria focar nos top 10 dos últimos 2 meses, não de todo o histórico

## Solução

### Arquivo modificado
- `supabase/functions/chat-with-data/index.ts`

### Mudança 1: Incluir `status_veiculacao` no select de ads_data (~linha 70)

Adicionar `status_veiculacao` ao select para que o campo esteja disponível na agregação.

### Mudança 2: Separar anúncios ativos vs inativos na agregação (~linha 336-360)

Criar dois grupos no `aggregateAds`:

- `top_anuncios_ativos`: apenas anúncios com `status_veiculacao = 'active'`, com CTR calculado (cliques/impressões * 100). Top 30 por receita.
- `top_anuncios_inativos`: anúncios com status `inactive`, `archived` ou `not_delivering`. Top 15 para referência.

Para cada anúncio, incluir o campo `ctr` calculado e o `status`.

### Mudança 3: Criar lista "escalar" dos últimos 2 meses (~linha 362)

Filtrar rows dos últimos 60 dias, agrupar por anúncio (apenas ativos), ordenar por receita, pegar top 10. Chamar `candidatos_escalar_2m`.

### Mudança 4: Atualizar system prompt (~linha 507-512)

Instruir a IA:
- Para "pausar": usar `top_anuncios_ativos` com ROAS baixo (apenas ativos, pois não faz sentido pausar algo já inativo)
- Para "escalar": usar `candidatos_escalar_2m` (top 10 ativos dos últimos 2 meses por receita)
- CTR agora está disponível por anúncio — usar para classificação nos quadrantes
- O campo `status` indica se o anúncio está ativo/inativo/arquivado

## Detalhes tecnicos

### Select atualizado
```text
"data, gasto, impressoes, cliques, conversoes, receita, alcance, cpc, cpm, ctr, roas_resultados, campanha, conjunto, anuncio, objetivo, status_veiculacao"
```

### Nova lógica de agregação por anúncio
```text
Para cada anúncio no adMap:
  - ctr = impressoes > 0 ? (cliques / impressoes * 100).toFixed(2) + "%" : "0%"
  - status = status mais recente do anúncio (moda ou último registro)
  - Separar em ativos vs inativos baseado no status
```

### Candidatos a escalar (últimos 2 meses)
```text
const d60 = now - 60 * 86400000;
Filtrar rows com data >= d60 e status_veiculacao = 'active'
Agrupar por anúncio, ordenar por receita desc, top 10
Incluir: nome, gasto, receita, roas, ctr, cliques, conversoes
```

### Prompt atualizado (seção ADS)
```text
- "top_anuncios_ativos": anúncios ATIVOS com CTR e ROAS. Use para recomendar pausar (ROAS baixo) ou manter.
- "candidatos_escalar_2m": top 10 anúncios ATIVOS dos últimos 2 meses por receita. Use para recomendar escalar.
- "top_anuncios_inativos": referência de anúncios já pausados/arquivados.
- IMPORTANTE: só recomende pausar anúncios que estão ATIVOS. Anúncios inativos já estão pausados.
```

## Resultado esperado

Quando o usuário perguntar "Quais anúncios devo pausar e quais escalar?":
- **Pausar**: lista apenas anúncios ATIVOS com ROAS ruim, com CTR visível
- **Escalar**: top 10 ativos dos últimos 2 meses com melhor receita/ROAS
- **CTR**: aparece calculado para cada anúncio (sem "Calculando...")
